import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { reservationService } from "@/services/reservation.service";
import { getProductPrice } from "@/lib/prices";
import { handleApiError } from "@/lib/api-helper";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export async function POST(request: NextRequest) {
  try {
    const { reservationId } = await request.json();
    if (!reservationId) {
      return NextResponse.json({ error: "Reservation ID is required" }, { status: 400 });
    }

    const reservation = await reservationService.getReservationById(reservationId);
    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    if (reservation.status !== "PENDING") {
      return NextResponse.json(
        { error: `Reservation is in ${reservation.status} state` },
        { status: 400 }
      );
    }

    if (new Date(reservation.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "Reservation has expired" }, { status: 410 });
    }

    // Compute price using SKU mapping
    const sku = reservation.inventory.product.sku;
    const price = getProductPrice(sku);
    const amount = reservation.quantity * price;
    const amountInPaise = amount * 100; // Razorpay expects amount in paise

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: reservation.id,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: amount, // in INR
      currency: "INR",
      productName: reservation.inventory.product.name,
      quantity: reservation.quantity,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const dynamic = "force-dynamic";
