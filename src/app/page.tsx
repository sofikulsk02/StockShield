"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductWithInventory } from "../types";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | null>(null);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/products");
      if (!res.ok) {
        throw new Error(`Failed to fetch products: ${res.statusText}`);
      }
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching products");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReserveModal = (product: ProductWithInventory) => {
    setSelectedProduct(product);
    // Find the first warehouse with available stock
    const availableInv = product.inventories.find(
      (inv) => inv.totalUnits - inv.reservedUnits > 0
    );
    if (availableInv) {
      setSelectedInventoryId(availableInv.id);
    } else if (product.inventories.length > 0) {
      setSelectedInventoryId(product.inventories[0].id);
    }
    setQuantity(1);
    // Generate a random idempotency key for user convenience
    setIdempotencyKey(`idem-${Math.random().toString(36).substring(2, 9)}`);
    setModalError(null);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setModalError(null);
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryId) return;

    try {
      setIsSubmitting(true);
      setModalError(null);

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
          throw new Error("Conflict (409): Insufficient stock available. Another customer may have just reserved the units.");
        }
        throw new Error(data.error || `Failed to create reservation: ${res.status}`);
      }

      // Success - Redirect to reservation details page
      window.location.href = `/reservation/${data.reservationId}`;
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Inventory Dashboard</span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-1 text-white">
            Available Stock & Holds
          </h1>
          <p className="text-zinc-400 text-sm md:text-base mt-2 max-w-2xl">
            Monitor real-time product stock across warehouses. Reserve units temporarily to secure them for checkout. Expiry locks automatically release after 10 minutes.
          </p>
        </div>
        <button 
          onClick={fetchProducts}
          className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 self-start md:self-auto"
        >
          🔄 Refresh Status
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-card rounded-2xl p-6 h-96 animate-pulse flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-full h-40 bg-white/5 rounded-xl" />
                <div className="h-6 bg-white/5 rounded w-3/4" />
                <div className="h-4 bg-white/5 rounded w-1/2" />
              </div>
              <div className="h-10 bg-white/5 rounded w-full mt-4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-2xl text-zinc-500">
          No products found. Please seed the database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onReserveClick={handleOpenReserveModal} 
            />
          ))}
        </div>
      )}

      {/* Quick Reservation Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleCloseModal} />
          
          {/* Content */}
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden border border-white/10 z-10 shadow-2xl relative animate-scale-up p-6">
            <h3 className="text-xl font-bold text-white mb-2">Create Reservation</h3>
            <p className="text-zinc-400 text-xs mb-6">
              Reserving: <span className="text-white font-semibold">{selectedProduct.name}</span>
            </p>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleCreateReservation} className="space-y-4">
              {/* Select Warehouse */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Select Warehouse
                </label>
                <select
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {selectedProduct.inventories.map((inv) => {
                    const available = inv.totalUnits - inv.reservedUnits;
                    return (
                      <option key={inv.id} value={inv.id} disabled={available <= 0}>
                        {inv.warehouse.name} ({available} available)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Quantity to Reserve
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Idempotency Key — collapsed by default */}
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none select-none py-2 px-3 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-colors">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="text-zinc-600">⚙</span> Advanced Technical Details
                  </span>
                  <span className="text-zinc-600 text-xs transition-transform group-open:rotate-180">▾</span>
                </summary>
                <div className="mt-2 bg-white/2 p-3.5 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      Idempotency-Key Header
                    </label>
                    <button
                      type="button"
                      onClick={() => setIdempotencyKey(`idem-${Math.random().toString(36).substring(2, 9)}`)}
                      className="text-[10px] text-zinc-400 hover:text-white transition-colors"
                    >
                      🔄 Regenerate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={idempotencyKey}
                    onChange={(e) => setIdempotencyKey(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="Optional unique request key"
                  />
                  <span className="text-[9px] text-zinc-500 block leading-tight">
                    Sent as the <code className="text-indigo-400/70">Idempotency-Key</code> request header. Ensures duplicate clicks don't double-reserve — retrying with the same key returns the original response.
                  </span>
                </div>
              </details>

              {/* Buttons */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary flex-1 py-2.5 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedInventoryId}
                  className="btn-primary flex-1 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Locking Stock..." : "Confirm Hold"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
