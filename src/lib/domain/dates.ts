import { assertIsoDate } from "./types";

export type LocalDate = string;
const DAY_MS = 86_400_000;

function asUtcMidday(localDate: LocalDate): Date {
  assertIsoDate(localDate, "localDate");
  const year = Number(localDate.slice(0, 4));
  const month = Number(localDate.slice(5, 7));
  const day = Number(localDate.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("Invalid local date");
  }
  return date;
}

export function toLocalDate(date: Date, timeZone: string): LocalDate {
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addDays(localDate: LocalDate, days: number): LocalDate {
  if (!Number.isInteger(days)) throw new Error("days must be an integer");
  return new Date(asUtcMidday(localDate).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function diffDays(from: LocalDate, to: LocalDate): number {
  return Math.round((asUtcMidday(to).getTime() - asUtcMidday(from).getTime()) / DAY_MS);
}

export function weekDays(localDate: LocalDate): LocalDate[] {
  const day = asUtcMidday(localDate).getUTCDay();
  const monday = addDays(localDate, -(day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function monthGrid(localDate: LocalDate): LocalDate[] {
  assertIsoDate(localDate, "localDate");
  const first = `${localDate.slice(0, 7)}-01`;
  const start = weekDays(first).at(0);
  if (!start) throw new Error("Unable to build month grid");
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
