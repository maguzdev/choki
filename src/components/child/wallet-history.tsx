"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WalletMovement } from "@/lib/data/wallet";
import { diffDays } from "@/lib/domain/dates";
import { formatCOP } from "@/lib/domain/money";

const movementLabels: Record<string, string> = {
  EARNING: "Ganancia",
  EARNING_REVERSAL: "Anulación de ganancia",
  SAVING_IN: "Entrada a ahorro",
  SAVING_OUT: "Salida de ahorro",
  GOAL_IN: "Aporte a meta",
  GOAL_OUT: "Salida de meta",
  GOAL_SPEND: "Compra de meta",
  WITHDRAWAL: "Dinero utilizado",
  ADJUSTMENT: "Ajuste",
};

function asDate(localDate: string) {
  return new Date(`${localDate}T12:00:00Z`);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function monthLabel(month: string) {
  const label = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(asDate(`${month}-01`));
  return capitalize(label);
}

function dayLabel(localDate: string, today: string) {
  const age = diffDays(localDate, today);
  if (age === 0) return "Hoy";
  if (age === 1) return "Ayer";
  if (age > 1 && age < 7) {
    return capitalize(new Intl.DateTimeFormat("es-CO", {
      weekday: "long",
      timeZone: "UTC",
    }).format(asDate(localDate)));
  }
  return capitalize(new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(asDate(localDate)));
}

function Delta({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-bold tabular-nums ${value > 0 ? "bg-success-500/10 text-success-500" : "bg-danger-500/10 text-danger-500"}`}>
      {label} {value > 0 ? "+" : ""}{formatCOP(value)}
    </span>
  );
}

function MovementRow({ movement }: { movement: WalletMovement }) {
  return (
    <article className="rounded-xl border border-cream-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-choco-800">{movement.description}</p>
          <p className="mt-0.5 text-xs text-choco-600">{movementLabels[movement.type] ?? movement.type}</p>
        </div>
        {movement.earningAmount !== 0 ? (
          <strong className={`shrink-0 tabular-nums ${movement.earningAmount > 0 ? "text-success-500" : "text-danger-500"}`}>
            {movement.earningAmount > 0 ? "+" : ""}{formatCOP(movement.earningAmount)}
          </strong>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Delta label="Disponible" value={movement.availableDelta} />
        <Delta label="Ahorro" value={movement.savingsDelta} />
        <Delta label="Meta" value={movement.goalDelta} />
      </div>
    </article>
  );
}

function DayGroup({
  localDate,
  movements,
  today,
  initiallyExpanded,
}: {
  localDate: string;
  movements: WalletMovement[];
  today: string;
  initiallyExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [showAll, setShowAll] = useState(false);
  const label = dayLabel(localDate, today);
  const visibleMovements = showAll ? movements : movements.slice(0, 5);
  const hiddenCount = movements.length - visibleMovements.length;

  return (
    <section className="rounded-card border border-cream-200 bg-cream-50 p-3 shadow-soft" aria-labelledby={`wallet-day-${localDate}`}>
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
        aria-expanded={expanded}
        aria-controls={`wallet-movements-${localDate}`}
        onClick={() => setExpanded((current) => !current)}
      >
        <span>
          <span id={`wallet-day-${localDate}`} className="block font-display text-xl font-bold text-choco-800">{label}</span>
          <span className="text-xs font-semibold text-choco-600">
            {movements.length} {movements.length === 1 ? "movimiento" : "movimientos"}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className={`size-5 shrink-0 text-caramel-600 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded ? (
        <div id={`wallet-movements-${localDate}`} className="mt-3 space-y-2">
          {visibleMovements.map((movement) => <MovementRow key={movement.id} movement={movement} />)}
          {hiddenCount > 0 ? (
            <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => setShowAll(true)}>
              Ver {hiddenCount} {hiddenCount === 1 ? "movimiento anterior" : "movimientos anteriores"}
            </Button>
          ) : showAll && movements.length > 5 ? (
            <Button type="button" variant="ghost" className="min-h-11 w-full" onClick={() => setShowAll(false)}>
              Mostrar solo los 5 más recientes
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function WalletHistory({ movements, today }: { movements: WalletMovement[]; today: string }) {
  const months = useMemo(() => {
    const available = [...new Set(movements.map((movement) => movement.localDate.slice(0, 7)))]
      .sort()
      .reverse();
    return available.length > 0 ? available : [today.slice(0, 7)];
  }, [movements, today]);
  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? today.slice(0, 7));
  const groups = useMemo(() => {
    const grouped = new Map<string, WalletMovement[]>();
    for (const movement of movements) {
      if (!movement.localDate.startsWith(selectedMonth)) continue;
      const day = grouped.get(movement.localDate) ?? [];
      day.push(movement);
      grouped.set(movement.localDate, day);
    }
    return [...grouped.entries()];
  }, [movements, selectedMonth]);

  return (
    <section className="mt-6">
      <div className="flex items-center gap-2">
        <History aria-hidden="true" className="size-5 text-caramel-600" />
        <h2 className="font-display text-2xl font-bold">Mi extracto</h2>
      </div>
      <p className="mt-1 text-sm text-choco-600">Cada movimiento explica de dónde entró o salió tu dinero.</p>
      <label className="mt-4 block rounded-xl border border-cream-200 bg-cream-50 p-3 text-sm font-semibold shadow-soft">
        <span className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" className="size-5 text-caramel-600" />
          Consultar mes
        </span>
        <select
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="mt-2 h-12 w-full rounded-xl border border-cream-200 bg-white px-3 text-base"
        >
          {months.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}
        </select>
      </label>
      <div className="mt-5 space-y-3">
        {groups.map(([localDate, dayMovements], index) => (
          <DayGroup
            key={localDate}
            localDate={localDate}
            movements={dayMovements}
            today={today}
            initiallyExpanded={index === 0}
          />
        ))}
        {groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cream-200 bg-cream-50 p-6 text-center text-sm text-choco-600">
            No hay movimientos en {monthLabel(selectedMonth)}.
          </p>
        ) : null}
      </div>
    </section>
  );
}
