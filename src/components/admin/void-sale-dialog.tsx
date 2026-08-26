"use client";

import { useState, useTransition } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { voidSale } from "@/lib/actions/sales";
import type { SaleDetailData } from "@/lib/data/stats";
import { formatCOP } from "@/lib/domain/money";

export function VoidSaleDialog({ saleId, preview }: { saleId: string; preview: SaleDetailData["reversal"] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, startTransition] = useTransition();
  function confirm() {
    startTransition(async () => {
      const result = await voidSale(saleId, reason);
      if (result.status === "success") {
        toast.success(result.message);
        setReason("");
        setOpen(false);
        router.refresh();
      } else toast.error(result.message);
    });
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<Button variant="destructive" className="w-full sm:w-auto" />}><RotateCcw /> Anular venta</DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle className="flex items-center gap-2 font-display text-xl font-bold"><TriangleAlert className="size-5 text-danger-500" /> Confirmar anulación</DialogTitle><DialogDescription>Esta operación conserva la venta como anulada y revierte todos sus efectos en una sola transacción.</DialogDescription></DialogHeader>
      <section className="rounded-xl bg-cream-100 p-3 text-sm"><p className="font-bold">Se revertirá:</p><ul className="mt-2 space-y-1"><li>• {preview.stockUnits} {preview.stockUnits === 1 ? "unidad vuelve" : "unidades vuelven"} al inventario.</li>{preview.money.map((movement) => <li key={movement.childName}>• {movement.childEmoji} {movement.childName}: {formatCOP(movement.total)} ({formatCOP(movement.available)} disponible y {formatCOP(movement.savings)} ahorro).</li>)}{preview.xp > 0 ? <li>• {preview.xp} XP obtenidos directamente por la venta.</li> : null}{preview.points > 0 ? <li>• {preview.points} puntos obtenidos directamente por la venta.</li> : null}<li>• Se recalcularán la racha y los retos; los logros y premios ya otorgados se conservan.</li></ul></section>
      <label className="space-y-1 font-semibold text-choco-600">Motivo obligatorio<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} rows={3} className="w-full rounded-xl border border-cream-200 bg-white p-3 text-base text-choco-800 outline-none focus-visible:ring-2 focus-visible:ring-caramel-500" placeholder="Ej.: venta duplicada o error en el cobro" /><span className="block text-right text-xs font-normal">{reason.length}/300</span></label>
      <DialogFooter><DialogClose render={<Button variant="outline" disabled={busy} />}>Conservar venta</DialogClose><Button variant="destructive" disabled={busy || reason.trim().length < 3} onClick={confirm}>{busy ? "Anulando…" : "Sí, anular y revertir"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
