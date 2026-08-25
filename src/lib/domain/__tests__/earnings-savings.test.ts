import { describe, expect, it } from "vitest";
import { allocateEarnings } from "../earnings";
import { createGoalContributionMovement, createGoalExitMovement, createSavingMovement, createWithdrawalMovement, splitEarning } from "../savings";

const rules = [
  { childId: "ana", percent: 50, sortOrder: 1 },
  { childId: "leo", percent: 50, sortOrder: 2 },
];
let sequence = 0;
const idFactory = () => `id-${++sequence}`;
const base = { idFactory, childId: "ana", createdBy: "ana", createdAt: "2026-08-24T12:00:00Z", localDate: "2026-08-24", description: "Prueba" };

describe("earnings", () => {
  it("19. asigna toda la ganancia al niño vendedor", () => {
    expect(allocateEarnings({ saleId: "sale", sellerId: "ana", sellerType: "CHILD", marginTotal: 7000, tipTotal: 500, splitRules: [] })).toEqual([expect.objectContaining({ child_id: "ana", total_amount: 7500, source: "OWN_SALE" })]);
  });
  it("20. distribuye margen y propina por separado", () => {
    expect(allocateEarnings({ saleId: "sale", sellerId: "parent", sellerType: "PARENT", marginTotal: 7001, tipTotal: 501, splitRules: rules })).toEqual([
      expect.objectContaining({ child_id: "ana", margin_amount: 3501, tip_amount: 251, total_amount: 3752, source: "FAMILY_SHARE" }),
      expect.objectContaining({ child_id: "leo", margin_amount: 3500, tip_amount: 250, total_amount: 3750, source: "FAMILY_SHARE" }),
    ]);
  });
  it("21. reparte un importe impar 70/30 conservando la suma", () => {
    const result = allocateEarnings({ saleId: "sale", sellerId: "parent", sellerType: "PARENT", marginTotal: 101, tipTotal: 0, splitRules: [{ childId: "ana", sortOrder: 1, percent: 70 }, { childId: "leo", sortOrder: 2, percent: 30 }] });
    expect(result.map((row) => row.margin_amount)).toEqual([71, 30]);
    expect(result.reduce((sum, row) => sum + row.margin_amount, 0)).toBe(101);
  });
  it("22. una venta de padre no crea recompensas de gamificación", async () => {
    const { buildSaleCommitPayload } = await import("../payloads");
    const payload = buildSaleCommitPayload({
      idFactory, saleId: "sale", seller: { id: "parent", type: "PARENT" },
      lines: [{ productId: "p", name: "P", emoji: "🍪", quantity: 1, unitPrice: 1000, unitCost: 500, stock: 4 }],
      paymentMethod: "TRANSFER", transferTip: 0, soldAt: base.createdAt, localDate: base.localDate,
      splitRules: rules, savingSettings: { ana: { enabled: false, percent: 0 }, leo: { enabled: false, percent: 0 } },
      gamificationRules: [{ event: "SALE_COMPLETED", xp: 10, points: 5, active: true }],
    });
    expect(payload.xp).toEqual([]);
    expect(payload.points).toEqual([]);
    expect(payload.streaks.child_id).toBeNull();
  });
});

describe("savings", () => {
  it("23. divide 20.000 con ahorro automático del 10 %", () => expect(splitEarning(20000, { enabled: true, percent: 10 })).toEqual({ toSavings: 2000, toAvailable: 18000 }));
  it("24. deja todo disponible si el ahorro está apagado", () => expect(splitEarning(1001, { enabled: false, percent: 90 })).toEqual({ toSavings: 0, toAvailable: 1001 }));
  it("25. el cambio de porcentaje no altera cálculos anteriores", () => {
    const previous = splitEarning(1000, { enabled: true, percent: 10 });
    splitEarning(1000, { enabled: true, percent: 50 });
    expect(previous).toEqual({ toSavings: 100, toAvailable: 900 });
  });
  it("26. aporta a una meta desde ahorro con los tres deltas correctos", () => {
    expect(createGoalContributionMovement({ ...base, goalId: "goal", source: "SAVINGS", amount: 500, sourceBalance: 1000 })).toMatchObject({ type: "GOAL_IN", available_delta: 0, savings_delta: -500, goal_delta: 500 });
  });
  it("27. impide retirar más que el disponible", () => {
    expect(() => createWithdrawalMovement({ ...base, amount: 501, availableBalance: 500 })).toThrow();
  });
  it("mueve dinero entre disponible y ahorro sin cambiar el total", () => {
    expect(createSavingMovement({ ...base, direction: "IN", amount: 300, sourceBalance: 500 })).toMatchObject({ type: "SAVING_IN", available_delta: -300, savings_delta: 300 });
    expect(createSavingMovement({ ...base, direction: "OUT", amount: 200, sourceBalance: 300 })).toMatchObject({ type: "SAVING_OUT", available_delta: 200, savings_delta: -200 });
  });
  it("devuelve o gasta dinero de una meta con deltas exactos", () => {
    expect(createGoalExitMovement({ ...base, goalId: "goal", action: "TO_AVAILABLE", amount: 400, goalBalance: 500 })).toMatchObject({ type: "GOAL_OUT", available_delta: 400, goal_delta: -400 });
    expect(createGoalExitMovement({ ...base, goalId: "goal", action: "SPEND", amount: 500, goalBalance: 500 })).toMatchObject({ type: "GOAL_SPEND", available_delta: 0, savings_delta: 0, goal_delta: -500 });
  });
});
