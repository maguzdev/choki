"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { monthGrid } from "@/lib/domain/dates";

type Day = { date: string; status: "SOLD" | "PROTECTED" | "MISSED"; salesCount: number };

function shiftMonth(anchor: string, delta: number) {
  const date = new Date(Date.UTC(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)) - 1 + delta, 1));
  return date.toISOString().slice(0, 10);
}

const labels = {
  SOLD: { icon: "🔥", text: "vendiste" },
  PROTECTED: { icon: "🛡️", text: "racha protegida" },
  MISSED: { icon: "✖️", text: "racha interrumpida" },
} as const;

export function ActivityCalendar({ days, today }: { days: Day[]; today: string }) {
  const [month, setMonth] = useState(`${today.slice(0, 7)}-01`);
  const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const grid = monthGrid(month);
  const monthLabel = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${month}T12:00:00Z`));
  const currentMonth = today.slice(0, 7);

  return <section className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft" aria-label="Calendario de actividad">
    <div className="flex items-center justify-between gap-2">
      <Button type="button" variant="ghost" size="icon" onClick={() => setMonth((current) => shiftMonth(current, -1))} aria-label="Mes anterior"><ChevronLeft aria-hidden="true" /></Button>
      <h2 className="font-display text-xl font-bold capitalize text-choco-800">{monthLabel}</h2>
      <Button type="button" variant="ghost" size="icon" disabled={month.slice(0, 7) >= currentMonth} onClick={() => setMonth((current) => shiftMonth(current, 1))} aria-label="Mes siguiente"><ChevronRight aria-hidden="true" /></Button>
    </div>
    <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-bold text-choco-400" aria-hidden="true">{["L", "M", "X", "J", "V", "S", "D"].map((label) => <span key={label}>{label}</span>)}</div>
    <div className="mt-2 grid grid-cols-7 gap-1">
      {grid.map((date) => {
        const day = byDate.get(date);
        const outside = date.slice(0, 7) !== month.slice(0, 7);
        const future = date > today;
        const status = day ? labels[day.status] : null;
        const icon = status?.icon ?? (future ? "·" : "○");
        const text = status?.text ?? (future ? "día futuro" : "sin actividad");
        return <div key={date} aria-label={`${date}: ${text}${day?.salesCount ? `, ${day.salesCount} ventas` : ""}`} className={`flex min-h-12 flex-col items-center justify-center rounded-xl border text-xs ${outside ? "border-transparent opacity-25" : "border-cream-200 bg-white"} ${date === today ? "ring-2 ring-caramel-400" : ""}`}>
          <span className="tabular-nums text-choco-600">{Number(date.slice(8, 10))}</span><span className="text-base" aria-hidden="true">{icon}</span>
        </div>;
      })}
    </div>
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-choco-600"><span>🔥 Vendido</span><span>🛡️ Protegido</span><span>○ Sin actividad</span><span>✖️ Racha rota</span><span>· Futuro</span></div>
  </section>;
}
