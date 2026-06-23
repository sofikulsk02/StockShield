"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ProductWithInventory } from "../../../types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [product, setProduct] = useState<ProductWithInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to load product details: ${res.statusText}`);
      }
      const data = await res.json();
      setProduct(data);

      // Select first warehouse with stock
      const availableInv = data.inventories.find(
        (inv: any) => inv.totalUnits - inv.reservedUnits > 0
      );
      if (availableInv) {
        setSelectedInventoryId(availableInv.id);
      } else if (data.inventories.length > 0) {
        setSelectedInventoryId(data.inventories[0].id);
      }
      // Generate a new unique idempotency key
      setIdempotencyKey(`idem-${Math.random().toString(36).substring(2, 9)}`);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryId) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          inventoryId: selectedInventoryId,
          quantity: Number(quantity),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("Conflict (409): Insufficient stock available. Another client may have reserved this unit.");
        }
        throw new Error(data.error || `Failed to create reservation: ${res.status}`);
      }

      // Redirect to the reservation confirmation checkout page
      window.location.href = `/reservation/${data.reservationId}`;
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse py-12">
        <div className="h-6 bg-white/5 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          <div className="h-96 bg-white/5 rounded-2xl" />
          <div className="space-y-6">
            <div className="h-10 bg-white/5 rounded w-3/4" />
            <div className="h-6 bg-white/5 rounded w-1/2" />
            <div className="h-32 bg-white/5 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
          ⚠️ {error || "Product not found"}
        </div>
        <Link href="/" className="btn-secondary px-6 py-2.5 rounded-xl inline-block text-sm">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const hasStock = product.inventories.some(
    (inv) => inv.totalUnits - inv.reservedUnits > 0
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back to Home link */}
      <div>
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-1.5">
          ← Back to Inventory Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-4">
        {/* Left Column: Image & Info */}
        <div className="md:col-span-7 space-y-6">
          <div className="relative w-full h-[400px] rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-white/5 shadow-2xl">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={product.imageUrl} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-8xl">📦</span>
            )}
            <span className="absolute top-4 right-4 text-xs bg-black/70 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full text-zinc-300 font-mono">
              SKU: {product.sku}
            </span>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">{product.name}</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">{product.description || "No description provided."}</p>
            
            <div className="border-t border-white/5 pt-4">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-3">Warehouse Stock Distribution</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {product.inventories.map((inv) => {
                  const available = inv.totalUnits - inv.reservedUnits;
                  return (
                    <div key={inv.id} className="bg-white/2 border border-white/5 p-4 rounded-xl space-y-1">
                      <span className="text-xs font-semibold text-zinc-300 block truncate" title={inv.warehouse.name}>
                        {inv.warehouse.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">{inv.warehouse.location}</span>
                      
                      <div className="flex items-end justify-between pt-2">
                        <div className="text-2xl font-bold text-white">
                          {available} <span className="text-xs text-zinc-500 font-medium">available</span>
                        </div>
                        <div className="text-right text-xs text-zinc-400">
                          Total: {inv.totalUnits} <br />
                          Held: {inv.reservedUnits}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Reservation Form */}
        <div className="md:col-span-5">
          <div className="glass-panel sticky top-24 rounded-2xl p-6 border border-white/10 shadow-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Secure Inventory Hold</h2>
              <p className="text-zinc-400 text-xs mt-1">
                Creates a temporary 10-minute hold. Holds are protected under strict transactional safety.
              </p>
            </div>

            {submitError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs leading-relaxed">
                ⚠️ {submitError}
              </div>
            )}

            <form onSubmit={handleCreateReservation} className="space-y-4">
              {/* Select Warehouse */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Fulfillment Warehouse
                </label>
                <select
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {product.inventories.map((inv) => {
                    const available = inv.totalUnits - inv.reservedUnits;
                    return (
                      <option key={inv.id} value={inv.id} disabled={available <= 0}>
                        {inv.warehouse.name} ({available} left)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Units Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-bold"
                  required
                />
              </div>

              {/* Idempotency Config */}
              <div className="bg-white/2 border border-white/5 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Idempotency-Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setIdempotencyKey(`idem-${Math.random().toString(36).substring(2, 9)}`)}
                    className="text-[10px] text-zinc-400 hover:text-white"
                  >
                    🔄 Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[9px] text-zinc-500 block leading-tight">
                  Protects against accidental duplicate checkout button clicks. Retrying with the same key safely returns the identical reservation ID.
                </span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || !hasStock || !selectedInventoryId}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  hasStock && selectedInventoryId
                    ? "btn-primary"
                    : "bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <span>⏳ Locking Units...</span>
                ) : hasStock ? (
                  <span>Reserve Inventory Hold</span>
                ) : (
                  <span>Out of Stock</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
