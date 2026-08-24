import { allocateEarnings, type EarningSeller, type SplitRule } from "./earnings";
import { xpAndPointsForSale, type AchievementReward, type GamificationRule } from "./gamification";
import { computeCashOutcome, computeSaleTotals, type CartLine } from "./sale";
import { createEarningMovement, type SavingSetting } from "./savings";
import type { StreakResult } from "./streak";
import type { IdFactory, TableRow } from "./types";
import { assertFiniteInteger, assertIsoDate } from "./types";

export interface StockedCartLine extends CartLine {
  stock: number;
}

export interface NotificationDraft {
  profileId: string;
  type: string;
  title: string;
  body?: string | null;
  icon?: string;
  referenceType?: string | null;
  referenceId?: string | null;
}

export interface ChallengeProgressDraft {
  id?: string;
  challengeId: string;
  childId: string;
  currentValue: number;
  completedAt: string | null;
  rewarded: boolean;
  grantReward?: boolean;
  xpReward?: number;
  pointsReward?: number;
}

export interface StreakPayload {
  child_id: string | null;
  days: TableRow<"streak_days">[];
  state: TableRow<"child_streaks">[];
}

export interface SaleCommitPayload {
  sale: TableRow<"sales">[];
  items: TableRow<"sale_items">[];
  inventory: TableRow<"inventory_movements">[];
  allocations: TableRow<"earning_allocations">[];
  money: TableRow<"money_movements">[];
  xp: TableRow<"xp_movements">[];
  points: TableRow<"point_movements">[];
  unlocks: TableRow<"achievement_unlocks">[];
  notifications: TableRow<"notifications">[];
  stock_deltas: { product_id: string; delta: number }[];
  challenges: TableRow<"challenge_progress">[];
  streaks: StreakPayload;
}

function streakPayload(
  childId: string | null,
  result: StreakResult | undefined,
  today: string,
  createdAt: string,
): StreakPayload {
  if (!childId) return { child_id: null, days: [], state: [] };
  if (!result) throw new Error("A child sale requires a replayed streak");
  return {
    child_id: childId,
    days: result.days.map((day) => ({
      child_id: childId,
      local_date: day.date,
      sales_count: day.salesCount,
      status: day.status,
    })),
    state: [{
      child_id: childId,
      current_streak: result.currentStreak,
      best_streak: result.bestStreak,
      protectors_available: result.protectorsAvailable,
      last_activity_date: result.lastActivityDate,
      last_evaluated_date: today,
      updated_at: createdAt,
    }],
  };
}

function notifications(
  drafts: readonly NotificationDraft[],
  idFactory: IdFactory,
  createdAt: string,
): TableRow<"notifications">[] {
  return drafts.map((draft) => ({
    id: idFactory(),
    profile_id: draft.profileId,
    type: draft.type,
    title: draft.title,
    body: draft.body ?? null,
    icon: draft.icon ?? "🔔",
    reference_type: draft.referenceType ?? null,
    reference_id: draft.referenceId ?? null,
    read_at: null,
    created_at: createdAt,
  }));
}

export function buildSaleCommitPayload(input: {
  idFactory: IdFactory;
  saleId: string;
  seller: EarningSeller;
  lines: readonly StockedCartLine[];
  paymentMethod: "CASH" | "TRANSFER";
  cashReceived?: number;
  changeGiven?: number;
  transferTip?: number;
  soldAt: string;
  localDate: string;
  note?: string | null;
  splitRules?: readonly SplitRule[];
  savingSettings: Readonly<Record<string, SavingSetting>>;
  gamificationRules?: readonly GamificationRule[];
  achievementRewards?: readonly AchievementReward[];
  challengeProgress?: readonly ChallengeProgressDraft[];
  streak?: StreakResult;
  notifications?: readonly NotificationDraft[];
}): SaleCommitPayload {
  assertIsoDate(input.localDate, "localDate");
  const insufficientStock = input.lines.find((line) => line.quantity > line.stock);
  if (insufficientStock) {
    throw new Error(`Insufficient stock for product ${insufficientStock.productId}`);
  }
  const totals = computeSaleTotals(input.lines);
  let cashReceived: number | null = null;
  let changeGiven: number | null = null;
  let tipTotal = 0;
  if (input.paymentMethod === "CASH") {
    if (input.cashReceived === undefined) throw new Error("cashReceived is required for cash sales");
    const confirmedChange = input.changeGiven ?? Math.max(0, input.cashReceived - totals.itemsTotal);
    const outcome = computeCashOutcome({ itemsTotal: totals.itemsTotal, cashReceived: input.cashReceived, changeGiven: confirmedChange });
    cashReceived = input.cashReceived;
    changeGiven = confirmedChange;
    tipTotal = outcome.tip;
  } else {
    tipTotal = input.transferTip ?? 0;
    assertFiniteInteger(tipTotal, "transferTip");
    if (tipTotal < 0) throw new Error("transferTip must be non-negative");
  }

  const allocationDrafts = allocateEarnings({
    saleId: input.saleId,
    sellerId: input.seller.id,
    sellerType: input.seller.type,
    marginTotal: totals.marginTotal,
    tipTotal,
    splitRules: input.splitRules ?? [],
  });
  const allocations: TableRow<"earning_allocations">[] = allocationDrafts.map((allocation) => ({
    ...allocation,
    id: input.idFactory(),
    created_at: input.soldAt,
    reversed: false,
  }));
  const money = allocations.map((allocation) => {
    const setting = input.savingSettings[allocation.child_id];
    if (!setting) throw new Error(`Missing saving settings for child ${allocation.child_id}`);
    return createEarningMovement({
      idFactory: input.idFactory,
      childId: allocation.child_id,
      createdBy: input.seller.id,
      createdAt: input.soldAt,
      localDate: input.localDate,
      description: input.seller.type === "CHILD" ? "Ganancia por venta propia" : "Participación en venta familiar",
      saleId: input.saleId,
      amount: allocation.total_amount,
      setting,
    });
  });

  const sale: TableRow<"sales"> = {
    id: input.saleId,
    seller_id: input.seller.id,
    seller_type: input.seller.type,
    sold_at: input.soldAt,
    local_date: input.localDate,
    payment_method: input.paymentMethod,
    items_total: totals.itemsTotal,
    cost_total: totals.costTotal,
    margin_total: totals.marginTotal,
    cash_received: cashReceived,
    change_given: changeGiven,
    tip_total: tipTotal,
    earnings_total: totals.marginTotal + tipTotal,
    units_total: totals.unitsTotal,
    status: "COMPLETED",
    note: input.note ?? null,
    voided_at: null,
    voided_by: null,
    void_reason: null,
    created_at: input.soldAt,
  };
  const items: TableRow<"sale_items">[] = totals.items.map((item) => ({
    id: input.idFactory(), sale_id: input.saleId, product_id: item.productId,
    product_name: item.name, product_emoji: item.emoji,
    quantity: item.quantity, unit_price: item.unitPrice, unit_cost: item.unitCost,
    line_total: item.lineTotal, line_cost: item.lineCost, line_margin: item.lineMargin,
  }));
  const inventory: TableRow<"inventory_movements">[] = input.lines.map((line) => ({
    id: input.idFactory(), product_id: line.productId, type: "SALE",
    quantity_delta: -line.quantity, reason: null, reference_type: "SALE",
    reference_id: input.saleId, stock_after: line.stock - line.quantity,
    note: null, created_by: input.seller.id, created_at: input.soldAt, local_date: input.localDate,
  }));

  const childId = input.seller.type === "CHILD" ? input.seller.id : null;
  const baseRewards = childId
    ? xpAndPointsForSale({ unitsTotal: totals.unitsTotal }, input.gamificationRules ?? [])
    : { xp: [], points: [] };
  const achievementRewards = childId ? [...(input.achievementRewards ?? [])] : [];
  const challengeRewards = childId
    ? (input.challengeProgress ?? []).filter((challenge) => challenge.childId === childId && challenge.grantReward)
    : [];
  const xpDrafts = [
    ...baseRewards.xp.map((draft) => ({ ...draft, referenceType: "SALE", referenceId: input.saleId })),
    ...achievementRewards.filter((reward) => reward.xp !== 0).map((reward) => ({ amount: reward.xp, reason: "ACHIEVEMENT", description: "Logro desbloqueado", referenceType: "ACHIEVEMENT", referenceId: reward.achievementId })),
    ...challengeRewards.filter((reward) => (reward.xpReward ?? 0) !== 0).map((reward) => ({ amount: reward.xpReward ?? 0, reason: "CHALLENGE", description: "Reto completado", referenceType: "CHALLENGE", referenceId: reward.challengeId })),
  ];
  const pointDrafts = [
    ...baseRewards.points.map((draft) => ({ ...draft, referenceType: "SALE", referenceId: input.saleId })),
    ...achievementRewards.filter((reward) => reward.points !== 0).map((reward) => ({ amount: reward.points, reason: "ACHIEVEMENT", description: "Logro desbloqueado", referenceType: "ACHIEVEMENT", referenceId: reward.achievementId })),
    ...challengeRewards.filter((reward) => (reward.pointsReward ?? 0) !== 0).map((reward) => ({ amount: reward.pointsReward ?? 0, reason: "CHALLENGE", description: "Reto completado", referenceType: "CHALLENGE", referenceId: reward.challengeId })),
  ];
  const toRows = (drafts: typeof xpDrafts): TableRow<"xp_movements">[] => drafts.map((draft) => ({
    id: input.idFactory(), child_id: childId!, amount: draft.amount,
    reason: draft.reason === "SALE_COMPLETED" ? "SALE" : draft.reason === "UNIT_SOLD" ? "UNITS" : draft.reason,
    reference_type: draft.referenceType, reference_id: draft.referenceId,
    description: draft.description, created_at: input.soldAt,
  }));

  return {
    sale: [sale], items, inventory, allocations, money,
    xp: toRows(xpDrafts),
    points: toRows(pointDrafts),
    unlocks: achievementRewards.map((reward) => ({
      id: input.idFactory(), achievement_id: reward.achievementId,
      child_id: childId!, unlocked_at: input.soldAt,
    })),
    notifications: notifications(input.notifications ?? [], input.idFactory, input.soldAt),
    stock_deltas: input.lines.map((line) => ({ product_id: line.productId, delta: -line.quantity })),
    challenges: (input.challengeProgress ?? []).map((challenge) => ({
      id: challenge.id ?? input.idFactory(), challenge_id: challenge.challengeId,
      child_id: challenge.childId, current_value: challenge.currentValue,
      completed_at: challenge.completedAt, rewarded: challenge.rewarded, updated_at: input.soldAt,
    })),
    streaks: streakPayload(childId, input.streak, input.localDate, input.soldAt),
  };
}

export interface SaleVoidPayload {
  sale: { id: string; voided_at: string; voided_by: string; void_reason: string };
  inventory: TableRow<"inventory_movements">[];
  money: TableRow<"money_movements">[];
  xp: TableRow<"xp_movements">[];
  points: TableRow<"point_movements">[];
  notifications: TableRow<"notifications">[];
  stock_deltas: { product_id: string; delta: number }[];
  challenges: TableRow<"challenge_progress">[];
  streaks: StreakPayload;
}

export function buildSaleVoidPayload(input: {
  idFactory: IdFactory;
  sale: TableRow<"sales">;
  items: readonly TableRow<"sale_items">[];
  allocations: readonly TableRow<"earning_allocations">[];
  originalMoney: readonly TableRow<"money_movements">[];
  originalXp: readonly TableRow<"xp_movements">[];
  originalPoints: readonly TableRow<"point_movements">[];
  stockByProduct: Readonly<Record<string, number>>;
  voidedAt: string;
  voidedBy: string;
  voidReason: string;
  localDate: string;
  challengeProgress?: readonly ChallengeProgressDraft[];
  streak?: StreakResult;
  notifications?: readonly NotificationDraft[];
}): SaleVoidPayload {
  if (input.sale.status !== "COMPLETED") throw new Error("Only completed sales can be voided");
  if (!input.voidReason.trim()) throw new Error("voidReason is required");
  assertIsoDate(input.localDate, "localDate");
  const inventory = input.items.map((item) => {
    const stock = input.stockByProduct[item.product_id];
    if (stock === undefined) throw new Error(`Missing stock for product ${item.product_id}`);
    return {
      id: input.idFactory(), product_id: item.product_id, type: "SALE_VOID",
      quantity_delta: item.quantity, reason: null, reference_type: "SALE",
      reference_id: input.sale.id, stock_after: stock + item.quantity,
      note: input.voidReason.trim(), created_by: input.voidedBy,
      created_at: input.voidedAt, local_date: input.localDate,
    } satisfies TableRow<"inventory_movements">;
  });
  const money = input.allocations.map((allocation) => {
    const original = input.originalMoney.find((movement) =>
      movement.child_id === allocation.child_id && movement.reference_id === input.sale.id && movement.type === "EARNING");
    if (!original) throw new Error(`Missing earning movement for child ${allocation.child_id}`);
    return {
      ...original,
      id: input.idFactory(), created_at: input.voidedAt, created_by: input.voidedBy,
      local_date: input.localDate, type: "EARNING_REVERSAL",
      description: `Anulación: ${original.description}`,
      earning_amount: -original.earning_amount,
      available_delta: -original.available_delta,
      savings_delta: -original.savings_delta,
      goal_delta: -original.goal_delta,
    };
  });
  const reverseScore = <T extends TableRow<"xp_movements"> | TableRow<"point_movements">>(movement: T): T => ({
    ...movement,
    id: input.idFactory(), amount: -movement.amount, reason: "SALE_VOID",
    description: `Anulación: ${movement.description}`, created_at: input.voidedAt,
  });
  const originalForSale = <T extends { reference_id: string | null }>(rows: readonly T[]) =>
    rows.filter((row) => row.reference_id === input.sale.id);
  const childId = input.sale.seller_type === "CHILD" ? input.sale.seller_id : null;
  return {
    sale: { id: input.sale.id, voided_at: input.voidedAt, voided_by: input.voidedBy, void_reason: input.voidReason.trim() },
    inventory,
    money,
    xp: originalForSale(input.originalXp).map(reverseScore),
    points: originalForSale(input.originalPoints).map(reverseScore),
    notifications: notifications(input.notifications ?? [], input.idFactory, input.voidedAt),
    stock_deltas: input.items.map((item) => ({ product_id: item.product_id, delta: item.quantity })),
    challenges: (input.challengeProgress ?? []).map((challenge) => ({
      id: challenge.id ?? input.idFactory(), challenge_id: challenge.challengeId,
      child_id: challenge.childId, current_value: challenge.currentValue,
      completed_at: challenge.completedAt, rewarded: challenge.rewarded, updated_at: input.voidedAt,
    })),
    streaks: streakPayload(childId, input.streak, input.localDate, input.voidedAt),
  };
}
