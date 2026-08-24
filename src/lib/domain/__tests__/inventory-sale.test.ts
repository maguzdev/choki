import { describe, expect, it } from "vitest";
import { applyPurchase, canApplyStockAdjustment } from "../inventory";
import { buildSaleCommitPayload } from "../payloads";
import { computeCashOutcome, computeSaleTotals, quickCashOptions } from "../sale";

const line = { productId: "p1", name: "Galleta", emoji: "🍪", quantity: 2, unitPrice: 5000, unitCost: 2100.25 };
let sequence = 0;
const idFactory = () => `id-${++sequence}`;
const transferPayload = (tip: number) => buildSaleCommitPayload({
  idFactory, saleId: `sale-${tip}`, seller: { id: "child", type: "CHILD" }, lines: [{ ...line, stock: 10 }],
  paymentMethod: "TRANSFER", transferTip: tip, soldAt: "2026-08-24T12:00:00Z", localDate: "2026-08-24",
  savingSettings: { child: { enabled: false, percent: 0 } },
  streak: { currentStreak: 1, bestStreak: 1, protectorsAvailable: 0, lastActivityDate: "2026-08-24", days: [{ date: "2026-08-24", status: "SOLD", salesCount: 1 }] },
});

describe("inventory", () => {
  it("9. calcula la primera compra", () => {
    expect(applyPurchase({ stock: 0, avgCost: 0 }, { quantity: 20, totalCost: 64000 })).toEqual({
      stock: 20, avgCost: 3200, unitCost: 3200,
    });
  });
  it("10. calcula un segundo promedio ponderado a dos decimales", () => {
    expect(applyPurchase({ stock: 20, avgCost: 3200 }, { quantity: 10, totalCost: 40000 })).toEqual({
      stock: 30, avgCost: 3466.67, unitCost: 4000,
    });
  });
  it("11. pondera con base cero si el stock previo es negativo", () => {
    expect(applyPurchase({ stock: -5, avgCost: 900 }, { quantity: 20, totalCost: 64000 })).toEqual({ stock: 15, avgCost: 3200, unitCost: 3200 });
  });
  it("impide ajustes manuales que dejan el stock por debajo de cero", () => {
    expect(canApplyStockAdjustment(2, -3)).toBe(false);
    expect(canApplyStockAdjustment(2, -2)).toBe(true);
    expect(canApplyStockAdjustment(2, 3)).toBe(true);
  });
});

describe("sale", () => {
  it("12. calcula un carrito de tres líneas con costos decimales", () => {
    const result = computeSaleTotals([line, { ...line, productId: "p2", quantity: 1, unitPrice: 3000, unitCost: 1000.4 }, { ...line, productId: "p3", quantity: 3, unitPrice: 2000, unitCost: 500.1 }]);
    expect(result).toMatchObject({ itemsTotal: 19000, unitsTotal: 6, costTotal: 6701.2, marginTotal: 12299 });
    expect(result.items).toHaveLength(3);
  });
  it("13. calcula cambio exacto sin propina", () => {
    expect(computeCashOutcome({ itemsTotal: 7000, cashReceived: 10000, changeGiven: 3000 })).toEqual({ changeExpected: 3000, tip: 0 });
  });
  it("14. convierte todo el cambio en propina y suma la ganancia", () => {
    const outcome = computeCashOutcome({ itemsTotal: 17000, cashReceived: 20000, changeGiven: 0 });
    expect(outcome).toEqual({ changeExpected: 3000, tip: 3000 });
    expect(8000 + outcome.tip).toBe(11000);
  });
  it("15. calcula una propina parcial", () => expect(computeCashOutcome({ itemsTotal: 17000, cashReceived: 20000, changeGiven: 1000 })).toEqual({ changeExpected: 3000, tip: 2000 }));
  it("16. registra transferencia sin cambio y con propina explícita", () => expect(transferPayload(1500).sale[0]).toMatchObject({ payment_method: "TRANSFER", cash_received: null, change_given: null, tip_total: 1500 }));
  it("17. la propina no altera productos ni costo", () => {
    const withoutTip = transferPayload(0).sale[0];
    const withTip = transferPayload(3000).sale[0];
    expect(withoutTip).toBeDefined();
    expect(withTip).toBeDefined();
    if (!withoutTip || !withTip) throw new Error("Missing sale row");
    expect(withTip.items_total).toBe(withoutTip.items_total);
    expect(withTip.cost_total).toBe(withoutTip.cost_total);
    expect(withTip.earnings_total).toBe(withoutTip.earnings_total + 3000);
  });
  it("18. propone valores crecientes, suficientes y distintos", () => {
    const options = quickCashOptions(17000);
    expect(options).toEqual([...options].sort((a, b) => a - b));
    expect(options.every((value) => value >= 17000)).toBe(true);
    expect(new Set(options).size).toBe(options.length);
  });
});
