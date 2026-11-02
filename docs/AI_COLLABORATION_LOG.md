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
