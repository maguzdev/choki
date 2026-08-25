import { describe, expect, it } from "vitest";
import {
  evaluateAchievements, evaluateChallenges, levelFor, visibleAchievements, xpAndPointsForSale,
  type Achievement, type ChildStats, type Level,
} from "../gamification";

const levels: Level[] = [
  { id: "l1", number: 1, name: "Inicio", xpRequired: 0 },
  { id: "l2", number: 2, name: "Pro", xpRequired: 100 },
  { id: "l3", number: 3, name: "Master", xpRequired: 300 },
];
const stats: ChildStats = { totalSales: 1, totalUnits: 10, totalProfit: 5000, bestStreak: 2, productUnits: { cookie: 7 }, goalsCompleted: 0 };
const achievement: Achievement = {
  id: "ten", conditionType: "TOTAL_UNITS", targetValue: 10, productId: null,
  xpReward: 30, pointsReward: 15, hidden: false, active: true,
};

describe("gamification", () => {
  it("28. aplica una regla por venta y otra por unidad", () => {
    const result = xpAndPointsForSale({ unitsTotal: 4 }, [
      { event: "SALE_COMPLETED", xp: 10, points: 5, active: true },
      { event: "UNIT_SOLD", xp: 2, points: 1, active: true },
    ]);
    expect(result.xp.map((movement) => movement.amount)).toEqual([10, 8]);
    expect(result.points.map((movement) => movement.amount)).toEqual([5, 4]);
  });
  it("describe una sola unidad en singular", () => {
    const result = xpAndPointsForSale({ unitsTotal: 1 }, [
      { event: "UNIT_SOLD", xp: 2, points: 1, active: true },
    ]);
    expect(result.xp[0]?.description).toBe("1 producto vendido");
  });
  it("29. selecciona el nivel en el límite exacto", () => {
    expect(levelFor(100, levels)).toMatchObject({ current: levels[1], xpIntoLevel: 0 });
  });
  it("30. deja progreso completo por encima del último nivel", () => {
    expect(levelFor(450, levels)).toMatchObject({ current: levels[2], next: null, percent: 100 });
  });
  it("31. desbloquea un logro una sola vez", () => {
    expect(evaluateAchievements({ stats, achievements: [achievement], alreadyUnlocked: new Set() })).toEqual([{ achievementId: "ten", xp: 30, points: 15 }]);
    expect(evaluateAchievements({ stats, achievements: [achievement], alreadyUnlocked: new Set(["ten"]) })).toEqual([]);
  });
  it("32. oculta un logro secreto hasta desbloquearlo", () => {
    const hidden = { ...achievement, id: "secret", hidden: true };
    expect(visibleAchievements([hidden], new Set())).toEqual([]);
    expect(visibleAchievements([hidden], new Set(["secret"]))).toEqual([hidden]);
  });
  it("33. recompensa un reto completado solo si no estaba premiado", () => {
    const challenge = { id: "c1", startsOn: "2026-08-18", endsOn: "2026-08-24", conditionType: "UNITS_SOLD" as const, targetValue: 10, productId: null, xpReward: 50, pointsReward: 25, status: "ACTIVE" as const };
    expect(evaluateChallenges({ today: "2026-08-24", challenges: [challenge], values: { c1: 10 }, rewardedChallengeIds: new Set() })[0]).toMatchObject({ completed: true, grantReward: true, xp: 50, points: 25 });
    expect(evaluateChallenges({ today: "2026-08-24", challenges: [challenge], values: { c1: 10 }, rewardedChallengeIds: new Set(["c1"]) })[0]).toMatchObject({ grantReward: false, xp: 0, points: 0 });
  });
});
