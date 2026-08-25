import { addDays, weekDays, type LocalDate } from "./dates";

export type PeriodPreset = "TODAY" | "WEEK" | "MONTH" | "RANGE";

export type PeriodRange = {
  preset: PeriodPreset;
  from: LocalDate;
  to: LocalDate;
};

export type SaleMetricInput = {
  id: string;
  localDate: LocalDate;
  status: "COMPLETED" | "VOIDED";
  itemsTotal: number;
  costTotal: number;
  earningsTotal: number;
  tipTotal: number;
  unitsTotal: number;
  paymentMethod: "CASH" | "TRANSFER";
};

function isLocalDate(value: string | undefined): value is LocalDate {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)));
}

function monthEnd(today: LocalDate): LocalDate {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return addDays(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`, -1);
}

export function resolvePeriodRange({ preset, from, to }: { preset?: string; from?: string; to?: string }, today: LocalDate): PeriodRange {
  if (preset === "TODAY") return { preset, from: today, to: today };
  if (preset === "WEEK") {
    const days = weekDays(today);
    return { preset, from: days[0]!, to: days[6]! };
  }
  if (preset === "RANGE" && isLocalDate(from) && isLocalDate(to) && from <= to) {
    return { preset, from, to };
  }
  return { preset: "MONTH", from: `${today.slice(0, 7)}-01`, to: monthEnd(today) };
}

export function summarizeSales(sales: readonly SaleMetricInput[]) {
  const completed = sales.filter((sale) => sale.status === "COMPLETED");
  const revenue = completed.reduce((sum, sale) => sum + sale.itemsTotal, 0);
  const cost = completed.reduce((sum, sale) => sum + sale.costTotal, 0);
  const recoveredCost = completed.reduce((sum, sale) => sum + sale.itemsTotal + sale.tipTotal - sale.earningsTotal, 0);
  const profit = completed.reduce((sum, sale) => sum + sale.earningsTotal, 0);
  const units = completed.reduce((sum, sale) => sum + sale.unitsTotal, 0);
  const tips = completed.reduce((sum, sale) => sum + sale.tipTotal, 0);
  return {
    count: completed.length,
    revenue,
    cost,
    recoveredCost,
    profit,
    units,
    tips,
    averageTicket: completed.length ? Math.round(revenue / completed.length) : 0,
    bestSale: completed.reduce((best, sale) => Math.max(best, sale.itemsTotal), 0),
    activeDays: new Set(completed.map((sale) => sale.localDate)).size,
    cashCount: completed.filter((sale) => sale.paymentMethod === "CASH").length,
    transferCount: completed.filter((sale) => sale.paymentMethod === "TRANSFER").length,
  };
}

export function metricByDate(sales: readonly SaleMetricInput[], metric: "revenue" | "profit") {
  const totals = new Map<LocalDate, number>();
  for (const sale of sales) {
    if (sale.status !== "COMPLETED") continue;
    const value = metric === "revenue" ? sale.itemsTotal : sale.earningsTotal;
    totals.set(sale.localDate, (totals.get(sale.localDate) ?? 0) + value);
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
}
