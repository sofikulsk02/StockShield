import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function runConcurrencyTest() {
  console.log("=== STARTING CONCURRENCY SAFETY TEST ===");

  // 1. Fetch the inventory ID for MacBook Air M3 in Bangalore Fulfillment Center (seeded with 1 unit)
  const product = await prisma.product.findUnique({
    where: { sku: "LAP-001" },
    include: {
      inventories: {
        include: { warehouse: true },
      },
    },
  });

  if (!product) {
    console.error("Error: Could not find MacBook Air M3 in the database. Please run seeding first.");
    process.exit(1);
  }

  const bangaloreInv = product.inventories.find(
    (inv) => inv.warehouse.name === "Bangalore Fulfillment Center"
  );

  if (!bangaloreInv) {
    console.error("Error: Bangalore Fulfillment Center inventory not found.");
    process.exit(1);
  }

  console.log(`Target Inventory ID: ${bangaloreInv.id}`);
  console.log(`Initial Stock Levels: Total = ${bangaloreInv.totalUnits}, Reserved = ${bangaloreInv.reservedUnits}`);
  const available = bangaloreInv.totalUnits - bangaloreInv.reservedUnits;
  console.log(`Available Units: ${available}`);

  if (available !== 1) {
    console.log("Resetting stock levels to Total = 1, Reserved = 0 for clean test environment...");
    await prisma.inventory.update({
      where: { id: bangaloreInv.id },
      data: { totalUnits: 1, reservedUnits: 0 },
    });
    // Delete any pending reservations for this inventory to avoid overlap
    await prisma.reservation.deleteMany({
      where: { inventoryId: bangaloreInv.id },
    });
  }

  // Define port
  const port = 3000;
  const url = `http://localhost:${port}/api/reservations`;

  console.log(`Firing 5 concurrent requests to ${url}...`);

  // Create 5 requests
  const requests = Array.from({ length: 5 }).map(async (_, idx) => {
    const idempotencyKey = `test-race-${idx}-${Math.random()}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          inventoryId: bangaloreInv.id,
          quantity: 1,
        }),
      });

      const status = response.status;
      const body = await response.json();
      return { id: idx, status, body };
    } catch (err: any) {
      return { id: idx, status: 500, error: err.message };
    }
  });

  const results = await Promise.all(requests);

  console.log("\n=== CONCURRENCY TEST RESULTS ===");
  let successCount = 0;
  let conflictCount = 0;
  let errorCount = 0;

  results.forEach((res) => {
    if (res.status === 201) {
      successCount++;
      console.log(`Request #${res.id}: SUCCESS (201 Created) -> Reservation ID: ${res.body.reservationId}`);
    } else if (res.status === 409) {
      conflictCount++;
      console.log(`Request #${res.id}: CONFLICT (409 Conflict) -> Message: ${res.body.error}`);
    } else {
      errorCount++;
      console.log(`Request #${res.id}: ERROR (${res.status}) ->`, res.body || res.error);
    }
  });

  console.log("\n=== SUMMARY ===");
  console.log(`Total Requests: 5`);
  console.log(`Successful Holds: ${successCount} (Expected: 1)`);
  console.log(`Conflict Denials: ${conflictCount} (Expected: 4)`);
  console.log(`System Errors: ${errorCount} (Expected: 0)`);

  const passed = successCount === 1 && conflictCount === 4;
  if (passed) {
    console.log("\n✅ STATUS: PASSED (100% Concurrency Safe!)");
  } else {
    console.log("\n❌ STATUS: FAILED (Check race condition locks)");
  }

  // Cleanup: release reservation so inventory goes back to normal
  const successRes = results.find((r) => r.status === 201);
  if (successRes && successRes.body?.reservationId) {
    console.log(`\nReleasing test reservation hold ${successRes.body.reservationId} to clean up DB...`);
    await fetch(`http://localhost:${port}/api/reservations/${successRes.body.reservationId}/release`, {
      method: "POST",
    });
  }

  await prisma.$disconnect();
}

runConcurrencyTest();
