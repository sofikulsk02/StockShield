import { db } from "../lib/db";
import { ProductWithInventory, Warehouse } from "../types";

export class InventoryRepository {
  async getProductsWithAvailableStock(): Promise<ProductWithInventory[]> {
    return db.product.findMany({
      include: {
        inventories: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async getProductById(id: string): Promise<ProductWithInventory | null> {
    return db.product.findUnique({
      where: { id },
      include: {
        inventories: {
          include: {
            warehouse: true,
          },
        },
      },
    });
  }

  async getInventoryById(id: string) {
    return db.inventory.findUnique({
      where: { id },
      include: {
        product: true,
        warehouse: true,
      },
    });
  }

  async getWarehouses(): Promise<Warehouse[]> {
    return db.warehouse.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }

  /**
   * Concurrency-safe atomic increment of reservedUnits.
   * Uses raw SQL UPDATE to guarantee atomic validation & increment in Postgres.
   * Returns true if the update succeeded (enough stock), false otherwise.
   */
  async incrementReservedUnits(
    inventoryId: string,
    quantity: number,
    tx: any
  ): Promise<boolean> {
    const rowsAffected = await tx.$executeRaw`
      UPDATE "Inventory"
      SET "reservedUnits" = "reservedUnits" + ${quantity}
      WHERE "id" = ${inventoryId} AND ("totalUnits" - "reservedUnits") >= ${quantity}
    `;
    return rowsAffected > 0;
  }

  /**
   * Decrements only reservedUnits (used when releasing a reservation).
   */
  async decrementReservedUnits(
    inventoryId: string,
    quantity: number,
    tx: any
  ): Promise<void> {
    await tx.inventory.update({
      where: { id: inventoryId },
      data: {
        reservedUnits: {
          decrement: quantity,
        },
      },
    });
  }

  /**
   * Decrements both totalUnits and reservedUnits (used when confirming purchase).
   */
  async decrementTotalAndReservedUnits(
    inventoryId: string,
    quantity: number,
    tx: any
  ): Promise<void> {
    await tx.inventory.update({
      where: { id: inventoryId },
      data: {
        totalUnits: {
          decrement: quantity,
        },
        reservedUnits: {
          decrement: quantity,
        },
      },
    });
  }
}

export const inventoryRepository = new InventoryRepository();
