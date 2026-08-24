import { addDays, type LocalDate } from "./dates";
import { assertFiniteInteger, assertIsoDate } from "./types";

export interface StreakInput {
  saleDays: { date: LocalDate; count: number }[];
  protectorGrants: { date: LocalDate; quantity: number }[];
  today: LocalDate;
  maxProtectors: number;
}

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
  protectorsAvailable: number;
  lastActivityDate: LocalDate | null;
  days: { date: LocalDate; status: "SOLD" | "PROTECTED" | "MISSED"; salesCount: number }[];
}

export function replayStreak(input: StreakInput): StreakResult {
  assertIsoDate(input.today, "today");
  assertFiniteInteger(input.maxProtectors, "maxProtectors");
  if (input.maxProtectors < 0) throw new Error("maxProtectors must be non-negative");
  const sales = new Map<LocalDate, number>();
  for (const sale of input.saleDays) {
    assertIsoDate(sale.date, "sale date");
    assertFiniteInteger(sale.count, "sale count");
    if (sale.count <= 0) throw new Error("sale count must be positive");
    sales.set(sale.date, (sales.get(sale.date) ?? 0) + sale.count);
  }
  const grants = new Map<LocalDate, number>();
  for (const grant of input.protectorGrants) {
    assertIsoDate(grant.date, "grant date");
    assertFiniteInteger(grant.quantity, "grant quantity");
    if (grant.quantity <= 0) throw new Error("grant quantity must be positive");
    grants.set(grant.date, (grants.get(grant.date) ?? 0) + grant.quantity);
  }

  const eventDates = [...sales.keys(), ...grants.keys()].filter((date) => date <= input.today).sort();
  if (eventDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0, protectorsAvailable: 0, lastActivityDate: null, days: [] };
  }
  const start = eventDates.at(0);
  if (!start) throw new Error("Unable to determine streak start");

  let available = 0;
  let current = 0;
  let best = 0;
  let lastActivityDate: LocalDate | null = null;
  const days: StreakResult["days"] = [];
  for (let date = start; date <= input.today; date = addDays(date, 1)) {
    available = Math.min(input.maxProtectors, available + (grants.get(date) ?? 0));
    const salesCount = sales.get(date) ?? 0;
    if (salesCount > 0) {
      current += 1;
      best = Math.max(best, current);
      lastActivityDate = date;
      days.push({ date, status: "SOLD", salesCount });
    } else if (date < input.today && current > 0) {
      if (available > 0) {
        available -= 1;
        days.push({ date, status: "PROTECTED", salesCount: 0 });
      } else {
        days.push({ date, status: "MISSED", salesCount: 0 });
        current = 0;
      }
    }
  }
  return { currentStreak: current, bestStreak: best, protectorsAvailable: available, lastActivityDate, days };
}
