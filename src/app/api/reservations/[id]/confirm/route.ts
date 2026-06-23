import { NextRequest, NextResponse } from "next/server";
import { reservationService } from "@/services/reservation.service";
import { handleApiError } from "@/lib/api-helper";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idempotencyKey = request.headers.get("idempotency-key") || undefined;

    const result = await reservationService.confirmReservation(id, idempotencyKey);
    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (error) {
    return handleApiError(error);
  }
}
export const dynamic = "force-dynamic";
