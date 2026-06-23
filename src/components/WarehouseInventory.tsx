import React from "react";

interface Warehouse {
  id: string;
  name: string;
  location: string;
}

interface Inventory {
  id: string;
  totalUnits: number;
  reservedUnits: number;
  warehouse: Warehouse;
}

interface WarehouseInventoryProps {
  inventory: Inventory;
}

export default function WarehouseInventory({ inventory }: WarehouseInventoryProps) {
  const available = inventory.totalUnits - inventory.reservedUnits;
  const pctReserved = (inventory.reservedUnits / inventory.totalUnits) * 100;

  return (
    <div className="space-y-1 bg-white/2 pt-2 px-3 pb-2.5 rounded-lg border border-white/2">
      <div className="flex justify-between items-center text-xs">
        <span className="font-semibold text-zinc-300 truncate max-w-[120px]" title={inventory.warehouse.name}>
          {inventory.warehouse.name.replace(" Warehouse", "").replace(" Center", "").replace(" Hub", "")}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Avail:</span>
          <span className={`font-bold ${available > 0 ? "text-indigo-400" : "text-zinc-500"}`}>
            {available}
          </span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400 font-medium">{inventory.totalUnits}</span>
        </div>
      </div>
      
      {/* Stock Bar */}
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
        {inventory.reservedUnits > 0 && (
          <div 
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${pctReserved}%` }}
          />
        )}
        <div 
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${100 - pctReserved}%` }}
        />
      </div>

      {/* Active Reservations Notification */}
      {inventory.reservedUnits > 0 && (
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-amber-400 font-medium">
          <span className="pulse-dot pulse-dot-pending" />
          <span>{inventory.reservedUnits} held in pending checkout</span>
        </div>
      )}
    </div>
  );
}
