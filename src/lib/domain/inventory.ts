import { roundMoney } from "./money";
import { assertFiniteInteger } from "./types";

export interface PurchaseOutcome {
  stock: number;
  avgCost: number;
  unitCost: number;
}

export function canApplyStockAdjustment(stock: number, quantityDelta: number): boolean {
  assertFiniteInteger(stock, "stock");
  assertFiniteInteger(quantityDelta, "quantityDelta");
  return quantityDelta >= 0 || stock + quantityDelta >= 0;
}

export function applyPurchase(
  current: { stock: number; avgCost: number },
  purchase: { quantity: number; totalCost: number },
): PurchaseOutcome {
  assertFiniteInteger(current.stock, "stock");
  assertFiniteInteger(purchase.quantity, "quantity");
  if (purchase.quantity <= 0) throw new Error("quantity must be positive");
  if (!Number.isFinite(current.avgCost) || current.avgCost < 0) throw new Error("Invalid avgCost");
  if (!Number.isFinite(purchase.totalCost) || purchase.totalCost < 0) throw new Error("Invalid totalCost");

  const baseStock = Math.max(current.stock, 0);
  const unitCost = purchase.totalCost / purchase.quantity;
  const avgCost = current.avgCost === 0
    ? unitCost
    : (baseStock * current.avgCost + purchase.totalCost) / (baseStock + purchase.quantity);
  const toCents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  return { stock: current.stock + purchase.quantity, avgCost: toCents(avgCost), unitCost: toCents(unitCost) };
}

export function purchaseTotal(quantity: number, unitCost: number): number {
  return roundMoney(quantity * unitCost);
}
