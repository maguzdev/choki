import { describe, expect, it } from "vitest";

import { metricByDate, resolvePeriodRange, summarizeSales, type SaleMetricInput } from "../stats";

const sales: SaleMetricInput[] = [
  { id: "1", localDate: "2026-08-24", status: "COMPLETED", itemsTotal: 10_000, costTotal: 6_000, earningsTotal: 4_500, tipTotal: 500, unitsTotal: 3, paymentMethod: "CASH" },
  { id: "2", localDate: "2026-08-24", status: "VOIDED", itemsTotal: 90_000, costTotal: 1_000, earningsTotal: 89_000, tipTotal: 0, unitsTotal: 50, paymentMethod: "CASH" },
  { id: "3", localDate: "2026-08-25", status: "COMPLETED", itemsTotal: 20_000, costTotal: 12_000, earningsTotal: 8_000, tipTotal: 0, unitsTotal: 4, paymentMethod: "TRANSFER" },
];

describe("period ranges", () => {
  it("resuelve hoy, semana de lunes a domingo y mes", () => {
    expect(resolvePeriodRange({ preset: "TODAY" }, "2026-08-25")).toEqual({ preset: "TODAY", from: "2026-08-25", to: "2026-08-25" });
    expect(resolvePeriodRange({ preset: "WEEK" }, "2026-08-25")).toEqual({ preset: "WEEK", from: "2026-08-24", to: "2026-08-30" });
    expect(resolvePeriodRange({ preset: "MONTH" }, "2026-08-25")).toEqual({ preset: "MONTH", from: "2026-08-01", to: "2026-08-31" });
  });

  it("acepta un rango válido y vuelve al mes ante uno inválido", () => {
    expect(resolvePeriodRange({ preset: "RANGE", from: "2026-08-02", to: "2026-08-10" }, "2026-08-25")).toMatchObject({ preset: "RANGE", from: "2026-08-02", to: "2026-08-10" });
    expect(resolvePeriodRange({ preset: "RANGE", from: "2026-08-10", to: "2026-08-02" }, "2026-08-25").preset).toBe("MONTH");
  });
});

describe("sales summaries", () => {
  it("excluye ventas anuladas de todos los agregados", () => {
    expect(summarizeSales(sales)).toMatchObject({ count: 2, revenue: 30_000, cost: 18_000, recoveredCost: 18_000, profit: 12_500, units: 7, tips: 500, averageTicket: 15_000, bestSale: 20_000, activeDays: 2, cashCount: 1, transferCount: 1 });
  });

  it("agrupa ventas y utilidad por local_date", () => {
    expect(metricByDate(sales, "revenue")).toEqual([{ label: "2026-08-24", value: 10_000 }, { label: "2026-08-25", value: 20_000 }]);
    expect(metricByDate(sales, "profit")).toEqual([{ label: "2026-08-24", value: 4_500 }, { label: "2026-08-25", value: 8_000 }]);
  });
});
