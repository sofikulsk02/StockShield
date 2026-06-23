import { inventoryRepository } from "../repositories/inventory.repository";
import { ProductWithInventory, Warehouse } from "../types";

export class InventoryService {
  async getProducts(): Promise<ProductWithInventory[]> {
    return inventoryRepository.getProductsWithAvailableStock();
  }

  async getProductById(id: string): Promise<ProductWithInventory | null> {
    return inventoryRepository.getProductById(id);
  }

  async getWarehouses(): Promise<Warehouse[]> {
    return inventoryRepository.getWarehouses();
  }
}

export const inventoryService = new InventoryService();
