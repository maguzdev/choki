import Link from "next/link";
import { ArrowLeft, Flame, Gift, Star } from "lucide-react";

import { AchievementsGrid, ChallengesList, CurrentLevelCard, LevelsList, RankingList, ScoreHistory } from "@/components/child";
import { buttonVariants } from "@/components/ui/button";
import { ensureStreakUpToDate } from "@/lib/actions/streak";
import { requireChild } from "@/lib/auth/guards";
import { getChildGamificationData } from "@/lib/data/gamification";

export default async function ProgressPage() {
  const child = await requireChild();
  const sync = await ensureStreakUpToDate(child.id);
  if (sync.status === "error") throw new Error(sync.message);
  const data = await getChildGamificationData(child.id);
  return <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-12 text-choco-800">
    <header className="mb-5 flex items-center justify-between gap-3"><Link href="/" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Volver al inicio"><ArrowLeft aria-hidden="true" /></Link><div className="text-center"><p className="text-sm font-semibold text-xp-500">Esfuerzo que se nota</p><h1 className="font-display text-3xl font-bold">Mi progreso</h1></div><span className="flex size-11 items-center justify-center rounded-full bg-xp-500/10"><Star className="size-5 text-xp-500" /></span></header>
    <CurrentLevelCard data={data} />
    <nav className="mt-4 grid grid-cols-2 gap-3" aria-label="Más opciones de gamificación"><Link href="/racha" className={buttonVariants({ variant: "outline", className: "min-h-12" })}><Flame className="text-streak-500" /> Mi racha</Link><Link href="/premios" className={buttonVariants({ variant: "outline", className: "min-h-12" })}><Gift className="text-points-500" /> Premios</Link></nav>
    <div className="mt-7 space-y-8"><LevelsList levels={data.levels} xp={data.xp} /><AchievementsGrid achievements={data.achievements} /><ChallengesList challenges={data.challenges} /><ScoreHistory movements={data.history} today={data.today} /><RankingList ranking={data.ranking} childId={child.id} /></div>
  </main>;
}
