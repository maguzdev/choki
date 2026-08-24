import { assertFiniteInteger } from "./types";

export function round(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new Error("Money values must be finite and non-negative");
  return Math.floor(value + 0.5);
}

export const roundMoney = round;

export function formatCOP(value: number): string {
  assertFiniteInteger(value, "value");
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function distribute(total: number, weights: readonly number[]): number[] {
  assertFiniteInteger(total, "total");
  if (total < 0) throw new Error("total must be non-negative");
  if (weights.length === 0) {
    if (total === 0) return [];
    throw new Error("At least one weight is required");
  }
  if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) throw new Error("Invalid weight");
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightTotal <= 0) {
    if (total === 0) return weights.map(() => 0);
    throw new Error("At least one weight must be positive");
  }
  const exact = weights.map((weight) => (total * weight) / weightTotal);
  const result = exact.map(Math.floor);
  const missing = total - result.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < missing; index += 1) {
    const target = order[index];
    if (!target) throw new Error("Unable to distribute remainder");
    result[target.index] = (result[target.index] ?? 0) + 1;
  }
  return result;
}
