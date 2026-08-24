"use client";

import { Delete } from "lucide-react";

import { formatCOP } from "@/lib/domain/money";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "back"] as const;

export function CashPad({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  function press(key: (typeof KEYS)[number]) {
    if (key === "back") {
      onChange(Math.floor(value / 10));
      return;
    }
    const next = Number(`${value === 0 ? "" : value}${key}`);
    if (Number.isSafeInteger(next) && next <= 999_999_999) onChange(next);
  }

  return <section className="rounded-card bg-cream-100 p-3" aria-label={label}>
    <p className="text-center text-xs font-semibold uppercase tracking-wide text-choco-600">{label}</p>
    <p className="my-3 text-center font-display text-3xl font-bold tabular-nums text-choco-800" aria-live="polite">{formatCOP(value)}</p>
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => <button key={key} type="button" onClick={() => press(key)} className="flex min-h-12 items-center justify-center rounded-xl border border-cream-200 bg-white font-display text-xl font-bold text-choco-800 active:scale-95" aria-label={key === "back" ? "Borrar último dígito" : `Agregar ${key}`}>
        {key === "back" ? <Delete aria-hidden="true" className="size-5" /> : key}
      </button>)}
    </div>
  </section>;
}
