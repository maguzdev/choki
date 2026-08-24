import type { Database } from "@/types/database";

export type Tables = Database["public"]["Tables"];
export type TableRow<T extends keyof Tables> = Tables[T]["Row"];
export type IdFactory = () => string;

export function assertIsoDate(value: string, name = "date"): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${name} must use YYYY-MM-DD format`);
}

export function assertFiniteInteger(value: number, name: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value)) throw new Error(`${name} must be a finite integer`);
}
