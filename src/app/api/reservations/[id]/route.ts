import { NextRequest, NextResponse } from "next/server";
import { reservationService } from "@/services/reservation.service";
import { handleApiError } from "@/lib/api-helper";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

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

    // If reservation is personal, check that the authenticated user owns it
    if (reservation.userId) {
      const session = await getServerSession(authOptions);
      if (!session || session.user?.id !== reservation.userId) {
        return NextResponse.json(
          { error: "Unauthorized access to reservation", code: "UNAUTHORIZED" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(reservation);
  } catch (error) {
    return handleApiError(error);
  }
}
export const dynamic = "force-dynamic";
