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

## Human-directed AI collaboration

The candidate directed and reviewed the work through concrete implementation decisions. When Node 20.11 produced compatibility problems with newer Prisma, Vitest, and Zod resolutions, the candidate chose stable pinned versions. They selected Docker Desktop with PostgreSQL 16 for the Windows environment rather than a native PostgreSQL installation.

The candidate challenged implementation failures and reviewed corrections: Prisma `$queryRaw` could not deserialize PostgreSQL's `void` result from `pg_advisory_xact_lock`, so the lock call uses `$executeRaw`; Express 5 exposes `req.query` as a getter, so validated values are installed with `Object.defineProperty`. A Solution Architect review found that the initial seed truncated tables; the candidate accepted replacing it with non-destructive, idempotent seeding.

The PM chose a shared database and schema for tests, with only `Appointment` truncated to isolate test cases. The candidate verified the five-request concurrency scenario (one success and four conflicts), then requested a dedicated rollback-after-INSERT test after recognizing that the original conflict test did not directly prove atomic rollback. The historical final result was 26 passing tests across 8 suites on each of two consecutive runs; these are recorded results, not runs performed as part of this documentation audit.

## MVP limitations and trade-offs

Availability is a point-in-time read and does not reserve resources; appointment creation checks availability again within its locked transaction. Dealership-level locking favors simple correctness and serializes bookings at a dealership, limiting per-dealership throughput. The MVP does not model opening hours, holidays, technician shifts or leave, cancellation, rescheduling, authentication, notifications, or payments. It has no production load benchmark, distributed tracing, or metrics pipeline.
