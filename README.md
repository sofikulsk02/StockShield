# StockShield 🛡️ | Real-Time Inventory Reservation System

StockShield is a production-grade, high-concurrency inventory reservation and order-fulfillment platform. Built to solve the race conditions that occur in checkout flows (such as 3DS delays, UPI authorization confirmation windows, or wallet redirects), StockShield guarantees that stock holds are safe from double-allocation while preventing permanent stock depletion from abandoned carts.

---

## 🏗️ System Architecture & Concurrency Control

StockShield leverages **Clean Architecture** patterns separated into:
* **API Route Handlers (Controller Layer)**: Validates incoming payloads using Zod schemas and processes headers (such as `Idempotency-Key`).
* **Service / Business Logic Layer**: Manages transactional workflows, handles distributed lock checking, checks idempotency pools, and controls stock lifecycles.
* **Repository / Data Access Layer**: Executes direct database reads and writes.

```mermaid
graph TD
    Client[Client Browser] -->|HTTP Request / Idempotency Header| Controller[API Route Controllers]
    Controller -->|Zod Payload Validation| Service[Service Layer]
    Service -->|Verify Key| Redis[(Upstash Redis Cache)]
    Service -->|Exclusive Write Lock & Update| DB[(PostgreSQL / Neon Database)]
    DB -->|Atomic DB Result| Service
    Service -->|Status Payload| Controller
    Controller -->|Response| Client
```

### 1. Concurrency Control (Row-Level Database Locking)
To guarantee that exactly one concurrent checkout request succeeds when reserving the last available unit, StockShield rejects application-level checks. Running a standard `SELECT` query in Node.js to check stock, evaluating it in Javascript, and then executing an `UPDATE` to reserve it creates a race condition window between the read and write operations.

StockShield solves this by executing a single atomic SQL UPDATE statement containing a conditional `WHERE` guard directly inside a PostgreSQL transaction:
```sql
UPDATE "Inventory"
SET "reservedUnits" = "reservedUnits" + $1
WHERE "id" = $2 AND ("totalUnits" - "reservedUnits") >= $1;
```
* **How it works**: PostgreSQL locks the target row during the evaluation. It dynamically verifies that the unreserved stock (`totalUnits - reservedUnits`) satisfies the requested lease quantity. If yes, it atomically increments `reservedUnits`.
* **Conflict Prevention**: If another request committed first and depleted the stock, the filter criteria fails, affecting `0` rows. The system catches this, aborts the transaction, and throws an `InsufficientStockError` (409 Conflict).
* **Why this is superior to SELECT ... FOR UPDATE**: While `SELECT ... FOR UPDATE` is a valid way to lock rows, it blocks all read operations on that row for the duration of the transaction. In a flash sale, thousands of users are continuously reading stock levels. Blocking those reads degrades read throughput and results in high latency. StockShield's atomic `UPDATE` approach performs an optimistic-like lock on writes while allowing completely non-blocking, concurrent reads.

### 2. Idempotency Support
Every hold creation and purchase confirmation accepts an optional `Idempotency-Key` header.
* **Locking**: Uses Upstash Redis (with a robust in-memory TTL Map fallback for local development) to cache response payloads for 24 hours.
* **Protection**: Duplicate clicks or retries with the same key safely return the exact original response without reserving additional inventory units.

### 3. Automatic Expiration Lifecycle (Lease Controls)
* **Hold Leases**: Reservations default to a 10-minute timeout lease (`PENDING`).
* **Releases**: If the lease expires, the unconfirmed units are automatically returned to the warehouse availability pool.
* **Two-Layer Expiration Approach**:
  1. **Lazy Cleanup on Read (Immediate Correctness)**: Every call to `GET /api/products` runs a cleanup query first—any `PENDING` reservation past its `expiresAt` is immediately set to `RELEASED` and its `reservedUnits` are returned to available stock. This ensures stock counts are always accurate when the user views the dashboard.
  2. **Active Cron Cleaner**: An external scheduled cron hits `GET /api/cron` (protected by a Bearer token) every minute to sweep and release abandoned, expired reservations.

---

## 🎨 Premium Visual Design & Aesthetics
StockShield features a modern, premium dark-mode interface built with Next.js and styled with Vanilla CSS utilities.
* **Harmonious Color Palette**: Sleek `#09090b` dark background, accented with solid **Orange** logo branding and polished **Emerald Green** buttons (`#10b981`) and stock availability indicators to represent success and reservation readiness.
* **Glow Suppression**: Micro-interactions are kept professional with subtle drop shadows instead of overwhelming AI-like neon glows, ensuring a high-quality human feel.
* **Glassmorphism Panels**: Header and cards feature modern frosted glass overlays (`backdrop-filter: blur(12px)`) with thin, elegant borders.

---

## 💳 Payment Integration (Razorpay)
StockShield integrates Razorpay in test mode to simulate a secure checkout flow.

* **Order Creation**: Clicking the checkout button generates a server-side order with Razorpay using the credentials.
* **HMAC Signature Verification**: Payment confirmation is verified independently on the server using an HMAC SHA256 checksum:
  ```javascript
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  ```
  This ensures that faking successful payments is impossible.

---

## 📂 Project Structure

```
stockshield/
├── prisma/                  # Database schema, config, & seed scripts
├── scratch/                 # Concurrency simulation script
└── src/
    ├── app/                 # Next.js App Router Pages & API handlers
    │   ├── api/             # API routes (/products, /reservations, /cron, etc.)
    │   ├── payments/        # Razorpay payments API (/order, /verify)
    │   ├── product/         # Product detail view page
    │   └── reservation/     # Checkout countdown & purchase status page
    ├── components/          # Reusable UI component folder
    │   ├── NavBar.tsx
    │   ├── ProductCard.tsx
    │   ├── ReservationAction.tsx
    │   ├── TimerCountDown.tsx
    │   └── WarehouseInventory.tsx
    ├── constants/           # Global configuration constants
    ├── errors/              # Domain-specific custom application errors
    ├── lib/                 # Core singletons (Prisma, Redis, logger)
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

### 2. Configure Environment
Create a `.env` file in the root directory:
```env
PORT=3000
DATABASE_URL="postgresql://username:password@localhost:5432/stockshield?sslmode=require"
REDIS_URL="rediss://default:token@your-redis-url.upstash.io:6379"

RAZORPAY_API_KEY="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_key_secret"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret"
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

### 3. Database Setup & Seeding
Initialize the database and run the default seed file (creates a list of initial warehouses, products, and low stock counts):
```bash
npx prisma db push
npx prisma db seed
```

### 4. Run Development Server
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

### Payments
* **`POST /api/payments/order`**: Creates a new Razorpay checkout order.
* **`POST /api/payments/verify`**: Verifies incoming checkout signatures and confirms the corresponding reservation.

### Background Tasks
* **`GET /api/cron`**: Scans the database for expired pending leases and triggers stock releases. Can be wired up to a Vercel/GitHub actions cron worker.
