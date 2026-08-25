"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { diffDays } from "@/lib/domain/dates";

type DatedItem = { localDate: string };

function asDate(localDate: string) {
  return new Date(`${localDate}T12:00:00Z`);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function historyMonthLabel(month: string) {
  return capitalize(new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(asDate(`${month}-01`)));
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

function DayGroup<T extends DatedItem>({
  idPrefix,
  localDate,
  items,
  today,
  initiallyExpanded,
  renderItem,
  getKey,
  singularLabel = "movimiento",
  pluralLabel = "movimientos",
}: {
  idPrefix: string;
  localDate: string;
  items: T[];
  today: string;
  initiallyExpanded: boolean;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
  singularLabel?: string;
  pluralLabel?: string;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? items : items.slice(0, 5);
  const hiddenCount = items.length - visibleItems.length;
  const dayId = `${idPrefix}-day-${localDate}`;

  return (
    <section className="rounded-card border border-cream-200 bg-cream-50 p-3 shadow-soft" aria-labelledby={dayId}>
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
        aria-expanded={expanded}
        aria-controls={`${dayId}-items`}
        onClick={() => setExpanded((current) => !current)}
      >
        <span>
          <span id={dayId} className="block font-display text-xl font-bold text-choco-800">{dayLabel(localDate, today)}</span>
          <span className="text-xs font-semibold text-choco-600">
            {items.length} {items.length === 1 ? singularLabel : pluralLabel}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className={`size-5 shrink-0 text-caramel-600 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded ? (
        <div id={`${dayId}-items`} className="mt-3 space-y-2">
          {visibleItems.map((item) => <div key={getKey(item)}>{renderItem(item)}</div>)}
          {hiddenCount > 0 ? (
            <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => setShowAll(true)}>
              Ver {hiddenCount} {hiddenCount === 1 ? `${singularLabel} anterior` : `${pluralLabel} anteriores`}
            </Button>
          ) : showAll && items.length > 5 ? (
            <Button type="button" variant="ghost" className="min-h-11 w-full" onClick={() => setShowAll(false)}>
              Mostrar solo los 5 más recientes
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function DailyGroupedHistory<T extends DatedItem>({
  idPrefix,
  items,
  today,
  emptyMessage,
  renderItem,
  getKey,
  singularLabel,
  pluralLabel,
}: {
  idPrefix: string;
  items: T[];
  today: string;
  emptyMessage: string;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
  singularLabel?: string;
  pluralLabel?: string;
}) {
  const groups = useMemo(() => {
    const grouped = new Map<string, T[]>();
    for (const item of items) {
      const day = grouped.get(item.localDate) ?? [];
      day.push(item);
      grouped.set(item.localDate, day);
    }
    return [...grouped.entries()];
  }, [items]);

  return <div className="space-y-3">
    {groups.map(([localDate, dayItems], index) => <DayGroup key={localDate} idPrefix={idPrefix} localDate={localDate} items={dayItems} today={today} initiallyExpanded={index === 0} renderItem={renderItem} getKey={getKey} singularLabel={singularLabel} pluralLabel={pluralLabel} />)}
    {groups.length === 0 ? <p className="rounded-xl border border-dashed border-cream-200 bg-cream-50 p-6 text-center text-sm text-choco-600">{emptyMessage}.</p> : null}
  </div>;
}

export function MonthlyHistory<T extends DatedItem>({
  idPrefix,
  items,
  today,
  emptyMessage,
  renderItem,
  getKey,
}: {
  idPrefix: string;
  items: T[];
  today: string;
  emptyMessage: string;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
}) {
  const months = useMemo(() => {
    const available = [...new Set(items.map((item) => item.localDate.slice(0, 7)))].sort().reverse();
    return available.length > 0 ? available : [today.slice(0, 7)];
  }, [items, today]);
  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? today.slice(0, 7));
  const groups = useMemo(() => {
    const grouped = new Map<string, T[]>();
    for (const item of items) {
      if (!item.localDate.startsWith(selectedMonth)) continue;
      const day = grouped.get(item.localDate) ?? [];
      day.push(item);
      grouped.set(item.localDate, day);
    }
    return [...grouped.entries()];
  }, [items, selectedMonth]);

  return <>
    <label className="mt-4 block rounded-xl border border-cream-200 bg-cream-50 p-3 text-sm font-semibold shadow-soft">
      <span className="flex items-center gap-2"><CalendarDays aria-hidden="true" className="size-5 text-caramel-600" /> Consultar mes</span>
      <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-cream-200 bg-white px-3 text-base">
        {months.map((month) => <option key={month} value={month}>{historyMonthLabel(month)}</option>)}
      </select>
    </label>
    <div className="mt-5 space-y-3">
      {groups.map(([localDate, dayItems], index) => <DayGroup key={localDate} idPrefix={idPrefix} localDate={localDate} items={dayItems} today={today} initiallyExpanded={index === 0} renderItem={renderItem} getKey={getKey} />)}
      {groups.length === 0 ? <p className="rounded-xl border border-dashed border-cream-200 bg-cream-50 p-6 text-center text-sm text-choco-600">{emptyMessage} en {historyMonthLabel(selectedMonth)}.</p> : null}
    </div>
  </>;
}
