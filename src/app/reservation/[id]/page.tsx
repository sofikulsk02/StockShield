"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
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

      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 410) {
          // Expiry
          setIsExpired(true);
          setReservation((prev) => {
            if (!prev) return null;
            return { ...prev, status: "RELEASED", releaseReason: "EXPIRED" };
          });
          throw new Error("Gone (410): The reservation has expired. The stock hold was automatically released.");
        }
        throw new Error(data.error || `Failed to confirm purchase: ${res.status}`);
      }

      // Update state locally
      setReservation((prev) => {
        if (!prev) return null;
        return { ...prev, status: "CONFIRMED" };
      });
    } catch (err: any) {
      setActionError(err.message);
    } finally {
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

        {/* Idempotent Check Panel */}
        {reservation.status === "PENDING" && (
          <div className="bg-white/2 border border-white/5 p-4 rounded-2xl mb-6">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Purchase Idempotency Key</span>
              <button 
                onClick={() => setIdempotencyKey(`idem-conf-${Math.random().toString(36).substring(2, 9)}`)}
                className="text-[10px] text-zinc-500 hover:text-white"
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
            <p className="text-[9px] text-zinc-500 mt-1">
              Passed in the `Idempotency-Key` header. Prevents double-processing if the checkout button is pressed multiple times concurrently.
            </p>
          </div>
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
