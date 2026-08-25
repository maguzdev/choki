import { Flame, HandCoins, Landmark, PiggyBank, Target, Users } from "lucide-react";
import Link from "next/link";

import { ProgressBar } from "@/components/shared/stats-ui";
import type { ChildGamificationData } from "@/lib/data/gamification";
import type { ChildPeriodStats } from "@/lib/data/stats";
import type { ChildWalletData } from "@/lib/data/wallet";
import { weekDays } from "@/lib/domain/dates";
import { formatCOP } from "@/lib/domain/money";

export function EarningsSummary({ data }: { data: ChildWalletData }) {
  const total = data.earnings.own + data.earnings.family;
  return <section className="rounded-card bg-choco-800 p-5 text-cream-50 shadow-soft"><p className="text-sm text-cream-200">Todo lo que has ganado</p><p className="mt-1 font-display text-4xl font-bold tabular-nums">{formatCOP(total)}</p><div className="mt-4 grid grid-cols-2 gap-3 border-t border-cream-50/15 pt-4"><div><p className="flex items-center gap-1 text-xs text-cream-200"><HandCoins className="size-4" /> Ganancia propia</p><p className="mt-1 font-bold tabular-nums">{formatCOP(data.earnings.own)}</p></div><div><p className="flex items-center gap-1 text-xs text-cream-200"><Users className="size-4" /> Ganancia familiar</p><p className="mt-1 font-bold tabular-nums">{formatCOP(data.earnings.family)}</p></div></div></section>;
}

export function CompactWallet({ data }: { data: ChildWalletData }) {
  return <section className="grid grid-cols-2 gap-3" aria-label="Dinero disponible y ahorro"><Link href="/dinero" className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft"><Landmark className="size-6 text-caramel-600" /><p className="mt-2 text-sm font-semibold text-choco-600">Disponible</p><p className="mt-1 font-display text-2xl font-bold tabular-nums">{formatCOP(data.balances.available)}</p></Link><Link href="/dinero" className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft"><PiggyBank className="size-6 text-success-500" /><p className="mt-2 text-sm font-semibold text-choco-600">Ahorro</p><p className="mt-1 font-display text-2xl font-bold tabular-nums">{formatCOP(data.balances.savings)}</p></Link></section>;
}

export function StreakSummary({ data }: { data: ChildGamificationData }) {
  const days = weekDays(data.today);
  const byDate = new Map(data.streak.days.map((day) => [day.date, day]));
  const label = new Intl.DateTimeFormat("es-CO", { weekday: "narrow", timeZone: "UTC" });
  return <Link href="/racha" className="block rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft"><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-1 text-sm font-semibold text-streak-500"><Flame className="size-5" /> Mi racha</p><p className="mt-1 font-display text-3xl font-bold">{data.streak.current} {data.streak.current === 1 ? "día" : "días"}</p></div><p className="text-right text-xs text-choco-600">Mejor: <strong>{data.streak.best}</strong><br />🛡️ {data.streak.protectors}/{data.streak.protectorMax}</p></div><div className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Actividad de esta semana">{days.map((date) => { const item = byDate.get(date); const future = date > data.today; const icon = future ? "·" : item?.status === "SOLD" ? "🔥" : item?.status === "PROTECTED" ? "🛡️" : item?.status === "MISSED" ? "✖️" : "○"; return <div key={date} className={`rounded-xl py-2 text-center ${date === data.today ? "bg-caramel-400/20 ring-1 ring-caramel-500" : "bg-cream-100"}`}><span className="block text-xs font-bold uppercase text-choco-600">{label.format(new Date(`${date}T12:00:00Z`))}</span><span className="mt-1 block text-base" aria-label={`${date}: ${icon}`}>{icon}</span></div>; })}</div></Link>;
}

export function TodaySummary({ data }: { data: ChildPeriodStats }) {
  return <section className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft"><h2 className="font-display text-xl font-bold">Hoy</h2><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-cream-100 p-3"><p className="font-display text-2xl font-bold">{data.ownSales.count}</p><p className="text-xs text-choco-600">Ventas</p></div><div className="rounded-xl bg-cream-100 p-3"><p className="font-display text-2xl font-bold">{data.ownSales.units}</p><p className="text-xs text-choco-600">Unidades</p></div><div className="rounded-xl bg-success-500/10 p-3"><p className="font-display text-lg font-bold text-success-500 tabular-nums">{formatCOP(data.ownEarnings)}</p><p className="text-xs text-choco-600">Ganancia</p></div></div></section>;
}

export function PrimaryGoalSummary({ data }: { data: ChildWalletData }) {
  const goal = data.goals.find((item) => item.isDisplayedPrimary);
  if (!goal) return <Link href="/metas" className="block rounded-card border border-dashed border-goal-500/40 bg-goal-500/5 p-5 text-center"><Target className="mx-auto size-7 text-goal-500" /><p className="mt-2 font-display text-xl font-bold">Crea tu primera meta</p><p className="text-sm text-choco-600">Convierte tu esfuerzo en algo que quieras conseguir.</p></Link>;
  return <Link href="/metas" className="block rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft"><div className="flex items-start gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-goal-500/10 text-2xl">{goal.emoji}</span><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-goal-500">Mi meta principal</p><h2 className="font-display text-xl font-bold">{goal.name}</h2></div><span className="text-sm font-bold text-goal-500">{goal.percent} %</span></div><div className="mt-3"><ProgressBar value={goal.percent} label={`Progreso de ${goal.name}`} /></div><p className="mt-2 text-sm text-choco-600">{formatCOP(goal.savedAmount)} de {formatCOP(goal.targetAmount)}</p></Link>;
}
