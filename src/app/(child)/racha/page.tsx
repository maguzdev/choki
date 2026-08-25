import Link from "next/link";
import { ArrowLeft, Flame, Shield, Trophy } from "lucide-react";

import { ActivityCalendar, RewardCatalog } from "@/components/child";
import { buttonVariants } from "@/components/ui/button";
import { ensureStreakUpToDate } from "@/lib/actions/streak";
import { requireChild } from "@/lib/auth/guards";
import { getChildGamificationData, getChildRewardsData } from "@/lib/data/gamification";

export default async function StreakPage() {
  const child = await requireChild();
  const sync = await ensureStreakUpToDate(child.id);
  if (sync.status === "error") throw new Error(sync.message);
  const [data, rewards] = await Promise.all([getChildGamificationData(child.id), getChildRewardsData(child.id)]);
  return <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-12 text-choco-800">
    <header className="mb-5 flex items-center gap-3"><Link href="/progreso" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Volver a mi progreso"><ArrowLeft aria-hidden="true" /></Link><div><p className="text-sm font-semibold text-streak-500">Un día a la vez</p><h1 className="font-display text-3xl font-bold">Mi racha</h1></div></header>
    <section className="grid grid-cols-2 gap-3"><article className="col-span-2 rounded-card bg-streak-500 p-5 text-white shadow-soft"><Flame className="size-8" /><p className="mt-2 text-sm">Racha actual</p><p className="font-display text-5xl font-bold tabular-nums">{data.streak.current} <span className="text-2xl">{data.streak.current === 1 ? "día" : "días"}</span></p><p className="mt-2 text-sm">{data.streak.current > 0 ? "Si hoy aún no vendes, todavía tienes todo el día." : "Tu próxima venta puede iniciar una nueva racha."}</p></article><article className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft"><Trophy className="size-6 text-points-500" /><p className="mt-2 text-sm text-choco-600">Mejor racha</p><p className="font-display text-3xl font-bold">{data.streak.best}</p></article><article className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft"><Shield className="size-6 text-goal-500" /><p className="mt-2 text-sm text-choco-600">Disponibles</p><p className="font-display text-3xl font-bold">{data.streak.protectors}</p><p className="mt-1 text-xs text-choco-600">Capacidad máxima: {data.streak.protectorMax}</p><div className="mt-2 flex gap-1.5" aria-label={`${data.streak.protectors} protectores disponibles y ${data.streak.protectorMax - data.streak.protectors} espacios libres`}>{Array.from({ length: data.streak.protectorMax }, (_, index) => <span key={index} aria-hidden="true" className={`flex size-7 items-center justify-center rounded-full border text-sm ${index < data.streak.protectors ? "border-goal-500/30 bg-goal-500/10" : "border-dashed border-cream-300 bg-white text-choco-400"}`}>{index < data.streak.protectors ? "🛡️" : "+"}</span>)}</div></article></section>
    <div className="mt-5"><ActivityCalendar days={data.streak.days} today={data.today} /></div>
    <section className="mt-7"><h2 className="font-display text-2xl font-bold">Reponer protectores</h2><p className="mb-3 text-sm leading-6 text-choco-600">Recibes 3 protectores gratuitos al iniciar. Cuando alguno cuide un día sin venta, puedes reponerlo con puntos hasta volver a tener 3.</p><RewardCatalog data={rewards} onlyProtectors /></section>
  </main>;
}
