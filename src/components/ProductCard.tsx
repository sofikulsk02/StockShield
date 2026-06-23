import React from "react";
import Link from "next/link";
import { ProductWithInventory } from "../types";
import WarehouseInventory from "./WarehouseInventory";

interface ProductCardProps {
  product: ProductWithInventory;
  onReserveClick: (product: ProductWithInventory) => void;
}

export default function ProductCard({ product, onReserveClick }: ProductCardProps) {
  const hasStock = product.inventories.some(
    (inv) => inv.totalUnits - inv.reservedUnits > 0
  );

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col justify-between overflow-hidden relative">
      <div>
        {/* Product Image */}
        <div className="relative w-full h-44 rounded-xl overflow-hidden mb-5 bg-zinc-950 flex items-center justify-center border border-white/5">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <span className="text-4xl">📦</span>
          )}
          <span className="absolute top-3 right-3 text-xs bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-zinc-300 font-mono">
            {product.sku}
          </span>
        </div>

        {/* Title & SKU */}
        <Link href={`/product/${product.id}`} className="block group">
          <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-zinc-400 text-xs mt-1.5 line-clamp-2 min-h-[2rem]">
          {product.description || "No description available."}
        </p>

        {/* Warehouses Info */}
        <div className="mt-6 space-y-4 border-t border-white/5 pt-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Warehouse Stock levels</span>
          {product.inventories.length === 0 ? (
            <p className="text-zinc-500 text-xs italic">No warehouses assigned.</p>
          ) : (
            product.inventories.map((inv) => (
              <WarehouseInventory key={inv.id} inventory={inv} />
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <Link 
          href={`/product/${product.id}`}
          className="btn-secondary flex-1 py-2.5 rounded-xl text-xs font-semibold text-center"
        >
          View Details
        </Link>
        <button
          disabled={!hasStock}
          onClick={() => onReserveClick(product)}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-center ${
            hasStock 
              ? "btn-primary" 
              : "bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed"
          }`}
        >
          {hasStock ? "Quick Reserve" : "Out of Stock"}
        </button>
      </div>
    </div>
  );
}
