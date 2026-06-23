# StockShield 🛡️ | Real-Time Inventory Reservation System

StockShield is a production-grade, high-concurrency inventory reservation and order-fulfillment platform. Built to solve the race conditions that occur in checkout flows (such as 3DS delays, UPI authorization confirmation windows, or wallet redirects), StockShield guarantees that stock holds are safe from double-allocation while preventing permanent stock depletion from abandoned carts.

---

## 🏗️ System Architecture & Concurrency Control

StockShield leverages **Clean Architecture** patterns separated into:
* **API Route Handlers (Controller Layer)**: Validates incoming payloads using Zod schemas and processes headers (such as `Idempotency-Key`).
* **Service Layer (Business Logic)**: Manages transactional workflows, handles distributed lock acquisition, checks idempotency pools, and controls stock lifecycles.
* **Repository Layer (Data Access)**: Executes direct database reads and writes.

### 1. Concurrency Control (Row-Level Database Locking)
To guarantee that exactly one concurrent checkout request succeeds when reserving the last available unit, StockShield uses a **raw parameterized SQL UPDATE** statement inside a transaction.
```sql
UPDATE "Inventory"
SET "reservedUnits" = "reservedUnits" + $1
WHERE "id" = $2 AND ("totalUnits" - "reservedUnits") >= $1;
```
* **How it works**: Postgres/SQLite locks the target row during the evaluation. It dynamically verifies that the unreserved stock (`totalUnits - reservedUnits`) satisfies the requested lease quantity. If yes, it atomically increments `reservedUnits`.
* **Conflict Prevention**: If another request committed first and depleted the stock, the filter criteria fails, affecting `0` rows. The system catches this, aborts the transaction, and throws an `InsufficientStockError` (409 Conflict).

### 2. Idempotency Support
Every hold creation and purchase confirmation accepts an optional `Idempotency-Key` header.
* **Locking**: Uses Redis (or a robust in-memory TTL Map fallback for local development) to cache response payloads for 24 hours.
* **Protection**: Duplicate clicks or retries with the same key safely return the exact original response without reserving additional inventory units.

### 3. Automatic Expiration Lifecycle (Lease Controls)
* **Hold Leases**: Reservations default to a 10-minute timeout lease (`PENDING`).
* **Releases**: If the lease expires, the unconfirmed units are automatically returned to the warehouse availability pool.
* **Worker Execution**: Cleanups are initiated by hit triggers on the `/api/cron` route, querying expired leases and returning reserved stock atomically.

---

## 📂 Project Structure

```
stockshield/
├── prisma/                  # Database schema & migrations
├── scratch/                 # Concurrency simulation script
└── src/
    ├── app/                 # Next.js App Router Pages & API handlers
    │   ├── api/             # API routes (/products, /reservations, /cron, etc.)
    │   ├── product/         # Product detail view page
    │   └── reservation/     # Checkout countdown & purchase status page
    ├── components/          # Reusable UI component folder
    │   ├── ProductCard.tsx
    │   ├── ReservationAction.tsx
    │   ├── TimerCountDown.tsx
    │   └── WarehouseInventory.tsx
    ├── constants/           # Global configuration constants
    ├── errors/              # Domain-specific custom application errors
    ├── lib/                 # Core singletons (Prisma, Redis with fallback, logger)
    ├── repositories/        # Repository layer files
    ├── schemas/             # Input payload validation schemas (Zod)
    ├── services/            # Service layer files
    └── types/               # Shared TypeScript typings
```

---

## 🚀 Getting Started

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Database Setup & Seeding
Initialize the database and run the default seed file (creates a list of initial warehouses and products):
```bash
npx prisma migrate dev
npx prisma db seed
```

### 3. Run Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the inventory dashboard.

---

## 🧪 Testing Concurrency Safety

StockShield contains a built-in race condition script to simulate multiple concurrent checkouts. 

The test fetches the target MacBook Air M3 warehouse inventory (seeded with **1 unit** of stock) and fires **5 simultaneous reservation requests** targeting it at the exact same millisecond:

To execute the test:
```bash
npx tsx scratch/test-concurrency.ts
```

### Expected Output
```
=== STARTING CONCURRENCY SAFETY TEST ===
Target Inventory ID: cmqq9iuah0009t2igcl33vryu
Initial Stock Levels: Total = 1, Reserved = 0
Available Units: 1
Firing 5 concurrent requests to http://localhost:3000/api/reservations...

=== CONCURRENCY TEST RESULTS ===
Request #0: SUCCESS (201 Created) -> Reservation ID: cmqqc0c7y0001t2fogkwe5rr0
Request #1: CONFLICT (409 Conflict) -> Message: This product inventory is currently locked. Please try again shortly.
Request #2: CONFLICT (409 Conflict) -> Message: This product inventory is currently locked. Please try again shortly.
Request #3: CONFLICT (409 Conflict) -> Message: This product inventory is currently locked. Please try again shortly.
Request #4: CONFLICT (409 Conflict) -> Message: This product inventory is currently locked. Please try again shortly.

=== SUMMARY ===
Total Requests: 5
Successful Holds: 1 (Expected: 1)
Conflict Denials: 4 (Expected: 4)
System Errors: 0 (Expected: 0)

✅ STATUS: PASSED (100% Concurrency Safe!)
```

---

## 🛠️ API Documentation

### Products
* **`GET /api/products`**: Lists all products and their dynamic warehouse stock summaries.
* **`GET /api/products/[id]`**: Retrieves single product information and specific warehouse breakdowns.

### Reservations
* **`POST /api/reservations`**: Creates a temporary hold on stock.
  * Headers: `Idempotency-Key` (Optional)
  * Body: `{ inventoryId: string, quantity: number }`
* **`GET /api/reservations/[id]`**: Fetches reservation status and hold details.
* **`POST /api/reservations/[id]/confirm`**: Confirms payment and completes the order. Decrements total warehouse units permanently.
  * Headers: `Idempotency-Key` (Optional)
* **`POST /api/reservations/[id]/release`**: Cancels the hold early, returning reserved units back to stock availability.

### Background Tasks
* **`GET /api/cron`**: Scans the database for expired pending leases and triggers stock releases. Can be wired up to a Vercel/GitHub actions cron worker.
