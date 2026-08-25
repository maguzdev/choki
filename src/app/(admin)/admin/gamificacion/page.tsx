import Link from "next/link";
import { ArrowLeft, Gift, Settings2 } from "lucide-react";

import { GamificationManager } from "@/components/admin";
import { buttonVariants } from "@/components/ui/button";
import { finishExpiredChallenges } from "@/lib/actions/gamification";
import { requireParent } from "@/lib/auth/guards";
import { getAdminGamificationData } from "@/lib/data/gamification";

export default async function AdminGamificationPage() {
  await requireParent();
  await finishExpiredChallenges();
  const data = await getAdminGamificationData();
  return <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-12 text-choco-800"><header className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Link href="/admin" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Volver al panel"><ArrowLeft aria-hidden="true" /></Link><div><p className="flex items-center gap-1 text-sm font-semibold text-xp-500"><Settings2 className="size-4" /> Motor configurable</p><h1 className="font-display text-3xl font-bold">Gamificación</h1></div></div><Link href="/admin/recompensas" className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Administrar recompensas"><Gift aria-hidden="true" /></Link></header><p className="mt-3 max-w-3xl text-sm leading-6 text-choco-600">Configura niveles, XP, puntos, logros y retos. Los cambios de reglas solo afectan nuevas ventas; el historial ganado no se recalcula.</p><div className="mt-6"><GamificationManager data={data} /></div></main>;
}
