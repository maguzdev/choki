import { roundMoney } from "./money";
import { assertFiniteInteger } from "./types";

export interface CartLine {
  productId: string;
  name: string;
  emoji: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export interface ComputedSaleItem extends CartLine {
  lineTotal: number;
  lineCost: number;
  lineMargin: number;
}

export interface SaleTotals {
  items: ComputedSaleItem[];
  itemsTotal: number;
  costTotal: number;
  marginTotal: number;
  unitsTotal: number;
}

export function computeSaleTotals(lines: readonly CartLine[]): SaleTotals {
  if (lines.length === 0) throw new Error("A sale requires at least one item");
  const items = lines.map((line) => {
    assertFiniteInteger(line.quantity, "quantity");
    assertFiniteInteger(line.unitPrice, "unitPrice");
    if (line.quantity <= 0) throw new Error("quantity must be positive");
    if (line.unitPrice < 0) throw new Error("unitPrice must be non-negative");
    if (!Number.isFinite(line.unitCost) || line.unitCost < 0) throw new Error("Invalid unitCost");
    const lineTotal = line.quantity * line.unitPrice;
    const lineCost = line.quantity * line.unitCost;
    return { ...line, lineTotal, lineCost, lineMargin: lineTotal - roundMoney(lineCost) };
  });
  const itemsTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const costTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
  return {
    items,
    itemsTotal,
    costTotal,
    marginTotal: itemsTotal - roundMoney(costTotal),
    unitsTotal: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export interface CashOutcome {
  changeExpected: number;
  tip: number;
}

export function computeCashOutcome(input: { itemsTotal: number; cashReceived: number; changeGiven: number }): CashOutcome {
  const { itemsTotal, cashReceived, changeGiven } = input;
  for (const [name, value] of Object.entries({ itemsTotal, cashReceived, changeGiven })) {
    assertFiniteInteger(value, name);
    if (value < 0) throw new Error(`${name} must be non-negative`);
  }
  if (cashReceived < itemsTotal) throw new Error("cashReceived cannot be below the total");
  const expectedChange = cashReceived - itemsTotal;
  if (changeGiven > expectedChange) throw new Error("changeGiven cannot exceed expected change");
  return { changeExpected: expectedChange, tip: expectedChange - changeGiven };
}

export function quickCashOptions(itemsTotal: number): number[] {
  assertFiniteInteger(itemsTotal, "itemsTotal");
  if (itemsTotal < 0) throw new Error("itemsTotal must be non-negative");
  const denominations = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000];
  const candidates = [itemsTotal, ...denominations.map((value) => Math.ceil(itemsTotal / value) * value)];
  return [...new Set(candidates)].sort((a, b) => a - b).slice(0, 5);
}
