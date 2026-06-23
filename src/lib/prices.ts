export const SKU_PRICES: Record<string, number> = {
  "LAP-001": 10000,   // MacBook Air M3 — test price ₹5
  "LAP-002": 4000,   // Lenovo ThinkPad X1 Carbon — test price ₹4
  "MON-003": 3000,   // Dell UltraSharp 27-inch 4K Monitor — test price ₹3
  "BAG-004": 2000,   // Samsonite Laptop Backpack — test price ₹2
  "AUD-005": 1000,   // Sony WH-1000XM5 Headphones — test price ₹1
};

/**
 * Returns the price of a product SKU in INR.
 * Falls back to a default value if the SKU is not found.
 */
export function getProductPrice(sku: string): number {
  return SKU_PRICES[sku] || 4999;
}
