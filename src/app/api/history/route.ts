import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-helper";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Filter by userId if authenticated. If guest, return all.
    const whereClause = userId ? { userId } : {};

    const reservations = await db.reservation.findMany({
      where: whereClause,
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
