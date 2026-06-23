import { NextRequest, NextResponse } from "next/server";
import { reservationService } from "@/services/reservation.service";
import { handleApiError } from "@/lib/api-helper";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized trigger attempt on cron API");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await reservationService.cleanupExpiredReservations();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const url = new URL(request.url);
    const secretQuery = url.searchParams.get("secret");
    if (cronSecret && secretQuery !== cronSecret) {
      logger.warn("Unauthorized trigger attempt on cron GET API");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await reservationService.cleanupExpiredReservations();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
export const dynamic = "force-dynamic";
