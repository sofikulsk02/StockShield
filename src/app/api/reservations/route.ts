import { NextRequest, NextResponse } from "next/server";
import { CreateReservationSchema } from "@/schemas";
import { reservationService } from "@/services/reservation.service";
import { handleApiError } from "@/lib/api-helper";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateReservationSchema.parse(body);

    const idempotencyKey = request.headers.get("idempotency-key") || undefined;

    // Get NextAuth session if available
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    const result = await reservationService.createReservation(
      validated.inventoryId,
      validated.quantity,
      idempotencyKey,
      userId
    );

    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (error) {
    return handleApiError(error);
  }
}
export const dynamic = "force-dynamic";
