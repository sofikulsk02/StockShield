import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { reservationService } from "@/services/reservation.service";
import { handleApiError } from "@/lib/api-helper";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { reservationId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await request.json();

    if (!reservationId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Verify signature using the key secret
    const secret = process.env.RAZORPAY_KEY_SECRET || "";
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest("hex");

    if (digest !== razorpay_signature) {
      logger.warn("Razorpay signature verification failed", {
        reservationId,
        razorpay_order_id,
        razorpay_payment_id,
      });
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    logger.info("Razorpay signature verification succeeded, confirming reservation", {
      reservationId,
      razorpay_order_id,
      razorpay_payment_id,
    });

    // Signature verified! Mark the reservation hold as permanently CONFIRMED.
    // Use the unique payment ID as part of the idempotency key so verified checkout retries are safe.
    const idempotencyKey = `verify-pay-${razorpay_payment_id}`;
    const result = await reservationService.confirmReservation(reservationId, idempotencyKey);

    return NextResponse.json(result.body, { status: result.statusCode });
  } catch (error) {
    return handleApiError(error);
  }
}

export const dynamic = "force-dynamic";
