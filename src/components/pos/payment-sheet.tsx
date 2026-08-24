"use client";

import { useMemo, useState, useTransition } from "react";
import { Banknote, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { registerSale, type SaleActionResult, type SaleSummary } from "@/lib/actions/sales";
import type { PosSeller } from "@/lib/data/pos";
import { formatCOP } from "@/lib/domain/money";
import { quickCashOptions } from "@/lib/domain/sale";
import { CashPad } from "./cash-pad";

type PaymentMethod = "CASH" | "TRANSFER";
type CashPadTarget = "received" | "change" | "transfer-tip" | null;

export function PaymentSheet({ open, onOpenChange, saleId, seller, items, itemsTotal, onCompleted }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  seller: PosSeller;
  items: { productId: string; quantity: number }[];
  itemsTotal: number;
  onCompleted: (summary: SaleSummary, message?: string) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [cashReceived, setCashReceived] = useState(itemsTotal);
  const [tipMode, setTipMode] = useState<"NONE" | "ALL" | "PARTIAL">("NONE");
  const [partialChange, setPartialChange] = useState(0);
  const [transferTip, setTransferTip] = useState(0);
  const [padTarget, setPadTarget] = useState<CashPadTarget>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const quickOptions = useMemo(() => quickCashOptions(itemsTotal), [itemsTotal]);
  const expectedChange = Math.max(0, cashReceived - itemsTotal);
  const changeGiven = tipMode === "ALL" ? 0 : tipMode === "PARTIAL" ? partialChange : expectedChange;
  const cashTip = Math.max(0, expectedChange - changeGiven);
  const invalidCash = cashReceived < itemsTotal || changeGiven > expectedChange;

  function changeReceived(value: number) {
    setCashReceived(value);
    setTipMode("NONE");
    setPartialChange(Math.max(0, value - itemsTotal));
    setError("");
  }

  function submit() {
    setError("");
    startTransition(async () => {
      let result: SaleActionResult;
      try {
        result = await registerSale({
          saleId,
          sellerId: seller.id,
          sellerType: seller.type,
          paymentMethod: method,
          cashReceived: method === "CASH" ? cashReceived : null,
          changeGiven: method === "CASH" ? changeGiven : null,
          transferTip: method === "TRANSFER" ? transferTip : 0,
          items,
        });
      } catch {
        setError("Se perdió la conexión. Reintenta con este mismo pago para comprobar si la venta quedó registrada.");
        return;
      }
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      onCompleted(result.summary, result.message);
    });
  }

  const padValue = padTarget === "received" ? cashReceived : padTarget === "change" ? partialChange : transferTip;
  const padLabel = padTarget === "received" ? "Dinero recibido" : padTarget === "change" ? "Cambio entregado" : "Propina por transferencia";
  function setPadValue(value: number) {
    if (padTarget === "received") changeReceived(value);
    else if (padTarget === "change") { setPartialChange(value); setTipMode("PARTIAL"); setError(""); }
    else if (padTarget === "transfer-tip") setTransferTip(value);
  }

  return <Sheet open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
    <SheetContent side="bottom" className="h-[100dvh] max-h-[100dvh] gap-0 overflow-y-auto bg-cream-50 p-0 text-choco-800 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2" showCloseButton={!pending}>
      <SheetHeader className="border-b border-cream-200 px-4 pb-4 pt-5 text-center">
        <SheetDescription className="text-sm font-semibold text-choco-600">Total a cobrar</SheetDescription>
        <SheetTitle className="font-display text-4xl font-bold text-choco-800">{formatCOP(itemsTotal)}</SheetTitle>
      </SheetHeader>
      <div className="space-y-4 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-2" aria-label="Método de pago">
          <button type="button" onClick={() => { setMethod("CASH"); setPadTarget(null); setError(""); }} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border font-semibold ${method === "CASH" ? "border-caramel-600 bg-caramel-400/30" : "border-cream-200 bg-white"}`}><Banknote aria-hidden="true" className="size-5" /> Efectivo</button>
          <button type="button" onClick={() => { setMethod("TRANSFER"); setPadTarget(null); setError(""); }} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border font-semibold ${method === "TRANSFER" ? "border-caramel-600 bg-caramel-400/30" : "border-cream-200 bg-white"}`}><Smartphone aria-hidden="true" className="size-5" /> Transferencia</button>
        </div>

        {method === "CASH" ? <>
          <section>
            <p className="text-sm font-semibold">¿Con cuánto te pagan?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {quickOptions.map((option) => <button key={option} type="button" onClick={() => { changeReceived(option); setPadTarget(null); }} className={`min-h-11 rounded-xl border px-3 font-semibold tabular-nums ${cashReceived === option && padTarget !== "received" ? "border-caramel-600 bg-caramel-400/30" : "border-cream-200 bg-white"}`}>{formatCOP(option)}</button>)}
              <button type="button" onClick={() => setPadTarget(padTarget === "received" ? null : "received")} className="min-h-11 rounded-xl border border-cream-200 bg-white px-4 font-semibold">Otro</button>
            </div>
          </section>
          {padTarget === "received" ? <CashPad value={padValue} onChange={setPadValue} label={padLabel} /> : null}
          {cashReceived >= itemsTotal ? <section className={`rounded-card p-4 text-center ${cashTip > 0 ? "bg-success-500/10" : "bg-caramel-400"}`} aria-live="polite">
            <p className="font-semibold">{cashTip > 0 ? "Propina 🎉" : "Debes devolver"}</p>
            <p className="mt-1 font-display text-4xl font-bold tabular-nums">{formatCOP(cashTip > 0 ? cashTip : expectedChange)}</p>
            {cashTip > 0 && changeGiven > 0 ? <p className="mt-1 text-sm">Devuelves {formatCOP(changeGiven)}</p> : null}
          </section> : <p className="rounded-xl bg-danger-500/10 p-3 text-sm font-semibold text-danger-500">Faltan {formatCOP(itemsTotal - cashReceived)} para cubrir la venta.</p>}
          {expectedChange > 0 ? <section className="space-y-2">
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-cream-200 bg-white px-3 font-semibold"><input type="checkbox" checked={tipMode === "ALL"} onChange={(event) => { setTipMode(event.target.checked ? "ALL" : "NONE"); setPadTarget(null); }} className="size-5 accent-caramel-600" /> El cliente no quiere el cambio</label>
            <button type="button" onClick={() => { setTipMode("PARTIAL"); setPartialChange(Math.min(partialChange, expectedChange)); setPadTarget(padTarget === "change" ? null : "change"); }} className="min-h-12 w-full rounded-xl border border-cream-200 bg-white px-3 text-left font-semibold">Devolví otra cantidad…</button>
            {padTarget === "change" ? <CashPad value={padValue} onChange={setPadValue} label={padLabel} /> : null}
            {changeGiven > expectedChange ? <p className="text-sm font-semibold text-danger-500">No puedes devolver más que el cambio esperado.</p> : null}
          </section> : null}
        </> : <section className="space-y-3">
          <div className="rounded-card bg-cream-100 p-4 text-center"><p className="text-sm text-choco-600">Pago por transferencia</p><p className="mt-1 font-display text-2xl font-bold">Sin cálculo de cambio</p></div>
          <button type="button" onClick={() => setPadTarget(padTarget === "transfer-tip" ? null : "transfer-tip")} className="min-h-12 w-full rounded-xl border border-cream-200 bg-white px-3 text-left font-semibold">¿Te dieron algo de más? <span className="float-right tabular-nums text-caramel-600">{formatCOP(transferTip)}</span></button>
          {padTarget === "transfer-tip" ? <CashPad value={padValue} onChange={setPadValue} label={padLabel} /> : null}
        </section>}

        {error ? <p className="rounded-xl bg-danger-500/10 p-3 text-sm font-semibold text-danger-500" role="alert">{error}</p> : null}
        <Button type="button" className="min-h-12 w-full text-base" disabled={pending || (method === "CASH" && invalidCash)} onClick={submit}>{pending ? "Registrando…" : "Confirmar venta"}</Button>
      </div>
    </SheetContent>
  </Sheet>;
}
