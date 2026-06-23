import { NextResponse } from "next/server";
import { inventoryService } from "@/services/inventory.service";
import { handleApiError } from "@/lib/api-helper";

export async function GET() {
  try {
    const warehouses = await inventoryService.getWarehouses();
    return NextResponse.json(warehouses);
  } catch (error) {
    return handleApiError(error);
  }
}
export const dynamic = "force-dynamic";
