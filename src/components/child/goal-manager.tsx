"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { GoalCard } from "@/components/child/goal-card";
import { GoalContributeSheet } from "@/components/child/goal-contribute-sheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSwitch } from "@/components/ui/form-switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { changeGoalStatus, saveGoal, type GoalActionState } from "@/lib/actions/goals";
import type { WalletBalances, WalletGoal } from "@/lib/data/wallet";

const initialState: GoalActionState = { status: "idle" };
const emojis = ["🎯", "🎧", "🛹", "📱", "🚲", "🎮", "📚", "👟", "🎁", "✈️"];

function GoalEditor({ childId, goal, onSaved, onClose }: { childId: string; goal?: WalletGoal; onSaved: () => void; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveGoal, initialState);
  useEffect(() => { if (state.status === "success") { toast.success(state.message); onSaved(); } }, [onSaved, state.message, state.status]);
  return <Sheet open onOpenChange={(next) => { if (!next && !pending) onClose(); }}><SheetContent side="bottom" className="h-[100dvh] max-h-[100dvh] overflow-y-auto bg-cream-50 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2"><SheetHeader><SheetTitle className="font-display text-2xl font-bold text-choco-800">{goal ? "Editar meta" : "Nueva meta"}</SheetTitle><SheetDescription className="text-choco-600">Define algo que quieras conseguir con tu esfuerzo.</SheetDescription></SheetHeader><form action={action} className="space-y-4 px-4 pb-4"><input type="hidden" name="childId" value={childId} />{goal ? <input type="hidden" name="id" value={goal.id} /> : null}<label className="block text-sm font-semibold">Nombre<input name="name" defaultValue={goal?.name} maxLength={80} className="mt-1 h-12 w-full rounded-xl border border-cream-200 bg-white px-3" placeholder="Ej.: Audífonos" required /></label><fieldset><legend className="text-sm font-semibold">Emoji</legend><div className="mt-2 flex flex-wrap gap-2">{emojis.map((emoji) => <label key={emoji} className="flex size-11 cursor-pointer items-center justify-center rounded-xl border border-cream-200 bg-white text-2xl has-checked:border-goal-500 has-checked:bg-goal-500/10"><input type="radio" name="emoji" value={emoji} defaultChecked={(goal?.emoji ?? "🎯") === emoji} className="sr-only" />{emoji}</label>)}</div></fieldset><label className="block text-sm font-semibold">Objetivo en pesos<input name="targetAmount" type="number" min="1" inputMode="numeric" defaultValue={goal?.targetAmount} className="mt-1 h-12 w-full rounded-xl border border-cream-200 bg-white px-3" required /></label><label className="block text-sm font-semibold">Fecha objetivo (opcional)<input name="targetDate" type="date" defaultValue={goal?.targetDate ?? ""} className="mt-1 h-12 w-full rounded-xl border border-cream-200 bg-white px-3" /></label><label className="block text-sm font-semibold">Prioridad<select name="priority" defaultValue={goal?.priority ?? 2} className="mt-1 h-12 w-full rounded-xl border border-cream-200 bg-white px-3"><option value="1">Alta</option><option value="2">Media</option><option value="3">Baja</option></select></label><label className="block text-sm font-semibold">Descripción (opcional)<textarea name="description" defaultValue={goal?.description ?? ""} maxLength={300} rows={3} className="mt-1 w-full rounded-xl border border-cream-200 bg-white px-3 py-2" /></label><FormSwitch name="isPrimary" defaultChecked={goal?.isPrimary ?? false} label="Mostrar como mi meta principal" className="rounded-xl border border-cream-200 bg-white px-3" />{state.status === "error" ? <p role="alert" className="rounded-xl bg-danger-500/10 p-3 text-sm font-semibold text-danger-500">{state.message}</p> : null}<Button type="submit" className="min-h-12 w-full" disabled={pending}>{pending ? "Guardando…" : "Guardar meta"}</Button></form></SheetContent></Sheet>;
}

export function GoalManager({ childId, goals, balances }: { childId: string; goals: WalletGoal[]; balances: WalletBalances }) {
  const [editing, setEditing] = useState<WalletGoal | "NEW">();
  const [archiveGoal, setArchiveGoal] = useState<WalletGoal>();
  const [version, setVersion] = useState(0);
  const [pending, startTransition] = useTransition();
  function change(goal: WalletGoal, status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED") {
    if (status === "ARCHIVED") { setArchiveGoal(goal); return; }
    startTransition(async () => {
      const result = await changeGoalStatus({ childId, goalId: goal.id, status });
      if (result.status === "error") toast.error(result.message);
      else {
        toast.success(result.message);
        if (result.celebrate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) void import("canvas-confetti").then(({ default: confetti }) => confetti({ particleCount: 90, spread: 65, origin: { y: 0.7 } }));
      }
    });
  }
  function confirmArchive() {
    if (!archiveGoal) return;
    const goal = archiveGoal;
    setArchiveGoal(undefined);
    startTransition(async () => {
      const result = await changeGoalStatus({ childId, goalId: goal.id, status: "ARCHIVED" });
      if (result.status === "error") toast.error(result.message);
      else toast.success(result.message);
    });
  }
  return <>
    <Button type="button" className="min-h-12 w-full" onClick={() => setEditing("NEW")}><Plus aria-hidden="true" /> Crear meta</Button>
    <section className="mt-4 space-y-4">{goals.map((goal) => <GoalCard key={goal.id} goal={goal} pending={pending} onEdit={() => setEditing(goal)} onStatus={(status) => change(goal, status)}><GoalContributeSheet childId={childId} goal={goal} balances={balances} /></GoalCard>)}{goals.length === 0 ? <div className="rounded-card border border-dashed border-goal-500/40 bg-goal-500/5 p-8 text-center"><p className="text-4xl">🎯</p><h2 className="mt-3 font-display text-xl font-bold">Aún no tienes metas</h2><p className="mt-1 text-sm text-choco-600">Crea una para empezar a separar dinero.</p></div> : null}</section>
    {editing ? <GoalEditor key={`${editing === "NEW" ? "new" : editing.id}-${version}`} childId={childId} goal={editing === "NEW" ? undefined : editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); setVersion((current) => current + 1); }} /> : null}
    <Dialog open={Boolean(archiveGoal)} onOpenChange={(open) => { if (!open && !pending) setArchiveGoal(undefined); }}><DialogContent className="bg-cream-50 text-choco-800"><DialogHeader><DialogTitle className="font-display text-xl font-bold">¿Archivar esta meta?</DialogTitle><DialogDescription className="text-choco-600">Dejará de aparecer en tu lista. Si todavía tiene dinero, primero debes sacarlo o registrar la compra.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => setArchiveGoal(undefined)} disabled={pending}>Cancelar</Button><Button type="button" variant="destructive" onClick={confirmArchive} disabled={pending}>{pending ? "Archivando…" : "Archivar"}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
