import { assertFiniteInteger } from "./types";

export interface MovementDraft {
  amount: number;
  reason: string;
  description: string;
}

export interface GamificationRule {
  event: "SALE_COMPLETED" | "UNIT_SOLD";
  xp: number;
  points: number;
  active: boolean;
}

export function xpAndPointsForSale(
  sale: { unitsTotal: number },
  rules: readonly GamificationRule[],
): { xp: MovementDraft[]; points: MovementDraft[] } {
  assertFiniteInteger(sale.unitsTotal, "unitsTotal");
  if (sale.unitsTotal < 0) throw new Error("unitsTotal must be non-negative");
  const xp: MovementDraft[] = [];
  const points: MovementDraft[] = [];

  for (const rule of rules) {
    if (!rule.active) continue;
    const multiplier = rule.event === "UNIT_SOLD" ? sale.unitsTotal : 1;
    const description = rule.event === "UNIT_SOLD"
      ? `${sale.unitsTotal} productos vendidos`
      : "Venta completada";
    if (rule.xp !== 0) xp.push({ amount: rule.xp * multiplier, reason: rule.event, description });
    if (rule.points !== 0) points.push({ amount: rule.points * multiplier, reason: rule.event, description });
  }
  return { xp, points };
}

export interface Level {
  id: string;
  number: number;
  name: string;
  xpRequired: number;
}

export interface LevelProgress {
  current: Level;
  next: Level | null;
  xpIntoLevel: number;
  xpForNext: number | null;
  percent: number;
}

export function levelFor(xp: number, levels: readonly Level[]): LevelProgress {
  assertFiniteInteger(xp, "xp");
  if (levels.length === 0) throw new Error("At least one level is required");
  const sorted = [...levels].sort((a, b) => a.number - b.number || a.xpRequired - b.xpRequired);
  const first = sorted.at(0);
  if (!first) throw new Error("At least one level is required");
  const current = [...sorted].reverse().find((level) => level.xpRequired <= xp) ?? first;
  const currentIndex = sorted.findIndex((level) => level.id === current.id);
  const next = sorted[currentIndex + 1] ?? null;
  if (!next) {
    return { current, next: null, xpIntoLevel: Math.max(0, xp - current.xpRequired), xpForNext: null, percent: 100 };
  }
  if (xp < current.xpRequired) {
    return { current, next, xpIntoLevel: 0, xpForNext: next.xpRequired - current.xpRequired, percent: 0 };
  }
  const xpIntoLevel = xp - current.xpRequired;
  const xpForNext = next.xpRequired - current.xpRequired;
  return { current, next, xpIntoLevel, xpForNext, percent: Math.min(100, Math.max(0, (xpIntoLevel / xpForNext) * 100)) };
}

export interface ChildStats {
  totalSales: number;
  totalUnits: number;
  totalProfit: number;
  bestStreak: number;
  productUnits: Readonly<Record<string, number>>;
  goalsCompleted: number;
}

export type AchievementCondition =
  | "TOTAL_SALES" | "TOTAL_UNITS" | "TOTAL_PROFIT" | "STREAK_DAYS" | "PRODUCT_UNITS" | "GOALS_COMPLETED";

export interface Achievement {
  id: string;
  conditionType: AchievementCondition;
  targetValue: number;
  productId: string | null;
  xpReward: number;
  pointsReward: number;
  hidden: boolean;
  active: boolean;
}

export interface AchievementReward {
  achievementId: string;
  xp: number;
  points: number;
}

function achievementValue(stats: ChildStats, achievement: Achievement): number {
  switch (achievement.conditionType) {
    case "TOTAL_SALES": return stats.totalSales;
    case "TOTAL_UNITS": return stats.totalUnits;
    case "TOTAL_PROFIT": return stats.totalProfit;
    case "STREAK_DAYS": return stats.bestStreak;
    case "PRODUCT_UNITS": return achievement.productId ? (stats.productUnits[achievement.productId] ?? 0) : 0;
    case "GOALS_COMPLETED": return stats.goalsCompleted;
  }
}

export function evaluateAchievements(input: {
  stats: ChildStats;
  achievements: readonly Achievement[];
  alreadyUnlocked: ReadonlySet<string>;
}): AchievementReward[] {
  return input.achievements
    .filter((achievement) => achievement.active)
    .filter((achievement) => !input.alreadyUnlocked.has(achievement.id))
    .filter((achievement) => achievementValue(input.stats, achievement) >= achievement.targetValue)
    .map((achievement) => ({
      achievementId: achievement.id,
      xp: achievement.xpReward,
      points: achievement.pointsReward,
    }));
}

export function visibleAchievements(
  achievements: readonly Achievement[],
  alreadyUnlocked: ReadonlySet<string>,
): Achievement[] {
  return achievements.filter((achievement) => !achievement.hidden || alreadyUnlocked.has(achievement.id));
}

export type ChallengeCondition = "SALES_COUNT" | "UNITS_SOLD" | "PROFIT_AMOUNT" | "ACTIVE_DAYS" | "PRODUCT_UNITS";

export interface Challenge {
  id: string;
  startsOn: string;
  endsOn: string;
  conditionType: ChallengeCondition;
  targetValue: number;
  productId: string | null;
  xpReward: number;
  pointsReward: number;
  status: "DRAFT" | "ACTIVE" | "FINISHED";
}

export interface ChallengeEvaluation {
  challengeId: string;
  currentValue: number;
  completed: boolean;
  grantReward: boolean;
  xp: number;
  points: number;
}

export function evaluateChallenges(input: {
  today: string;
  challenges: readonly Challenge[];
  values: Readonly<Record<string, number>>;
  rewardedChallengeIds: ReadonlySet<string>;
}): ChallengeEvaluation[] {
  return input.challenges
    .filter((challenge) => challenge.status === "ACTIVE")
    .filter((challenge) => input.today >= challenge.startsOn && input.today <= challenge.endsOn)
    .map((challenge) => {
      const currentValue = Math.max(0, input.values[challenge.id] ?? 0);
      const completed = currentValue >= challenge.targetValue;
      const grantReward = completed && !input.rewardedChallengeIds.has(challenge.id);
      return {
        challengeId: challenge.id,
        currentValue,
        completed,
        grantReward,
        xp: grantReward ? challenge.xpReward : 0,
        points: grantReward ? challenge.pointsReward : 0,
      };
    });
}
