import { BarChart3, Gift, ListOrdered } from "lucide-react";
import Link from "next/link";

import { CompactWallet, CurrentLevelCard, EarningsSummary, PrimaryGoalSummary, StreakSummary, TodaySummary } from "@/components/child";
import { buttonVariants } from "@/components/ui/button";
import { ensureStreakUpToDate } from "@/lib/actions/streak";
import { requireChild } from "@/lib/auth/guards";
import { getChildGamificationData } from "@/lib/data/gamification";
import { getChildPeriodStats } from "@/lib/data/stats";
import { getChildWalletData } from "@/lib/data/wallet";

export default async function ChildHomePage() {
  const profile = await requireChild();
  const sync = await ensureStreakUpToDate(profile.id);
  if (sync.status === "error") throw new Error(sync.message);
  const [wallet, gamification, today] = await Promise.all([
    getChildWalletData(profile.id), getChildGamificationData(profile.id), getChildPeriodStats(profile.id, { period: "TODAY" }),
  ]);

  return <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-8 text-choco-800">
    <header className="mb-5"><p className="font-semibold text-caramel-600">{profile.avatar_emoji} {profile.name}</p><h1 className="font-display text-4xl font-bold">¡Hola, {profile.name}!</h1><p className="mt-1 text-sm text-choco-600">Así va tu esfuerzo hoy.</p></header>
    <div className="space-y-4"><EarningsSummary data={wallet} /><CompactWallet data={wallet} /><CurrentLevelCard data={gamification} /><StreakSummary data={gamification} /><TodaySummary data={today} /><PrimaryGoalSummary data={wallet} /></div>
    <nav className="mt-4 grid grid-cols-3 gap-2" aria-label="Accesos del dashboard"><Link href="/estadisticas" className={buttonVariants({ variant: "outline", className: "min-h-12 px-2 text-xs sm:text-sm" })}><BarChart3 className="size-4" /> Estadísticas</Link><Link href="/mis-ventas" className={buttonVariants({ variant: "outline", className: "min-h-12 px-2 text-xs sm:text-sm" })}><ListOrdered className="size-4" /> Mis ventas</Link><Link href="/premios" className={buttonVariants({ variant: "outline", className: "min-h-12 px-2 text-xs sm:text-sm" })}><Gift className="size-4" /> Premios</Link></nav>
    <div className="sticky bottom-3 z-20 mt-5 rounded-2xl bg-cream-100/95 p-2 shadow-[0_8px_30px_rgba(59,36,28,.2)] backdrop-blur"><Link href="/vender" className={buttonVariants({ className: "min-h-14 w-full text-base" })}>Registrar venta</Link></div>
  </main>;
}
