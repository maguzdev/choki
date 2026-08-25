import Link from "next/link";
import { ArrowLeft, Coins, Shield } from "lucide-react";

import { RedemptionHistory, RewardCatalog } from "@/components/child";
import { buttonVariants } from "@/components/ui/button";
import { ensureStreakUpToDate } from "@/lib/actions/streak";
import { requireChild } from "@/lib/auth/guards";
import { getChildRewardsData } from "@/lib/data/gamification";

export default async function RewardsPage() {
  const child = await requireChild();
  const sync = await ensureStreakUpToDate(child.id);
  if (sync.status === "error") throw new Error(sync.message);
  const data = await getChildRewardsData(child.id);
  return <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-12 text-choco-800">
    <header className="mb-5 flex items-center gap-3"><Link href="/" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Volver al inicio"><ArrowLeft aria-hidden="true" /></Link><div><p className="text-sm font-semibold text-caramel-600">Tu esfuerzo tiene recompensa</p><h1 className="font-display text-3xl font-bold">Premios</h1></div></header>
    <section className="rounded-card bg-choco-800 p-5 text-cream-50 shadow-soft"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-full bg-points-500/20"><Coins className="size-7 text-points-500" /></span><div><p className="text-sm text-cream-200">Puntos disponibles</p><p className="font-display text-4xl font-bold tabular-nums">{data.points}</p></div></div><p className="mt-4 flex items-center gap-2 border-t border-cream-50/15 pt-3 text-sm text-cream-200"><Shield className="size-4" /> {data.protectors} {data.protectors === 1 ? "protector disponible" : "protectores disponibles"} · capacidad máxima {data.protectorMax}</p></section>
    <section className="mt-7"><h2 className="font-display text-2xl font-bold">Catálogo</h2><p className="mb-3 text-sm text-choco-600">Los premios normales quedan pendientes hasta que un adulto los entregue. Los protectores se activan de inmediato.</p><RewardCatalog data={data} /></section>
    <div className="mt-8"><RedemptionHistory redemptions={data.redemptions} today={data.today} /></div>
  </main>;
}
