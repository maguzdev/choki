import { distribute } from "./money";
import { assertFiniteInteger } from "./types";

export interface SplitRule {
  childId: string;
  percent: number;
  sortOrder: number;
}

export interface EarningAllocationDraft {
  child_id: string;
  sale_id: string;
  margin_amount: number;
  tip_amount: number;
  total_amount: number;
  share_percent: number | null;
  source: "OWN_SALE" | "FAMILY_SHARE";
}

export type EarningSeller = { id: string; type: "CHILD" | "PARENT" };

function distributeSigned(total: number, weights: readonly number[]): number[] {
  const sign = total < 0 ? -1 : 1;
  return distribute(Math.abs(total), weights).map((value) => value * sign);
}

export function allocateEarnings(input: {
  saleId: string;
  sellerId: string;
  sellerType: "CHILD" | "PARENT";
  marginTotal: number;
  tipTotal: number;
  splitRules: readonly { childId: string; percent: number; sortOrder: number }[];
}): EarningAllocationDraft[] {
  const { saleId, sellerId, sellerType, marginTotal, tipTotal } = input;
  assertFiniteInteger(marginTotal, "marginTotal");
  assertFiniteInteger(tipTotal, "tipTotal");
  if (tipTotal < 0) throw new Error("tipTotal must be non-negative");

  if (sellerType === "CHILD") {
    return [{
      child_id: sellerId,
      sale_id: saleId,
      margin_amount: marginTotal,
      tip_amount: tipTotal,
      total_amount: marginTotal + tipTotal,
      share_percent: null,
      source: "OWN_SALE",
    }];
  }

  if (input.splitRules.length === 0) throw new Error("A parent sale requires split rules");
  const sorted = [...input.splitRules].sort((a, b) => a.sortOrder - b.sortOrder || a.childId.localeCompare(b.childId));
  if (sorted.some((rule) => !Number.isFinite(rule.percent) || rule.percent < 0)) {
    throw new Error("Invalid share percent");
  }
  const percentTotal = sorted.reduce((sum, rule) => sum + rule.percent, 0);
  if (Math.abs(percentTotal - 100) > 0.000_001) throw new Error("Split percentages must total 100");

  const weights = sorted.map((rule) => rule.percent);
  const margins = distributeSigned(marginTotal, weights);
  const tips = distribute(tipTotal, weights);
  return sorted.map((rule, index) => {
    const margin = margins[index];
    const tip = tips[index];
    if (margin === undefined || tip === undefined) throw new Error("Unable to allocate earnings");
    return {
      child_id: rule.childId, sale_id: saleId, margin_amount: margin, tip_amount: tip,
      total_amount: margin + tip, share_percent: rule.percent, source: "FAMILY_SHARE",
    };
  });
}
