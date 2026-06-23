import { NextResponse } from "next/server";
import { inventoryService } from "@/services/inventory.service";
import { reservationService } from "@/services/reservation.service";
import { handleApiError } from "@/lib/api-helper";

export async function GET() {
  try {
    // Lazy cleanup of expired reservations on read to ensure stock accuracy
    await reservationService.cleanupExpiredReservations();

    const products = await inventoryService.getProducts();
    return NextResponse.json(products);
  } catch (error) {
    return handleApiError(error);
  }
}
export const dynamic = "force-dynamic";
