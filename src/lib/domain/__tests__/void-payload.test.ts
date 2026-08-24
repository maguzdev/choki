import { beforeEach, describe, expect, it } from "vitest";
import { buildSaleVoidPayload } from "../payloads";
import type { TableRow } from "../types";

let sequence = 0;
const idFactory = () => `id-${++sequence}`;
const timestamp = "2026-08-24T15:00:00Z";
const sale: TableRow<"sales"> = {
  id: "sale", seller_id: "child", seller_type: "CHILD", sold_at: timestamp,
  local_date: "2026-08-24", payment_method: "CASH", items_total: 1000,
  cost_total: 400, margin_total: 600, cash_received: 1000, change_given: 0,
  tip_total: 0, earnings_total: 600, units_total: 2, status: "COMPLETED",
  note: null, voided_at: null, voided_by: null, void_reason: null, created_at: timestamp,
};
const item: TableRow<"sale_items"> = {
  id: "item", sale_id: "sale", product_id: "product", product_name: "Galleta",
  product_emoji: "🍪", quantity: 2, unit_price: 500, unit_cost: 200,
  line_total: 1000, line_cost: 400, line_margin: 600,
};
const allocation = (childId: string): TableRow<"earning_allocations"> => ({
  id: `a-${childId}`, child_id: childId, sale_id: "sale", margin_amount: 300,
  tip_amount: 0, total_amount: 300, share_percent: 50, source: "FAMILY_SHARE",
  reversed: false, created_at: timestamp,
});
const earning = (childId: string, available: number, savings: number): TableRow<"money_movements"> => ({
  id: `m-${childId}`, child_id: childId, created_by: "parent", created_at: timestamp,
  local_date: "2026-08-24", description: "Ganancia", earning_amount: available + savings,
  available_delta: available, savings_delta: savings, goal_delta: 0, goal_id: null,
  reference_id: "sale", reference_type: "SALE", type: "EARNING",
});
const score = (kind: "xp" | "points", amount: number) => ({
  id: `${kind}-1`, child_id: "child", amount, reason: "SALE", reference_id: "sale",
  reference_type: "SALE", description: "Venta", created_at: timestamp,
});

function payload(overrides: Partial<Parameters<typeof buildSaleVoidPayload>[0]> = {}) {
  return buildSaleVoidPayload({
    idFactory, sale, items: [item], allocations: [allocation("child")],
    originalMoney: [earning("child", 500, 100)], originalXp: [score("xp", 10)],
    originalPoints: [score("points", 5)], stockByProduct: { product: 3 },
    voidedAt: "2026-08-25T10:00:00Z", voidedBy: "parent", voidReason: "Venta duplicada",
    localDate: "2026-08-25",
    streak: { currentStreak: 0, bestStreak: 0, protectorsAvailable: 0, lastActivityDate: null, days: [] },
    ...overrides,
  });
}

describe("sale void payload", () => {
  beforeEach(() => { sequence = 0; });
  it("43. espeja exactamente el dinero y restituye inventario", () => {
    const result = payload();
    expect(result.money[0]).toMatchObject({ earning_amount: -600, available_delta: -500, savings_delta: -100, type: "EARNING_REVERSAL" });
    expect(result).toMatchObject({ inventory: [{ quantity_delta: 2, stock_after: 5, type: "SALE_VOID" }], stock_deltas: [{ product_id: "product", delta: 2 }] });
  });
  it("44. revierte exactamente XP y puntos de la venta", () => {
    const result = payload();
    expect(result.xp[0]).toMatchObject({ amount: -10, reason: "SALE_VOID" });
    expect(result.points[0]).toMatchObject({ amount: -5, reason: "SALE_VOID" });
  });
  it("45. una venta de padre crea una reversión por cada hijo", () => {
    const parentSale = { ...sale, seller_id: "parent", seller_type: "PARENT" };
    const result = payload({ sale: parentSale, allocations: [allocation("ana"), allocation("leo")], originalMoney: [earning("ana", 250, 50), earning("leo", 200, 100)], originalXp: [], originalPoints: [] });
    expect(result.money).toHaveLength(2);
    expect(result.money.map((movement) => movement.child_id)).toEqual(["ana", "leo"]);
  });
  it("46. construye la reversión aunque pueda dejar el disponible negativo", () => expect(() => payload({ originalMoney: [earning("child", 5000, 1000)] })).not.toThrow());
  it("47. no incluye ni revoca desbloqueos de logros", () => expect(payload()).not.toHaveProperty("unlocks"));
});
