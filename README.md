# Keyloop Unified Service Scheduler

A REST backend for booking vehicle service appointments while checking technician qualifications and service bay availability for the full service duration. This repository is the submission for the Keyloop Software Engineer Technical Assessment, Scenario A.

## Project overview

The API accepts an appointment request with a customer, vehicle, dealership, service type, and desired start time. It validates the related records, then assigns an available qualified technician and service bay. Confirmed appointments persist links to all six relevant entities.

The application is a TypeScript and Express modular monolith using PostgreSQL 16, Prisma, Zod, Pino, OpenAPI / Swagger UI, Vitest, Supertest, and Docker Compose. Appointment creation uses a PostgreSQL transaction-level advisory lock keyed by dealership ID. The concurrency guarantee applies when all appointment-writing paths follow this same lock protocol.

### Technology stack and structure

- Node.js 20 LTS and strict TypeScript
- Express 5, with controller → service → repository boundaries
- PostgreSQL 16 and Prisma ORM 5.22
- Zod request validation and Pino structured logging
- OpenAPI 3.0 with Swagger UI
- Vitest and Supertest integration tests
- Docker Compose for local PostgreSQL provisioning

Each feature module (`health`, `service-type`, `availability`, and `appointment`) is under `src/modules/`.

## Documentation

- [System design](docs/SYSTEM_DESIGN.md)
- [OpenAPI specification](docs/openapi.yaml)
- [AI collaboration log](docs/AI_COLLABORATION_LOG.md)

## Prerequisites

- Node.js 20.11 or later and npm 10 or later
- Docker Desktop running on Windows (WSL2 or Hyper-V backend)

## Setup

### Windows PowerShell

```powershell
Copy-Item .env.example .env
docker compose up -d
docker compose ps
npm install
npm run migrate:dev
npm run seed
```

### Bash

```bash
cp .env.example .env
docker compose up -d
docker compose ps
npm install
npm run migrate:dev
npm run seed
```

The default `.env.example` points to `keyloop_scheduler` on the `public` schema at `localhost:5432`. Seed data includes four service types, two customers, three vehicles, two dealerships, four technicians, three service bays, and a baseline appointment at Dealership 1 from 10:00 to 11:00 UTC on November 5, 2026. Dealership 2 has one technician qualified for Oil Change and Brake Inspection, and one service bay.

The seed command is non-destructive and idempotent for its reference data. Upserts can update the seeded Customer and Vehicle fields if matching unique keys already exist. Seeding does not delete appointments or truncate tables.

## Run and inspect

```powershell
npm run dev
```

Development startup does not reset appointments. The API listens on `http://localhost:3000`; Swagger UI is at `http://localhost:3000/api-docs` and health is at `http://localhost:3000/health`.

For a production build, run `npm run build` followed by `npm start`. Use `npm run lint` for TypeScript checking.

The OpenAPI document is also served at `http://localhost:3000/api-docs/openapi.yaml` and `http://localhost:3000/api-docs/openapi.json`.

## Manual API Testing with Swagger UI

Swagger UI provides an interactive test client, so reviewers can exercise the backend without building a frontend or using PowerShell/cURL.

### 1. Start the API

Complete the [Setup](#setup) steps first (including Docker, migration, and seed), then run:

```bash
npm run dev
```

Open **http://localhost:3000/api-docs** in a browser. Expand an endpoint, select **Try it out**, enter the parameters or JSON body, and select **Execute**. Check the HTTP status in **Server response** and inspect the returned JSON.

**Before running the examples:** Use a start time **in the future when you actually test** and in ISO 8601 format with an explicit timezone (`Z` for UTC or an offset such as `+07:00`). The sample `2030-06-15T10:00:00Z` below is illustrative; change it if that date has passed or the slot is already booked. Seeded numeric IDs are typical for a fresh database but may differ if the database already contained records. `GET /api/v1/service-types` returns actual service-type IDs; the reference seed contains customer Bob, vehicle Ford F-150, and Dealership 2 (Westside Motors). For a deterministic conflict demonstration, use the actual matching IDs for those records.

### 2. Verify the service and catalog

- Expand **GET /health** → **Try it out** → **Execute**. Expect **200 OK** and `data.status: "ok"` (if the API and database are reachable).
- Expand **GET /api/v1/service-types** and execute it. Expect **200 OK** with the service types and `durationMinutes`. Note the ID for **Oil Change** (30 minutes).

### 3. Check availability (read-only)

Expand **GET /api/v1/availability**, choose **Try it out**, and enter:

| Parameter | Value for a freshly seeded database |
| --- | --- |
| `dealershipId` | `2` (Westside Motors) |
| `serviceTypeId` | `1` (Oil Change) |
| `startTime` | `2030-06-15T10:00:00Z` (replace with a free future slot) |

Select **Execute**. Expect **200 OK**, with `data.available: true` and positive `availableTechnicians` and `availableServiceBays` when the slot is free. This endpoint **does not reserve resources**. Its result can change before a booking is created.

### 4. Create a confirmed appointment

Expand **POST /api/v1/appointments** → **Try it out**, replace the request JSON with:

```json
{
  "customerId": 2,
  "vehicleId": 3,
  "dealershipId": 2,
  "serviceTypeId": 1,
  "startTime": "2030-06-15T10:00:00Z"
}
```

Use a valid **future** start time and actual IDs from your own seeded database. Choose **Execute**. Expect **201 Created**, with `data.status: "CONFIRMED"`, an appointment `data.id`, an `endTime` calculated from service duration, and assigned `technicianId` and `serviceBayId`. Copy `data.id` for the next step.

### 5. Retrieve the persisted appointment

Expand **GET /api/v1/appointments/{id}** → **Try it out**. Paste the **appointment ID returned in Step 4**, then **Execute**. Expect **200 OK** with the saved appointment and related customer, vehicle, dealership, service type, technician, and service bay. This is a straightforward persistence check using a separate request.

### 6. Demonstrate an overlapping booking conflict

Return to **POST /api/v1/appointments** and submit another request using the **same customer, vehicle, dealership, and Oil Change service type**, but a start time **15 minutes after Step 4** (for example, `2030-06-15T10:15:00Z` if Step 4 used `10:00:00Z`). Oil Change lasts **30 minutes**, so the intervals overlap.

Because the reference seed has **one qualified technician and one bay at Dealership 2**, expect **409 Conflict** with error code `NO_TECHNICIAN_AVAILABLE` or `NO_SERVICE_BAY_AVAILABLE`. The earlier successful appointment remains persisted. If Step 4 returned `409`, select another future free time and perform Step 4 before this conflict test. Do **not** use Dealership 1 for this deterministic demonstration: it has more resources, so overlapping requests may both succeed.

### Notes and limitations

- Swagger verifies API behavior manually; it is **not** a replacement for automated concurrency and rollback integration tests. Use `npm test` for those cases.
- **Tests are destructive to appointment data:** `npm test` truncates only the `Appointment` table and restores a baseline fixture in the shared development database. Running tests after a Swagger booking can erase it. For a clean manual demo, run automated tests **before** creating appointments in Swagger.
- Seed data is non-destructive and does not reset existing appointments. Repeat demonstrations with new free time slots, or use a separate disposable database if you need a clean reset.

Examples below use Windows PowerShell. Replace IDs with IDs from your database where necessary; seeded IDs are illustrative and may differ if records existed before seeding. Use a start time in the future when executing requests.

### Health and catalog

```powershell
Invoke-RestMethod http://localhost:3000/health
Invoke-RestMethod http://localhost:3000/api/v1/service-types
```

### Check availability

```powershell
Invoke-RestMethod 'http://localhost:3000/api/v1/availability?dealershipId=1&serviceTypeId=1&startTime=2026-11-05T09%3A00%3A00%2B07%3A00'
```

### Create and retrieve an appointment

The response to `POST` includes the newly created appointment ID. Reuse that value for the `GET` request; appointment IDs are not predictable across database states.

```powershell
$body = @{
  customerId = 1
  vehicleId = 1
  dealershipId = 1
  serviceTypeId = 1
  startTime = '2026-11-05T09:00:00+07:00'
} | ConvertTo-Json

$created = Invoke-RestMethod -Method Post `
  -Uri 'http://localhost:3000/api/v1/appointments' `
  -ContentType 'application/json' `
  -Body $body

$created.data
Invoke-RestMethod "http://localhost:3000/api/v1/appointments/$($created.data.id)"
```

### Deterministic overlapping conflict

Dealership 1 has multiple qualified technicians and bays, so overlap alone does not guarantee a conflict there. For a deterministic demonstration, create one Dealership 2 Oil Change booking, then submit another overlapping request. The reference seed has one qualified technician and one bay at Dealership 2, so the second request receives HTTP 409 while the first remains booked.

```powershell
$firstBody = @{
  customerId = 2
  vehicleId = 3
  dealershipId = 2
  serviceTypeId = 1
  startTime = '2026-11-15T10:00:00Z'
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri 'http://localhost:3000/api/v1/appointments' `
  -ContentType 'application/json' `
  -Body $firstBody

$overlapBody = @{
  customerId = 2
  vehicleId = 3
  dealershipId = 2
  serviceTypeId = 1
  startTime = '2026-11-15T10:15:00Z'
} | ConvertTo-Json

try {
  Invoke-RestMethod -Method Post `
    -Uri 'http://localhost:3000/api/v1/appointments' `
    -ContentType 'application/json' `
    -Body $overlapBody
} catch {
  $_.Exception.Response.StatusCode
  $_.ErrorDetails.Message
}
```

## Development and testing

```powershell
npm run lint
npm run build
npm test
```

Use `npm run test:watch` for watch mode or `npm run test:coverage` for coverage output.

`npm test` uses the existing `keyloop_scheduler` database and `public` schema. The test setup truncates only `Appointment` and recreates the baseline appointment fixture; it does not truncate the seven domain/reference tables (`Customer`, `Vehicle`, `Dealership`, `ServiceType`, `Technician`, `TechnicianQualification`, and `ServiceBay`). Running tests can delete appointments created manually through Swagger or during development. `npm run dev` itself does not reset appointments, and `npm run seed` no longer deletes appointments or tables.

## Milestones

- **M1 — Foundation & Database.** Project setup, schema, dependency compatibility, and Docker PostgreSQL provisioning.
- **M2 — Booking Engine, REST API, Swagger UI, Automated Tests & SA Corrections.** Transactional resource allocation, API and OpenAPI documentation, automated coverage, and corrections to seeding and rollback verification.
- **M3 — Documentation & Submission Readiness.** Final documentation audit and reviewer-facing submission material.

## AI Collaboration Narrative — My Strategy, Verification, and Ownership

I managed this assessment as the **human Project Manager (PM)**, using a deliberate multi-agent workflow. I chose **Scenario A — Unified Service Scheduler**, selected the backend scope, set milestones and acceptance criteria, made trade-off decisions, reviewed results, and retained accountability for the submission. I used **ChatGPT as my AI Solution Architect (SA)** for design reasoning, architectural critique, and quality reviews; **Anti as my AI developer agent** implemented and revised the application, tests, and documentation. These were assigned roles for AI tools, not human teammates, and I do not claim to have personally written every line.

### How I guided the AI

I began with three measurable requirements from the assessment: accept an appointment request for a vehicle, service type, dealership, and desired time; verify that **both** a qualified technician and service bay are available over the **entire service duration**; and persist a confirmed appointment with its customer, vehicle, technician, and bay relationships. I focused the team on a working, testable backend rather than features outside this scope.

I divided delivery into reviewable checkpoints: **M1** (TypeScript/Express foundation, Prisma schema, Docker PostgreSQL, seed data), **M2** (transactional booking engine, REST endpoints, Swagger/OpenAPI, automated tests), **M2-FIX and SA corrections** (test isolation, seed safety, stronger rollback evidence), and **M3** (reviewer-facing documentation). My working loop was: **I define scope and constraints → SA reviews design and risks → I assign scoped development to Anti → Anti implements and reports evidence → I assess the output and SA feedback → I direct corrections or accept the milestone**.

I chose Docker Desktop for PostgreSQL on Windows instead of a native installation. I also chose to share the local development database/schema with tests for simplicity, but required that only the Appointment table be reset during testing and that the consequences be disclosed.

### How I verified and refined AI output

I treated generated code and explanations as hypotheses to test, not as proof of correctness. I used concrete runtime errors, code review, integration tests, and database assertions to request targeted revisions.

1. **Compatibility and runtime issues:** Node 20.11 surfaced package compatibility problems involving newer Prisma/Vitest versions and Zod. Anti adjusted dependency versions and checked TypeScript compilation. Prisma `$queryRaw` failed to deserialize PostgreSQL's `void` return from `pg_advisory_xact_lock`, so Anti switched the advisory-lock call to `$executeRaw`. Express 5's getter-only `req.query` also required a middleware fix using `Object.defineProperty`.
2. **Core booking rules:** I required tests of successful persisted appointment creation and full entity retrieval, technician qualifications, vehicle/customer ownership, missing or invalid data, resource exhaustion, partial and full overlaps, and valid adjacent appointments. The overlap predicate checks `existing.startTime < requested.endTime` and `existing.endTime > requested.startTime`, covering the full interval rather than only the start time.
3. **Real database concurrency:** I asked for a PostgreSQL integration test sending **five concurrent booking requests** to a dealership with one qualified technician and one bay. The reported result was **one HTTP 201, four HTTP 409 responses, and one persisted appointment**. I kept the guarantee appropriately scoped: dealership-level advisory locks protect booking writers participating in the same protocol, not out-of-band database writes.
4. **SA review P1 — destructive seed:** The SA identified that the initial seed used full-table `TRUNCATE ... RESTART IDENTITY CASCADE`, risking development data loss. I prioritized this finding and assigned Anti to change the seed to non-destructive, idempotent lookups/upserts. The final seed script no longer truncates domain data or appointments; only the explicitly documented test helper resets Appointment.
5. **SA review P2 — rollback proof:** An HTTP 409 conflict and unchanged appointment count did not directly demonstrate rollback *after an INSERT*. Following SA feedback, I tasked Anti with a real transaction test that INSERTs an appointment, deliberately throws before commit, and verifies the inserted row is absent while earlier committed records remain.
6. **Reviewer reproducibility:** I required clear build/run/test commands, Docker and `.env.example` setup, Prisma migrations, seed fixtures, a usable OpenAPI spec, diagrams, observability rationale, and an honest list of limitations.

### How I ensured final code quality

My acceptance gates were **correct domain relationships, full-duration dual-resource availability, concurrency behavior within the documented lock protocol, atomic transaction rollback, predictable API validation/errors, reproducible local setup, and maintainable module boundaries**. The historical final development verification reported passing `npm run lint`, passing `npm run build`, and **26/26 tests across eight files on two consecutive runs**. These are recorded project results, **not** a claim that this documentation revision reran the suite. I checked whether each test established its stated claim and required stronger verification for P1 and P2.

I also documented trade-offs rather than treating the MVP as production-ready: the availability GET endpoint is a non-reserving snapshot; same-dealership bookings serialize; tests share the development database and may delete appointments; fixed-date test fixtures will eventually need maintenance; and working hours, shifts, cancellation, authentication, notifications, metrics, distributed tracing, and production load testing remain out of scope. My contribution was **directing AI work, challenging it with evidence, prioritizing corrections, and taking ownership of the outcome and its limitations**.

## MVP limitations and trade-offs

Availability is a point-in-time read and does not reserve resources; appointment creation checks availability again within its locked transaction. Dealership-level locking favors simple correctness and serializes bookings at a dealership, limiting per-dealership throughput. The MVP does not model opening hours, holidays, technician shifts or leave, cancellation, rescheduling, authentication, notifications, or payments. It has no production load benchmark, distributed tracing, or metrics pipeline.
