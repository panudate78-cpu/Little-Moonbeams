export function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateOrderNumber(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate()
  ).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `LM-${ymd}-${rand}`;
}

export const FREE_SHIPPING_THRESHOLD = 5000; // £50
export const STANDARD_SHIPPING = 395; // £3.95
export const TAX_RATE = 0.2; // 20% VAT (included in prices)

export function calcShipping(subtotalAfterDiscount: number): number {
  if (subtotalAfterDiscount <= 0) return 0;
  return subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
}

/** VAT portion included in a gross amount */
export function includedTax(gross: number): number {
  return Math.round(gross - gross / (1 + TAX_RATE));
}

export function effectivePrice(product: { price: number; salePrice: number | null }): number {
  return product.salePrice !== null && product.salePrice < product.price
    ? product.salePrice
    : product.price;
}
