import { Product, Warehouse, Inventory, Reservation, ReservationStatus, ReleaseReason } from "@prisma/client";

export interface IdempotencyRecord {
  statusCode: number;
  body: any;
}

export type InventoryWithWarehouse = Inventory & {
  warehouse: Warehouse;
};

export type ProductWithInventory = Product & {
  inventories: (Inventory & {
    warehouse: Warehouse;
  })[];
};

export type ReservationWithDetails = Reservation & {
  inventory: Inventory & {
    product: Product;
    warehouse: Warehouse;
  };
};

export type { Product, Warehouse, Inventory, Reservation, ReservationStatus, ReleaseReason };
