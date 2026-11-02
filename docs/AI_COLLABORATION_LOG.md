# AI Collaboration Log — Keyloop Technical Assessment

## Milestone 1: Foundation & Database Configuration

### Date: 2026-11-02

---

### Step 1: Initial Repository Inspection

- **Action**: Inspected the repository root for existing configurations or code.
- **Finding**: Workspace was completely empty.
- **Decision**: Initialize a modern Node.js/TypeScript project adhering to strict mode and modular monolith architecture (`Controller → Service → Repository`).

---

### Step 2: Project Setup & Package Alignment

- **Action**: Installed runtime and development dependencies.
- **Issue Encountered**: Latest versions of Prisma CLI (v8-rc) and Vitest (v5) prompted Node engine incompatibility warnings on Node `v20.11.0`. Additionally, Zod had resolved to a 4.x preview build causing missing property errors (`err.errors` on `ZodError`).
- **Correction Applied**:
  - Pinned `@prisma/client` and `prisma` to `^5.22.0`.
  - Pinned `vitest` to `^1.6.0`.
  - Pinned `zod` to `^3.23.8`.
  - Installed `dotenv` for configuration loading.
- **Verification**: `npm list` confirmed stable package tree.

---

### Step 3: Domain Model & Prisma Schema Authoring

- **Action**: Created `prisma/schema.prisma` with 8 core entities:
  - `Customer`
  - `Vehicle`
  - `Dealership`
  - `ServiceType`
  - `Technician`
  - `TechnicianQualification` (with `@@unique([technicianId, serviceTypeId])`)
  - `ServiceBay`
  - `Appointment` (with composite indexes on resource IDs + start/end timestamps)
- **Validation**: Executed `npx prisma validate` and `npx prisma generate`. Both succeeded.

---

### Step 4: Database Infrastructure via Docker Compose

- **Action**: PM requested running PostgreSQL 16 locally via Docker Desktop on Windows rather than installing PostgreSQL directly on the host OS.
- **Files Created**:
  - `docker-compose.yml`: Official `postgres:16-alpine` image, named volume `keyloop-pgdata`, healthcheck using `pg_isready -U postgres -d keyloop_scheduler`, port `5432:5432`.
  - `.env.example` and `.env`: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/keyloop_scheduler?schema=public"`.
  - `.gitignore`: Ensured `.env` and `node_modules` are ignored.

---

### Step 5: Seed Script Implementation

- **Action**: Created `prisma/seed.ts` providing deterministic seed data:
  - 4 service types with varying durations (Oil Change 30m, Brake Inspection 60m, Full Service 120m, Tire Rotation 45m).
  - 2 customers with 3 vehicles.
  - 2 dealerships (Dealership 1 with 3 technicians and 2 bays; Dealership 2 with 1 technician and 1 bay for concurrency isolation testing).
  - 1 pre-existing appointment on 2026-11-05 10:00-11:00 UTC at Dealership 1.

---

### Step 6: Code Quality, Type Safety & Strictness

- **Issue Encountered**:
  - `tsconfig.json` reported TS5107 deprecation for `moduleResolution: "node"` under TypeScript 6.
  - `pino-http` typed `req.id` as `ReqId` (string | number | object), while service expected `string | undefined`.
  - Unused `Prisma` import in `appointment.repository.ts`.
- **Corrections**:
  - Added `"ignoreDeprecations": "6.0"` to compiler options.
  - Passed `req.id ? String(req.id) : undefined` in controller.
  - Removed unused imports.
- **Verification Commands Executed**:
  - `npm run lint` (`tsc --noEmit`) -> Exited 0 with zero errors.
  - `npm run build` (`tsc`) -> Exited 0; compiled cleanly to `dist/`.

---

### Step 7: Checkpoint Reached (Database Provisioning)

- As directed, stopped before executing `prisma migrate` or `prisma db seed` to allow the PM to provision the container with `docker compose up -d`.

---

## Milestone 2: API Specification, Concurrency Engine & Automated Testing

### Date: 2026-11-02

---

### Step 8: Database Migration & Verification

- **Action**: Confirmed PostgreSQL container up on port 5432. Executed `npx prisma migrate dev` (verified migration `20261102082055_init` in sync).
- **Finding**: Running multiple seed iterations caused sequence counters to increment (`id` 1, 2 became 3, 4, etc.), breaking deterministic ID lookups.
- **Correction**: Updated `prisma/seed.ts` to execute `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` prior to inserting seed fixtures, guaranteeing identical primary keys across all test runs.

---

### Step 9: OpenAPI 3.0.3 Specification & Swagger UI Integration

- **Action**: Authored `docs/openapi.yaml` covering all implemented REST endpoints:
  - `GET /health`
  - `GET /api/v1/service-types`
  - `GET /api/v1/availability`
  - `POST /api/v1/appointments`
  - `GET /api/v1/appointments/:id`
- **Feature Details**: Included comprehensive JSON schema models (`ServiceType`, `AvailabilityResult`, `CreateAppointmentRequest`, `Appointment`, `ErrorEnvelope`, `ValidationErrorEnvelope`), along with real examples matching seed data.
- **Implementation**: Updated `src/swagger/index.ts` to parse `docs/openapi.yaml` using the `yaml` library, serving Swagger UI at `GET /api-docs/` and raw specs at `/api-docs/openapi.json` and `/api-docs/openapi.yaml`.

---

### Step 10: Bug Discovery & Technical Resolution

- **Issue 1 — PostgreSQL Advisory Lock `void` Deserialization**:
  - _Symptom_: Prisma `$queryRaw` failed when calling `SELECT pg_advisory_xact_lock(...)` with `PrismaClientKnownRequestError: Failed to deserialize column of type 'void'`.
  - _Resolution_: Replaced `$queryRaw` with `tx.$executeRaw\`SELECT pg_advisory_xact_lock(${dealershipId})\``. Since advisory lock acquisition is a side-effect command that returns `void`, `$executeRaw` executes the SQL query without expecting a deserializable column set.
- **Issue 2 — Express 5 `req.query` Getter Restriction**:
  - _Symptom_: In Express 5, `req.query` is defined with a getter. Calling `req[source] = data` inside `validate.ts` threw `TypeError: Cannot set property query of #<IncomingMessage> which has only a getter`.
  - _Resolution_: Updated `src/middleware/validate.ts` to use `Object.defineProperty(req, source, { value: data, writable: true, configurable: true, enumerable: true })`.

---

### Step 11: Comprehensive Automated Testing Suite

- **Action**: Implemented Vitest + Supertest integration and unit tests covering all 11 required scenarios:
  1. Successful appointment creation with dual resource allocation.
  2. Rejection (409 Conflict) when service bays are fully booked.
  3. Rejection (409 Conflict) when qualified technicians are fully booked.
  4. Rejection (409 Conflict) when dealership has no technician qualified for the service type.
  5. Rejection (409 Conflict) on partial appointment overlaps (`[10:30, 11:00)` against `[10:00, 11:00)`).
  6. Rejection (409 Conflict) on full appointment overlaps (`[09:30, 10:30)` against `[10:00, 10:30)`).
  7. Successful booking of strictly adjacent appointments (`[10:00, 10:30)` and `[10:30, 11:00)`).
  8. Rejection (400 Bad Request) on missing payload fields, invalid dates, negative IDs, or past start times.
  9. Rejection (400 Bad Request) on vehicle/customer ownership mismatch.
  10. Persistence verification and full entity graph retrieval via `GET /api/v1/appointments/:id`.
  11. Real PostgreSQL concurrent booking test (`concurrency.test.ts`): Fired 5 parallel requests via `Promise.all` targeting Dealership 2 (which has exactly 1 technician and 1 bay). Verified exactly 1 appointment was confirmed (201) and all other 4 were rejected (409).
- **Execution & Results**:
  - `npm test`: **8 test files passed, 23 of 23 tests passed (100% success rate)**.
  - `npm run lint`: **0 errors**.
  - `npm run build`: **0 errors**.

---

## Milestone 2 Fix (M2-FIX): Simplified Testing Workflow & Rollback Guarantees

### Date: 2026-11-02

---

### Step 12: Simplified Testing Lifecycle & Table Isolation

- **PM Decision**: Standardize local development and testing on the shared `keyloop_scheduler` PostgreSQL database (`public` schema), avoiding separate test databases or dynamic schemas.
- **Implementation**:
  - Configured `tests/setup.ts` to set `process.env.NODE_ENV = 'test'` and execute `ensureDomainSeed()` to ensure reference data exists without needlessly rebuilding it.
  - Implemented `resetAppointments()` in `tests/helpers.ts` which executes `TRUNCATE TABLE "Appointment" RESTART IDENTITY` and restores only the baseline fixture required for overlap testing.
  - Ensured the seven domain tables (`Customer`, `Vehicle`, `Dealership`, `ServiceType`, `Technician`, `TechnicianQualification`, `ServiceBay`) are strictly preserved.
  - Confirmed `NODE_ENV=development` servers (`npm run dev`) and Swagger UI sessions never automatically truncate appointments.

---

### Step 13: Added Rollback & Domain Table Preservation Tests

- **Action**: Added two dedicated integration tests in `tests/integration/appointment.test.ts`:
  - **Test 11 (Domain Table Preservation)**: Recorded counts for all 7 domain tables before calling `resetAppointments()`. Verified all 7 counts remained identical (Customer: 2, Vehicle: 3, Dealership: 2, ServiceType: 4, Technician: 4, Qualifications: 8, ServiceBay: 3), with only `Appointment` reset to 1.
  - **Test 12 (Transactional Rollback Verification)**: Created a booking on Dealership 2, then attempted an overlapping booking. Verified the second attempt failed with 409 Conflict, verified `prisma.appointment.count()` was unchanged (confirming rollback of partial state), and immediately submitted a valid non-overlapping booking to confirm the advisory lock was released.

---

### Step 14: Verification & Double Test Execution

- **Commands Executed**:
  1. `npm run lint`: Exited 0 with zero TypeScript errors.
  2. `npm run build`: Exited 0; compiled cleanly to `dist/`.
  3. `npm test` (Run 1): **8 test files passed, 25 of 25 tests passed (100% success rate)**.
  4. `npm test` (Run 2): **8 test files passed, 25 of 25 tests passed (100% success rate)**.
- **Database Inspection**: Verified live database table counts:
  - `Customer`: 2
  - `Vehicle`: 3
  - `Dealership`: 2
  - `ServiceType`: 4
  - `Technician`: 4
  - `TechnicianQualification`: 8
  - `ServiceBay`: 3
  - `Appointment`: 1
  - Verified no tables other than `Appointment` were truncated.


---

## Milestone 2 SA Corrections (P1 & P2)

### Date: 2026-11-02

---

### Step 15: P1 Destructive Seed Removal & P2 Transaction Rollback Test
- **P1 Resolution (Non-destructive, Idempotent Seeding)**:
  - Removed full-table `TRUNCATE` from `prisma/seed.ts`.
  - Re-implemented domain reference seeding using idempotent lookups (`findFirst`) and upserts (`upsert` on unique keys like `email`, `vin`, and `[technicianId, serviceTypeId]`).
  - Preserved all seven domain reference tables and existing development appointments during seed execution.
  - Verified `ensureDomainSeed()` in `tests/helpers.ts` cannot trigger destructive resets.
  - Retained `resetAppointments()` in `tests/helpers.ts` as the exclusive Appointment TRUNCATE operation in automated tests.
- **P2 Resolution (Real Transaction Rollback After INSERT)**:
  - Maintained Test 12 (conflict behavior and subsequent non-overlapping booking).
  - Added Test 13 in `tests/integration/appointment.test.ts`: executes a real Prisma `$transaction` that acquires the transaction-level advisory lock (`SELECT pg_advisory_xact_lock(1)`), executes a real `tx.appointment.create(...)` INSERT, and then deliberately throws before `COMMIT`.
  - Verified the transaction rolled back: `prisma.appointment.count()` was unchanged and `findFirst` for the test appointment returned `null`.
  - Zero public fault-injection endpoints introduced.
- **Verification**:
  - `npm run lint`: Exited with code 0 (zero errors).
  - `npm run build`: Exited with code 0 (compiled to `dist/`).
  - `npm test` (Run 1): **8 test files passed, 26 of 26 tests passed**.
  - `npm test` (Run 2): **8 test files passed, 26 of 26 tests passed**.
  - Database counts verified: 2 Customers, 3 Vehicles, 2 Dealerships, 4 ServiceTypes, 4 Technicians, 8 Qualifications, 3 ServiceBays, 1 baseline Appointment. Zero reference tables truncated.
