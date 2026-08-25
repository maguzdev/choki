"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, CircleDollarSign, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { contributeToGoal, exitGoalMoney, type GoalActionState } from "@/lib/actions/goals";
import type { WalletBalances, WalletGoal } from "@/lib/data/wallet";
import { formatCOP } from "@/lib/domain/money";

const initialState: GoalActionState = { status: "idle" };
type Mode = "CONTRIBUTE" | "WITHDRAW" | "RESOLVE";

export function GoalContributeSheet({ childId, goal, balances }: { childId: string; goal: WalletGoal; balances: WalletBalances }) {
  const [mode, setMode] = useState<Mode>();
  const contributionForm = useRef<HTMLFormElement>(null);
  const exitForm = useRef<HTMLFormElement>(null);
  const [contributionState, contributionAction, contributionPending] = useActionState(contributeToGoal, initialState);
  const [exitState, exitAction, exitPending] = useActionState(exitGoalMoney, initialState);
  const pending = contributionPending || exitPending;

  useEffect(() => {
    const result = contributionState.status === "success" ? contributionState : exitState.status === "success" ? exitState : null;
    if (!result) return;
    toast.success(result.message);
    if (result.celebrate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void import("canvas-confetti").then(({ default: confetti }) => confetti({ particleCount: 90, spread: 65, origin: { y: 0.7 }, colors: ["#17A398", "#D98C3F", "#FFF7E8"] }));
    }
    contributionForm.current?.reset();
    exitForm.current?.reset();
    setMode(undefined);
  }, [contributionState, exitState]);

  const state = mode === "CONTRIBUTE" ? contributionState : exitState;
  return <div className="mt-4 grid grid-cols-2 gap-2">
    {goal.status === "ACTIVE" ? <Button type="button" className="min-h-12" onClick={() => setMode("CONTRIBUTE")}><CircleDollarSign aria-hidden="true" /> Aportar</Button> : null}
    {goal.savedAmount > 0 && goal.status !== "COMPLETED" ? <Button type="button" variant="outline" className="min-h-12" onClick={() => setMode("WITHDRAW")}><ArrowDownToLine aria-hidden="true" /> Sacar</Button> : null}
    {goal.status === "COMPLETED" && goal.savedAmount > 0 ? <Button type="button" className="col-span-2 min-h-12" onClick={() => setMode("RESOLVE")}><ShoppingBag aria-hidden="true" /> Usar dinero de la meta</Button> : null}
    <Sheet open={Boolean(mode)} onOpenChange={(next) => { if (!next && !pending) setMode(undefined); }}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto bg-cream-50 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
        <SheetHeader><SheetTitle className="font-display text-2xl font-bold text-choco-800">{mode === "CONTRIBUTE" ? `Aportar a ${goal.name}` : mode === "WITHDRAW" ? `Sacar de ${goal.name}` : `Completar ${goal.name}`}</SheetTitle><SheetDescription className="text-choco-600">Actualmente tiene {formatCOP(goal.savedAmount)}.</SheetDescription></SheetHeader>
        {mode === "CONTRIBUTE" ? <form ref={contributionForm} action={contributionAction} className="space-y-4 px-4 pb-4">
          <input type="hidden" name="childId" value={childId} /><input type="hidden" name="goalId" value={goal.id} />
          <label className="block text-sm font-semibold">Tomar dinero de<select name="source" defaultValue="AVAILABLE" className="mt-1 h-12 w-full rounded-xl border border-cream-200 bg-white px-3"><option value="AVAILABLE">Disponible · {formatCOP(balances.available)}</option><option value="SAVINGS">Ahorro · {formatCOP(balances.savings)}</option></select></label>
          <label className="block text-sm font-semibold">Valor del aporte<input name="amount" type="number" min="1" inputMode="numeric" className="mt-1 h-12 w-full rounded-xl border border-cream-200 bg-white px-3 text-lg" required /></label>
          {state.status === "error" ? <p role="alert" className="rounded-xl bg-danger-500/10 p-3 text-sm font-semibold text-danger-500">{state.message}</p> : null}
          <Button type="submit" className="min-h-12 w-full" disabled={pending}>{pending ? "Guardando…" : "Guardar aporte"}</Button>
        </form> : null}
        {mode === "WITHDRAW" ? <form ref={exitForm} action={exitAction} className="space-y-4 px-4 pb-4">
          <input type="hidden" name="childId" value={childId} /><input type="hidden" name="goalId" value={goal.id} />
          <label className="block text-sm font-semibold">Enviar el dinero a<select name="action" defaultValue="TO_AVAILABLE" className="mt-1 h-12 w-full rounded-xl border border-cream-200 bg-white px-3"><option value="TO_AVAILABLE">Disponible</option><option value="TO_SAVINGS">Ahorro</option></select></label>
          <label className="block text-sm font-semibold">Valor<input name="amount" type="number" min="1" max={goal.savedAmount} inputMode="numeric" className="mt-1 h-12 w-full rounded-xl border border-cream-200 bg-white px-3 text-lg" required /></label>
          {state.status === "error" ? <p role="alert" className="rounded-xl bg-danger-500/10 p-3 text-sm font-semibold text-danger-500">{state.message}</p> : null}
          <Button type="submit" className="min-h-12 w-full" disabled={pending}>{pending ? "Guardando…" : "Sacar dinero"}</Button>
        </form> : null}
        {mode === "RESOLVE" ? <div className="space-y-3 px-4 pb-4">
          <form action={exitAction}><input type="hidden" name="childId" value={childId} /><input type="hidden" name="goalId" value={goal.id} /><input type="hidden" name="action" value="SPEND" /><Button type="submit" className="min-h-12 w-full" disabled={pending}><ShoppingBag aria-hidden="true" /> Ya la compré</Button></form>
          <form action={exitAction}><input type="hidden" name="childId" value={childId} /><input type="hidden" name="goalId" value={goal.id} /><input type="hidden" name="action" value="TO_AVAILABLE" /><input type="hidden" name="amount" value={goal.savedAmount} /><Button type="submit" variant="outline" className="min-h-12 w-full" disabled={pending}>Devolver todo a disponible</Button></form>
          {state.status === "error" ? <p role="alert" className="rounded-xl bg-danger-500/10 p-3 text-sm font-semibold text-danger-500">{state.message}</p> : null}
        </div> : null}
      </SheetContent>
    </Sheet>
  </div>;
}
