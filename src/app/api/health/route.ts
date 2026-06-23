import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "healthy", database: "connected" });
  } catch (error: any) {
    return NextResponse.json({ status: "unhealthy", error: error.message }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
