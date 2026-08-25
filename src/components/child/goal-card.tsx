"use client";

import { CheckCircle2, Edit3, Pause, Play, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WalletGoal } from "@/lib/data/wallet";
import { formatCOP } from "@/lib/domain/money";

const statusLabels = { ACTIVE: "Activa", PAUSED: "Pausada", COMPLETED: "Cumplida", ARCHIVED: "Archivada" };

export function GoalCard({ goal, pending, onEdit, onStatus, children }: {
  goal: WalletGoal;
  pending: boolean;
  onEdit: () => void;
  onStatus: (status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED") => void;
  children?: React.ReactNode;
}) {
  return <article className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft">
    <div className="flex items-start gap-3">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-goal-500/10 text-3xl">{goal.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-bold text-choco-800">{goal.name}</h2>{goal.isDisplayedPrimary ? <span className="inline-flex items-center gap-1 rounded-full bg-points-500/15 px-2 py-1 text-xs font-bold"><Star aria-hidden="true" className="size-3 fill-current" /> Principal</span> : null}</div>
        <p className="mt-1 text-sm text-choco-600">{statusLabels[goal.status]}{goal.targetDate ? ` · objetivo ${goal.targetDate}` : ""}</p>
      </div>
    </div>
    {goal.description ? <p className="mt-3 text-sm leading-6 text-choco-600">{goal.description}</p> : null}
    <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-choco-600">Guardado</p><p className="font-display text-2xl font-bold text-goal-500 tabular-nums">{formatCOP(goal.savedAmount)}</p></div><p className="text-right text-sm text-choco-600">de<br /><strong className="text-choco-800">{formatCOP(goal.targetAmount)}</strong></p></div>
    <div className="mt-3 h-3 overflow-hidden rounded-full bg-cream-200" role="progressbar" aria-label={`Progreso de ${goal.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={goal.percent}><div className="h-full rounded-full bg-goal-500 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${Math.min(100, Math.max(0, goal.percent))}%` }} /></div>
    <p className="mt-1 text-right text-xs font-bold text-goal-500">{goal.percent} %</p>
    {children}
    <div className="mt-3 flex flex-wrap gap-2 border-t border-cream-200 pt-3">
      {goal.status === "ACTIVE" || goal.status === "PAUSED" ? <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onEdit}><Edit3 aria-hidden="true" /> Editar</Button> : null}
      {goal.status === "ACTIVE" ? <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => onStatus("PAUSED")}><Pause aria-hidden="true" /> Pausar</Button> : null}
      {goal.status === "PAUSED" ? <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => onStatus("ACTIVE")}><Play aria-hidden="true" /> Reanudar</Button> : null}
      {goal.status === "ACTIVE" ? <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => onStatus("COMPLETED")}><CheckCircle2 aria-hidden="true" /> Cumplida</Button> : null}
      <Button type="button" variant="ghost" size="sm" className="text-danger-500" disabled={pending} onClick={() => onStatus("ARCHIVED")}><Trash2 aria-hidden="true" /> Archivar</Button>
    </div>
  </article>;
}
