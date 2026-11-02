# Keyloop Unified Service Scheduler

A high-reliability, concurrency-safe RESTful backend for vehicle service appointment scheduling, built for the Keyloop Technical Assessment (Scenario A: The Unified Service Scheduler).

---

## 1. Project Overview

The Unified Service Scheduler automates vehicle service appointment bookings across dealerships while preventing resource double-booking (technicians and service bays). It satisfies three core capabilities:

1. **Appointment Requests**: Accepts service booking requests specifying vehicle, service type, dealership, and requested time slot.
2. **Deterministic Dual-Resource Allocation**: Automatically checks and reserves an available qualified technician and an available service bay for the entire service duration.
3. **Persisted Confirmed Bookings**: Persists confirmed appointments linking Customer, Vehicle, Dealership, ServiceType, Technician, and ServiceBay in UTC with transactional integrity.

---

## 2. Technology Stack & Architecture

- **Runtime**: Node.js v20+ LTS
- **Language**: TypeScript (strict mode enabled)
- **Framework**: Express.js
- **Database & ORM**: PostgreSQL 16 (via Docker Compose) & Prisma ORM v5.22
- **Validation**: Zod v3
- **Testing**: Vitest v1.6 & Supertest
- **Logging**: Pino with structured JSON logging and request correlation (`pino-http`)
- **API Documentation**: OpenAPI 3.0 / Swagger UI (`/api-docs`)

### Architecture Pattern: Modular Monolith

```
Controller  ───>  Service  ───>  Repository  ───>  Database (PostgreSQL)
     │                │                 │
(HTTP parsing   (Business logic,   (Data access,
 & validation)   lock management,   atomic queries)
                 rules)
```

Each feature module (`health`, `service-type`, `availability`, `appointment`) is self-contained under `src/modules/`.

---

## 3. Prerequisites

- **Node.js**: v20.11.0+ (LTS recommended)
- **npm**: v10+
- **Docker Desktop**: Running on Windows (with WSL2 or Hyper-V backend)

---

## 4. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Default `.env` configuration:

```ini
# Database (matches docker-compose.yml)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/keyloop_scheduler?schema=public"

# Server
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

---

## 5. Database Setup & Docker Provisioning

### Step 1: Start PostgreSQL via Docker Compose

```bash
docker compose up -d
```

Verify the database container is healthy:

```bash
docker compose ps
```

### Step 2: Run Prisma Migrations

```bash
npm run migrate:dev
```

*(Or `npm run migrate:deploy` for automated/CI environments)*

### Step 3: Seed Database

```bash
npm run seed
```

This populates reproducible sample data including:
- 4 Service Types (Oil Change, Brake Inspection, Full Service, Tire Rotation)
- 2 Customers (Alice Johnson, Bob Smith)
- 3 Vehicles linked to customers
- 2 Dealerships (Downtown Auto Center, Westside Motors)
- 4 Technicians with varied qualifications (including Dealership 2 with 1 tech / 1 bay for concurrency testing)
- 3 Service Bays
- 1 Pre-existing confirmed appointment for conflict testing

---

## 6. Build & Run Instructions

### Development Mode (with hot-reload)

```bash
npm run dev
```

### Type Checking & Linting

```bash
npm run lint
```

### Production Build & Execution

```bash
npm run build
npm start
```

---

## 7. Testing

Execute automated unit and integration test suites:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## 8. API Documentation

Interactive Swagger UI documentation is available at:

```
http://localhost:3000/api-docs
```

Raw health check:

```
GET http://localhost:3000/health
```

---

## 9. Example cURL Requests

### 1. Health Check

```bash
curl -i http://localhost:3000/health
```

### 2. List Service Types

```bash
curl -i http://localhost:3000/api/v1/service-types
```

### 3. Check Availability

```bash
curl -i "http://localhost:3000/api/v1/availability?dealershipId=1&serviceTypeId=1&startTime=2026-11-05T09:00:00%2B07:00"
```

### 4. Create Confirmed Appointment

```bash
curl -i -X POST http://localhost:3000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "vehicleId": 1,
    "dealershipId": 1,
    "serviceTypeId": 1,
    "startTime": "2026-11-05T09:00:00+07:00"
  }'
```

### 5. Get Appointment Details

```bash
curl -i http://localhost:3000/api/v1/appointments/1
```

---

## 10. AI Collaboration Narrative

### Strategy & Workflow
This project was implemented through a pair-programming workflow between the candidate (Project Manager / Lead Engineer) and AI coding assistants. Architectural boundaries were established up front, dividing the system into distinct milestones:
- **M1**: Foundation, Project Configuration, Schema Design, and Docker DB Setup.
- **M2**: Booking Engine, Advisory Lock Concurrency Protocol, and REST APIs.
- **M3**: Comprehensive Integration & Concurrency Test Suite.
- **M4**: Documentation and Observability Polish.

### Prompting Strategy & Error Correction
- **Prisma & Node Version Alignment**: During dependency installation on Node v20.11.0, latest versions of Prisma (v8 preview/unreleased) and Vitest (v5) threw unsupported engine warnings. We explicitly pinned stable versions (`@prisma/client@5.22.0`, `prisma@5.22.0`, `vitest@1.6.0`, `zod@^3.23.8`).
- **Containerized Database Strategy**: Rather than installing PostgreSQL natively on the Windows host, the PM directed the use of Docker Desktop with a robust `docker-compose.yml` specifying Alpine-based PostgreSQL 16, a named persistence volume (`keyloop-pgdata`), health checks via `pg_isready`, and development credentials.
- **TypeScript Strictness**: TypeScript 6 compiler options were strictly verified. Type discrepancies in request IDs between `pino-http` (`ReqId = string | number | object`) and application service parameters were explicitly resolved with `String(req.id)` casting, and unused imports were removed to guarantee clean zero-warning builds.

### Verification & Quality Assurance
All code artifacts and configuration files are validated through automated commands (`npx prisma validate`, `npx prisma generate`, `npm run lint`, and `npm run build`) before advancing past each milestone checkpoint.
