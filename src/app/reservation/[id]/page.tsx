"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Script from "next/script";
import { ReservationWithDetails } from "../../../types";
import TimerCountDown from "../../../components/TimerCountDown";
import ReservationAction from "../../../components/ReservationAction";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReservationPage({ params }: PageProps) {
  const { id } = use(params);
  const [reservation, setReservation] = useState<ReservationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // in seconds
  const [isExpired, setIsExpired] = useState(false);

  // Action states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  useEffect(() => {
    fetchReservationDetails();
    setIdempotencyKey(`idem-conf-${Math.random().toString(36).substring(2, 9)}`);
  }, [id]);

  useEffect(() => {
    if (timeLeft === null || reservation?.status !== "PENDING") return;

    if (timeLeft <= 0) {
      setIsExpired(true);
      setTimeLeft(0);
      // Mark local status as RELEASED - EXPIRED
      setReservation((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: "RELEASED",
          releaseReason: "EXPIRED",
        };
      });
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, reservation?.status]);

  const fetchReservationDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/reservations/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to load reservation: ${res.statusText}`);
      }
      const data = await res.json();
      setReservation(data);

      if (data.status === "PENDING") {
        const expiresAtTime = new Date(data.expiresAt).getTime();
        const diffSeconds = Math.max(0, Math.floor((expiresAtTime - Date.now()) / 1000));
        setTimeLeft(diffSeconds);
        if (diffSeconds <= 0) {
          setIsExpired(true);
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPurchase = async () => {
    try {
      setIsSubmitting(true);
      setActionError(null);

      // 1. Create Razorpay order on the server
      const orderRes = await fetch("/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: id }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        if (orderRes.status === 410) {
          setIsExpired(true);
          setReservation((prev) => {
            if (!prev) return null;
            return { ...prev, status: "RELEASED", releaseReason: "EXPIRED" };
          });
          throw new Error("Gone (410): The reservation has expired. The stock hold was automatically released.");
        }
        throw new Error(orderData.error || "Failed to create payment order");
      }

      // 2. Configure options for the Razorpay Checkout modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_API_KEY || "rzp_test_T50DHxzuyI6JxM",
        amount: orderData.amount * 100, // in paise
        currency: orderData.currency,
        name: "StockShield 🛡️",
        description: `Confirm Purchase - ${orderData.productName} (x${orderData.quantity})`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            setIsSubmitting(true);
            // 3. Verify payment signature on the server
            const verifyRes = await fetch("/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reservationId: id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              if (verifyRes.status === 410) {
                // Expiry during checkout modal flow
                setIsExpired(true);
                setReservation((prev) => {
                  if (!prev) return null;
                  return { ...prev, status: "RELEASED", releaseReason: "EXPIRED" };
                });
                throw new Error("Gone (410): The reservation expired during payment. The stock hold has been released.");
              }
              throw new Error(verifyData.error || "Payment verification failed");
            }

            // Success! Update local reservation state
            setReservation((prev) => {
              if (!prev) return null;
              return { ...prev, status: "CONFIRMED" };
            });
          } catch (err: any) {
            setActionError(err.message);
          } finally {
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: "Test Shopper",
          email: "shopper@stockshield.com",
          contact: "9999999999",
        },
        theme: {
          color: "#6366f1", // Indigo theme color
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            console.log("Payment checkout dismissed");
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setActionError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleCancelReservation = async () => {
    try {
      setIsSubmitting(true);
      setActionError(null);

      const res = await fetch(`/api/reservations/${id}/release`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to release reservation: ${res.status}`);
      }

      // Update state locally
      setReservation((prev) => {
        if (!prev) return null;
        return { ...prev, status: "RELEASED", releaseReason: "USER_CANCELLED" };
      });
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse py-12">
        <div className="h-6 bg-white/5 rounded w-1/4" />
        <div className="glass-panel h-80 rounded-2xl p-6 space-y-6" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
          ⚠️ {error || "Reservation not found"}
        </div>
        <Link href="/" className="btn-secondary px-6 py-2.5 rounded-xl inline-block text-sm">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { inventory } = reservation;
  const { product, warehouse } = inventory;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      {/* Navigation */}
      <div>
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
          ← Back to Inventory Dashboard
        </Link>
      </div>

      {/* Main Reservation Card */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Decorative corner glows based on status */}
        {reservation.status === "PENDING" && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        )}
        {reservation.status === "CONFIRMED" && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        )}
        {reservation.status === "RELEASED" && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/5">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">HOLD REGISTRY</span>
            <span className="text-sm font-mono text-zinc-300 block mt-0.5">ID: {reservation.id}</span>
          </div>
          <div>
            {reservation.status === "PENDING" && (
              <span className="badge badge-pending">
                <span className="pulse-dot pulse-dot-pending" />
                Hold Pending
              </span>
            )}
            {reservation.status === "CONFIRMED" && (
              <span className="badge badge-confirmed">
                <span className="pulse-dot pulse-dot-confirmed" />
                Confirmed
              </span>
            )}
            {reservation.status === "RELEASED" && (
              <span className="badge badge-released">
                <span className="pulse-dot pulse-dot-released" />
                Hold Released ({reservation.releaseReason})
              </span>
            )}
          </div>
        </div>

        {/* Action errors display */}
        {actionError && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm leading-relaxed">
            ⚠️ {actionError}
          </div>
        )}

        {/* Content sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
          {/* Reservation Product Summary */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Reserved Item</h3>
            <div className="flex gap-4 items-center bg-white/2 p-4 rounded-2xl border border-white/5">
              <div className="w-16 h-16 rounded-xl bg-zinc-950 flex items-center justify-center overflow-hidden border border-white/5 flex-shrink-0">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm truncate">{product.name}</h4>
                <p className="text-zinc-400 text-xs mt-0.5">SKU: {product.sku}</p>
                <div className="text-indigo-400 text-xs font-extrabold mt-1">Qty: {reservation.quantity} Units</div>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Warehouse Location:</span>
                <span className="text-zinc-300 font-semibold">{warehouse.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Fulfillment Hub:</span>
                <span className="text-zinc-400">{warehouse.location}</span>
              </div>
            </div>
          </div>

          {/* Time Countdown / Expiry Status */}
          <TimerCountDown 
            timeLeft={timeLeft} 
            status={reservation.status} 
            releaseReason={reservation.releaseReason} 
          />
        </div>

        {/* Idempotency Key — collapsed by default */}
        {reservation.status === "PENDING" && (
          <details className="group mb-6">
            <summary className="flex items-center justify-between cursor-pointer list-none select-none py-2 px-3 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-colors">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="text-zinc-600">⚙</span> Advanced Technical Details
              </span>
              <span className="text-zinc-600 text-xs transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="mt-2 bg-white/2 border border-white/5 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Purchase Idempotency Key</span>
                <button
                  onClick={() => setIdempotencyKey(`idem-conf-${Math.random().toString(36).substring(2, 9)}`)}
                  className="text-[10px] text-zinc-500 hover:text-white transition-colors"
                >
                  🔄 Refresh Key
                </button>
              </div>
              <input
                type="text"
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-mono focus:outline-none"
              />
              <p className="text-[9px] text-zinc-500">
                Passed as the <code className="text-indigo-400/70">Idempotency-Key</code> header. Prevents double-processing if the checkout button is pressed multiple times concurrently.
              </p>
            </div>
          </details>
        )}

        {/* Action Buttons */}
        <ReservationAction 
          status={reservation.status} 
          isSubmitting={isSubmitting} 
          onConfirm={handleConfirmPurchase} 
          onCancel={handleCancelReservation} 
        />
      </div>
    </div>
  );
}
