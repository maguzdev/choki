import { ArrowLeft, Award, Banknote, CalendarDays, Flame, HandCoins, Landmark, PackageCheck, ReceiptText, Smartphone, Trophy, Users, WalletCards, Zap } from "lucide-react";
import Link from "next/link";

import { PeriodFilter, StatCard } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { ensureStreakUpToDate } from "@/lib/actions/streak";
import { requireChild } from "@/lib/auth/guards";
import { getChildGamificationData } from "@/lib/data/gamification";
import { getChildPeriodStats, type StatsParams } from "@/lib/data/stats";
import { formatCOP } from "@/lib/domain/money";

export default async function ChildStatsPage({ searchParams }: { searchParams: Promise<StatsParams> }) {
  const child = await requireChild();
  const params = await searchParams;
  const sync = await ensureStreakUpToDate(child.id);
  if (sync.status === "error") throw new Error(sync.message);
  const [stats, game] = await Promise.all([getChildPeriodStats(child.id, params), getChildGamificationData(child.id)]);
  const level = game.levels.find((item) => item.id === game.level.current.id)!;
  return <main className="mx-auto w-full max-w-5xl px-4 py-5 pb-12 text-choco-800">
    <header className="mb-5 flex items-center gap-3"><Link href="/" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Volver al inicio"><ArrowLeft /></Link><div><p className="text-sm font-semibold text-caramel-600">Tus números, explicados</p><h1 className="font-display text-3xl font-bold">Mis estadísticas</h1></div></header>
    <PeriodFilter range={stats.range} today={stats.today} />
    <p className="my-4 text-sm text-choco-600">Resultados del <strong>{stats.range.from}</strong> al <strong>{stats.range.to}</strong>. XP, puntos y rachas muestran tu estado actual.</p>
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="16 indicadores personales">
      <StatCard icon={<ReceiptText className="size-5 text-caramel-600" />} label="Ventas propias" value={String(stats.ownSales.count)} />
      <StatCard icon={<Banknote className="size-5 text-success-500" />} label="Total vendido" value={formatCOP(stats.ownSales.revenue)} />
      <StatCard icon={<PackageCheck className="size-5 text-goal-500" />} label="Unidades vendidas" value={String(stats.ownSales.units)} />
      <StatCard icon={<HandCoins className="size-5 text-caramel-600" />} label="Ganancia propia" value={formatCOP(stats.ownEarnings)} />
      <StatCard icon={<Users className="size-5 text-xp-500" />} label="Ganancia familiar" value={formatCOP(stats.familyEarnings)} />
      <StatCard icon={<WalletCards className="size-5 text-success-500" />} label="Ganancia total" value={formatCOP(stats.totalEarnings)} />
      <StatCard icon={<Award className="size-5 text-points-500" />} label="Propinas propias" value={formatCOP(stats.ownSales.tips)} />
      <StatCard icon={<Landmark className="size-5 text-caramel-600" />} label="Promedio por venta" value={formatCOP(stats.ownSales.averageTicket)} />
      <StatCard icon={<Trophy className="size-5 text-points-500" />} label="Mejor venta" value={formatCOP(stats.ownSales.bestSale)} />
      <StatCard icon={<CalendarDays className="size-5 text-goal-500" />} label="Días con ventas" value={String(stats.ownSales.activeDays)} />
      <StatCard icon={<Banknote className="size-5 text-choco-600" />} label="Ventas en efectivo" value={String(stats.ownSales.cashCount)} />
      <StatCard icon={<Smartphone className="size-5 text-choco-600" />} label="Transferencias" value={String(stats.ownSales.transferCount)} />
      <StatCard icon={<Zap className="size-5 text-xp-500" />} label="Experiencia" value={`${game.xp} XP`} detail={`Nivel ${level.number} · ${level.name}`} />
      <StatCard icon={<span aria-hidden="true">🪙</span>} label="Puntos disponibles" value={String(game.points)} />
      <StatCard icon={<Flame className="size-5 text-streak-500" />} label="Racha actual" value={`${game.streak.current} días`} />
      <StatCard icon={<Trophy className="size-5 text-streak-500" />} label="Mejor racha" value={`${game.streak.best} días`} />
    </section>
    <Link href={`/mis-ventas?period=${stats.range.preset}&from=${stats.range.from}&to=${stats.range.to}`} className={buttonVariants({ variant: "outline", className: "mt-5 min-h-12 w-full" })}>Ver las ventas de este periodo</Link>
  </main>;
}
