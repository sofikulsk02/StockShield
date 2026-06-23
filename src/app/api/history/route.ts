import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reservations = await db.reservation.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        inventory: {
          include: {
            product: true,
            warehouse: true,
          },
        },
      },
    });

    return NextResponse.json({ reservations });
  } catch (err) {
    return handleApiError(err);
  }
}
