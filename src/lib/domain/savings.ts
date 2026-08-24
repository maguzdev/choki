import { roundMoney } from "./money";
import type { IdFactory, TableRow } from "./types";
import { assertFiniteInteger, assertIsoDate } from "./types";

export interface SavingSetting {
  enabled: boolean;
  percent: number;
}

export interface EarningSplit {
  toAvailable: number;
  toSavings: number;
}

export function splitEarning(amount: number, setting: SavingSetting): EarningSplit {
  assertFiniteInteger(amount, "amount");
  if (amount < 0) throw new Error("amount must be non-negative");
  if (!Number.isFinite(setting.percent) || setting.percent < 0 || setting.percent > 100) {
    throw new Error("percent must be between 0 and 100");
  }
  const savings = setting.enabled ? roundMoney((amount * setting.percent) / 100) : 0;
  return { toSavings: savings, toAvailable: amount - savings };
}

interface MovementBase {
  idFactory: IdFactory;
  childId: string;
  createdBy: string;
  createdAt: string;
  localDate: string;
  description: string;
}

export function createEarningMovement(input: MovementBase & {
  saleId: string;
  amount: number;
  setting: SavingSetting;
}): TableRow<"money_movements"> {
  assertIsoDate(input.localDate, "localDate");
  const split = splitEarning(input.amount, input.setting);
  return {
    id: input.idFactory(),
    child_id: input.childId,
    created_by: input.createdBy,
    created_at: input.createdAt,
    local_date: input.localDate,
    description: input.description,
    earning_amount: input.amount,
    available_delta: split.toAvailable,
    savings_delta: split.toSavings,
    goal_delta: 0,
    goal_id: null,
    reference_id: input.saleId,
    reference_type: "SALE",
    type: "EARNING",
  };
}

export function createGoalContributionMovement(input: MovementBase & {
  goalId: string;
  amount: number;
  source: "AVAILABLE" | "SAVINGS";
  sourceBalance: number;
}): TableRow<"money_movements"> {
  assertFiniteInteger(input.amount, "amount");
  assertFiniteInteger(input.sourceBalance, "sourceBalance");
  if (input.amount <= 0) throw new Error("amount must be positive");
  if (input.amount > input.sourceBalance) throw new Error("Insufficient source balance");
  assertIsoDate(input.localDate, "localDate");
  return {
    id: input.idFactory(), child_id: input.childId, created_by: input.createdBy,
    created_at: input.createdAt, local_date: input.localDate, description: input.description,
    earning_amount: 0,
    available_delta: input.source === "AVAILABLE" ? -input.amount : 0,
    savings_delta: input.source === "SAVINGS" ? -input.amount : 0,
    goal_delta: input.amount, goal_id: input.goalId, reference_id: input.goalId,
    reference_type: "GOAL", type: "GOAL_CONTRIBUTION",
  };
}

export function createSavingMovement(input: MovementBase & {
  direction: "IN" | "OUT";
  amount: number;
  sourceBalance: number;
}): TableRow<"money_movements"> {
  assertFiniteInteger(input.amount, "amount");
  assertFiniteInteger(input.sourceBalance, "sourceBalance");
  if (input.amount <= 0) throw new Error("amount must be positive");
  if (input.amount > input.sourceBalance) throw new Error("Insufficient source balance");
  assertIsoDate(input.localDate, "localDate");
  const toSavings = input.direction === "IN";
  return {
    id: input.idFactory(), child_id: input.childId, created_by: input.createdBy,
    created_at: input.createdAt, local_date: input.localDate, description: input.description,
    earning_amount: 0, available_delta: toSavings ? -input.amount : input.amount,
    savings_delta: toSavings ? input.amount : -input.amount, goal_delta: 0,
    goal_id: null, reference_id: null, reference_type: null,
    type: toSavings ? "SAVING_IN" : "SAVING_OUT",
  };
}

export function createGoalExitMovement(input: MovementBase & {
  goalId: string;
  action: "TO_AVAILABLE" | "TO_SAVINGS" | "SPEND";
  amount: number;
  goalBalance: number;
}): TableRow<"money_movements"> {
  assertFiniteInteger(input.amount, "amount");
  assertFiniteInteger(input.goalBalance, "goalBalance");
  if (input.amount <= 0) throw new Error("amount must be positive");
  if (input.amount > input.goalBalance) throw new Error("Insufficient goal balance");
  assertIsoDate(input.localDate, "localDate");
  return {
    id: input.idFactory(), child_id: input.childId, created_by: input.createdBy,
    created_at: input.createdAt, local_date: input.localDate, description: input.description,
    earning_amount: 0,
    available_delta: input.action === "TO_AVAILABLE" ? input.amount : 0,
    savings_delta: input.action === "TO_SAVINGS" ? input.amount : 0,
    goal_delta: -input.amount, goal_id: input.goalId, reference_id: input.goalId,
    reference_type: "GOAL", type: input.action === "SPEND" ? "GOAL_SPEND" : "GOAL_OUT",
  };
}

export function createAdjustmentMovement(input: MovementBase & {
  earningDelta: number;
  availableDelta: number;
  savingsDelta: number;
  goalDelta: number;
  goalId?: string | null;
}): TableRow<"money_movements"> {
  for (const [name, value] of Object.entries({
    earningDelta: input.earningDelta,
    availableDelta: input.availableDelta,
    savingsDelta: input.savingsDelta,
    goalDelta: input.goalDelta,
  })) assertFiniteInteger(value, name);
  assertIsoDate(input.localDate, "localDate");
  return {
    id: input.idFactory(), child_id: input.childId, created_by: input.createdBy,
    created_at: input.createdAt, local_date: input.localDate, description: input.description,
    earning_amount: input.earningDelta, available_delta: input.availableDelta,
    savings_delta: input.savingsDelta, goal_delta: input.goalDelta,
    goal_id: input.goalId ?? null, reference_id: input.goalId ?? null,
    reference_type: input.goalId ? "GOAL" : "MANUAL", type: "ADJUSTMENT",
  };
}

export function createWithdrawalMovement(input: MovementBase & {
  amount: number;
  availableBalance: number;
}): TableRow<"money_movements"> {
  assertFiniteInteger(input.amount, "amount");
  assertFiniteInteger(input.availableBalance, "availableBalance");
  if (input.amount <= 0) throw new Error("amount must be positive");
  if (input.amount > input.availableBalance) throw new Error("Insufficient available balance");
  assertIsoDate(input.localDate, "localDate");
  return {
    id: input.idFactory(), child_id: input.childId, created_by: input.createdBy,
    created_at: input.createdAt, local_date: input.localDate, description: input.description,
    earning_amount: 0,
    available_delta: -input.amount,
    savings_delta: 0,
    goal_delta: 0,
    goal_id: null,
    reference_id: null,
    reference_type: null,
    type: "WITHDRAWAL",
  };
}
