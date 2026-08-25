"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PartyPopper } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { SaleSummary } from "@/lib/actions/sales";
import { formatCOP } from "@/lib/domain/money";

export function SaleResultSheet({ open, summary, message, homeHref, onNewSale }: { open: boolean; summary?: SaleSummary; message?: string; homeHref: string; onNewSale: () => void }) {
  useEffect(() => {
    if (!open || !summary?.shouldCelebrate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void import("canvas-confetti").then(({ default: confetti }) => confetti({ particleCount: 90, spread: 65, origin: { y: 0.65 }, colors: ["#D98C3F", "#3B241C", "#FFF7E8", "#7C5CFF"] }));
  }, [open, summary]);
  if (!summary) return null;

  return <Sheet open={open} onOpenChange={() => undefined}>
    <SheetContent side="bottom" showCloseButton={false} className="max-h-[100dvh] overflow-y-auto bg-cream-50 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 text-choco-800 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
      <SheetHeader className="items-center p-0 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-caramel-400 text-choco-900"><PartyPopper aria-hidden="true" className="size-8" /></span>
        <SheetTitle className="mt-3 font-display text-3xl font-bold">{summary.duplicate ? "Venta ya registrada" : "¡Venta registrada!"}</SheetTitle>
        <SheetDescription className="text-choco-600">{message ?? `Venta #${summary.saleId.slice(0, 4).toUpperCase()}`}</SheetDescription>
      </SheetHeader>
      <div className="mt-5 space-y-3">
        <div className="rounded-card bg-choco-800 p-5 text-center text-cream-50"><p className="text-sm text-cream-200">Vendiste</p><p className="font-display text-4xl font-bold tabular-nums">{formatCOP(summary.itemsTotal)}</p><p className="mt-1 text-sm">{summary.unitsTotal} {summary.unitsTotal === 1 ? "unidad" : "unidades"}</p></div>
        {summary.tipTotal > 0 ? <p className="rounded-xl bg-success-500/10 p-3 text-center font-semibold text-success-500">Propina: {formatCOP(summary.tipTotal)}</p> : null}
        {summary.sellerType === "CHILD" ? <>
          <div className="rounded-card border border-cream-200 bg-white p-4 text-center"><p className="text-sm text-choco-600">Ganaste</p><p className="font-display text-3xl font-bold text-caramel-600">{formatCOP(summary.earningsTotal)}</p></div>
          {summary.xpEarned != null && summary.pointsEarned != null ? <div className="grid grid-cols-2 gap-2 text-center"><p className="rounded-xl bg-xp-500/10 p-3 font-bold text-xp-500">+{summary.xpEarned} XP</p><p className="rounded-xl bg-points-500/10 p-3 font-bold text-choco-800">+{summary.pointsEarned} puntos</p></div> : null}
          {summary.currentStreak != null ? <p className="rounded-xl bg-streak-500/10 p-3 text-center font-semibold text-streak-500">🔥 Racha: {summary.currentStreak} días</p> : null}
          {summary.levelName ? <div className="rounded-xl border border-xp-500/20 bg-xp-500/5 p-3 text-center"><p className="font-semibold">Tu nivel actual es {summary.levelName}.</p><p className="mt-1 text-sm text-choco-600">{summary.xpToNextLevel != null ? `Te faltan ${summary.xpToNextLevel} XP para alcanzar el siguiente nivel.` : "Ya alcanzaste el nivel más alto disponible."}</p></div> : null}
        </> : <section className="rounded-card border border-cream-200 bg-white p-4"><h3 className="font-display text-xl font-bold">Reparto familiar</h3><div className="mt-2 space-y-2">{summary.allocations.map((allocation) => <div key={allocation.childId} className="flex justify-between gap-3"><span>{allocation.childName}</span><strong className="tabular-nums">{formatCOP(allocation.amount)}</strong></div>)}</div></section>}
        {summary.unlockedAchievements.map((name) => <p key={name} className="rounded-xl bg-points-500/10 p-3 text-center font-semibold">🏅 Logro: {name}</p>)}
        {summary.completedChallenges.map((name) => <p key={name} className="rounded-xl bg-goal-500/10 p-3 text-center font-semibold">🎯 Reto: {name}</p>)}
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button type="button" className="min-h-12" onClick={onNewSale}>Nueva venta</Button><Link href={homeHref} className={buttonVariants({ variant: "outline", className: "min-h-12" })}>Ir al inicio</Link></div>
    </SheetContent>
  </Sheet>;
}
