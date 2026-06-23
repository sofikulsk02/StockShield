import { NextRequest, NextResponse } from "next/server";
import { reservationService } from "@/services/reservation.service";
import { handleApiError } from "@/lib/api-helper";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservation = await reservationService.getReservationById(id);
    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found", code: "RESERVATION_NOT_FOUND" },
        { status: 404 }
      );
    }
    return NextResponse.json(reservation);
  } catch (error) {
    return handleApiError(error);
  }
}
export const dynamic = "force-dynamic";
