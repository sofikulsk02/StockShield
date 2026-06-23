import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/inventory.service";
import { reservationService } from "@/services/reservation.service";
import { handleApiError } from "@/lib/api-helper";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Lazy cleanup on read
    await reservationService.cleanupExpiredReservations();

    const product = await inventoryService.getProductById(id);
    if (!product) {
      return NextResponse.json(
        { error: "Product not found", code: "PRODUCT_NOT_FOUND" },
        { status: 404 }
      );
    }
    return NextResponse.json(product);
  } catch (error) {
    return handleApiError(error);
  }
}
export const dynamic = "force-dynamic";
