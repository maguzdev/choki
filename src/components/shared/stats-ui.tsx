import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { PeriodRange } from "@/lib/domain/stats";

export function StatCard({ icon, label, value, detail, tone = "text-choco-800" }: { icon: ReactNode; label: string; value: string; detail?: string; tone?: string }) {
  return <article className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft">
    <div className="flex items-center gap-2 text-sm font-semibold text-choco-600"><span className="flex size-9 items-center justify-center rounded-xl bg-cream-100">{icon}</span>{label}</div>
    <p className={`mt-3 font-display text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
    {detail ? <p className="mt-1 text-xs leading-5 text-choco-600">{detail}</p> : null}
  </article>;
}

export function ProgressBar({ value, label, tone = "bg-goal-500" }: { value: number; label: string; tone?: string }) {
  const percent = Math.min(100, Math.max(0, value));
  return <div className="h-3 overflow-hidden rounded-full bg-cream-200" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><div className={`h-full rounded-full transition-[width] motion-reduce:transition-none ${tone}`} style={{ width: `${percent}%` }} /></div>;
}

function DateField({ label, name, value, today }: { label: string; name: string; value: string; today: string }) {
  return <label className="block min-w-0 max-w-full text-sm font-semibold text-choco-600">
    {label}
    <span className="mt-1 block h-12 w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-cream-200 bg-white">
      <input
        type="date"
        name={name}
        defaultValue={value}
        max={today}
        className="flex h-full w-full min-w-0 max-w-full appearance-none items-center border-0 bg-transparent px-3 py-0 text-base text-choco-800 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-caramel-500"
      />
    </span>
  </label>;
}

export function PeriodFilter({ range, today, people, selectedPerson, action }: {
  range: PeriodRange;
  today: string;
  people?: Array<{ id: string; name: string; emoji: string }>;
  selectedPerson?: string;
  action?: string;
}) {
  return <form method="get" action={action} className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft">
    <div className={`grid gap-3 ${people ? "sm:grid-cols-2" : "sm:grid-cols-[1fr_2fr]"}`}>
      <label className="space-y-1 text-sm font-semibold text-choco-600">Periodo
        <select name="period" defaultValue={range.preset} className="h-12 w-full rounded-xl border border-cream-200 bg-white px-3 text-base text-choco-800">
          <option value="TODAY">Hoy</option><option value="WEEK">Esta semana</option><option value="MONTH">Este mes</option><option value="RANGE">Rango personalizado</option>
        </select>
      </label>
      {people ? <PersonFilter people={people} selectedPerson={selectedPerson ?? "ALL"} /> : null}
      <div className={`grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 ${people ? "sm:col-span-2" : ""}`}>
        <DateField label="Desde" name="from" value={range.from} today={today} />
        <DateField label="Hasta" name="to" value={range.to > today ? today : range.to} today={today} />
      </div>
    </div>
    <p className="mt-2 text-xs text-choco-600">Las fechas se usan cuando eliges “Rango personalizado”.</p>
    <Button type="submit" className="mt-3 min-h-11 w-full sm:w-auto">Aplicar filtros</Button>
  </form>;
}

export function PersonFilter({ people, selectedPerson }: { people: Array<{ id: string; name: string; emoji: string }>; selectedPerson: string }) {
  return <label className="space-y-1 text-sm font-semibold text-choco-600">Persona<select name="person" defaultValue={selectedPerson} className="h-12 w-full rounded-xl border border-cream-200 bg-white px-3 text-base text-choco-800"><option value="ALL">Toda la familia</option>{people.map((person) => <option key={person.id} value={person.id}>{person.emoji} {person.name}</option>)}</select></label>;
}
