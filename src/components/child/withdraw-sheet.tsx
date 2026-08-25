"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, WalletCards as WalletIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { moveSavings, registerWithdrawal, type WalletActionState } from "@/lib/actions/wallet";
import type { WalletBalances } from "@/lib/data/wallet";
import { formatCOP } from "@/lib/domain/money";

const initialState: WalletActionState = { status: "idle" };
type Mode = "SAVE" | "UNSAVE" | "WITHDRAW";

function MoneySheet({ childId, mode, balance }: { childId: string; mode: Mode; balance: number }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const serverAction = mode === "WITHDRAW" ? registerWithdrawal : moveSavings;
  const [state, action, pending] = useActionState(serverAction, initialState);
  const labels = mode === "SAVE"
    ? { title: "Mover a ahorro", trigger: "Guardar", description: "Pasa dinero disponible a tu ahorro.", Icon: ArrowDownToLine }
    : mode === "UNSAVE"
      ? { title: "Sacar del ahorro", trigger: "Sacar", description: "Devuelve dinero ahorrado a disponible.", Icon: ArrowUpFromLine }
      : { title: "Usé mi dinero", trigger: "Registrar uso", description: "Registra algo que pagaste con tu disponible.", Icon: WalletIcon };

  useEffect(() => {
    if (state.status !== "success") return;
    toast.success(state.message);
    formRef.current?.reset();
    setOpen(false);
  }, [state.message, state.status]);

  return <>
    <Button type="button" variant={mode === "WITHDRAW" ? "outline" : "default"} className="min-h-12 w-full" onClick={() => setOpen(true)}><labels.Icon aria-hidden="true" className="size-5" />{labels.trigger}</Button>
    <Sheet open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto bg-cream-50 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
        <SheetHeader><SheetTitle className="font-display text-2xl font-bold text-choco-800">{labels.title}</SheetTitle><SheetDescription className="text-choco-600">{labels.description}</SheetDescription></SheetHeader>
        <form ref={formRef} action={action} className="space-y-4 px-4 pb-4">
          <input type="hidden" name="childId" value={childId} />
          {mode !== "WITHDRAW" ? <input type="hidden" name="direction" value={mode === "SAVE" ? "IN" : "OUT"} /> : null}
          <p className="rounded-xl bg-cream-100 p-3 text-center text-sm text-choco-600">Saldo máximo: <strong className="text-choco-800">{formatCOP(balance)}</strong></p>
          <label className="block text-sm font-semibold">Valor<input name="amount" type="number" min="1" max={Math.max(0, balance)} inputMode="numeric" className="mt-1 h-12 w-full rounded-xl border border-cream-200 bg-white px-3 text-lg tabular-nums" required /></label>
          {mode === "WITHDRAW" ? <label className="block text-sm font-semibold">¿En qué lo usaste? (opcional)<input name="description" maxLength={120} className="mt-1 h-12 w-full rounded-xl border border-cream-200 bg-white px-3" placeholder="Ej.: compré una merienda" /></label> : null}
          {state.status === "error" ? <p className="rounded-xl bg-danger-500/10 p-3 text-sm font-semibold text-danger-500" role="alert">{state.message}</p> : null}
          <Button type="submit" className="min-h-12 w-full" disabled={pending || balance <= 0}>{pending ? "Guardando…" : "Confirmar"}</Button>
        </form>
      </SheetContent>
    </Sheet>
  </>;
}

export function WalletActions({ childId, balances }: { childId: string; balances: WalletBalances }) {
  return <section className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft"><h2 className="font-display text-xl font-bold">Mover mi dinero</h2><div className="mt-3 grid grid-cols-2 gap-2"><MoneySheet childId={childId} mode="SAVE" balance={balances.available} /><MoneySheet childId={childId} mode="UNSAVE" balance={balances.savings} /><div className="col-span-2"><MoneySheet childId={childId} mode="WITHDRAW" balance={balances.available} /></div></div></section>;
}
