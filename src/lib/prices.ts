export const SKU_PRICES: Record<string, number> = {
  "LAP-001": 49900,  // MacBook Air M3 - ₹49,900 (demo price)
  "LAP-002": 45000,  // Lenovo ThinkPad X1 Carbon - ₹45,000 (demo price)
  "MON-003": 32900,  // Dell UltraSharp 27-inch 4K Monitor - ₹32,900
  "BAG-004": 3499,   // Samsonite Laptop Backpack - ₹3,499
  "AUD-005": 24990,  // Sony WH-1000XM5 Headphones - ₹24,990
};

/**
 * Returns the price of a product SKU in INR.
 * Falls back to a default value if the SKU is not found.
 */
export function getProductPrice(sku: string): number {
  return SKU_PRICES[sku] || 4999;
}
