import Link from "next/link";
import { ArrowLeft, Gift } from "lucide-react";

import { RewardsManager } from "@/components/admin";
import { buttonVariants } from "@/components/ui/button";
import { requireParent } from "@/lib/auth/guards";
import { getAdminRewardsData } from "@/lib/data/gamification";

export default async function AdminRewardsPage() {
  await requireParent();
  const data = await getAdminRewardsData();
  return <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-12 text-choco-800"><header className="flex items-center gap-3"><Link href="/admin/gamificacion" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Volver a gamificación"><ArrowLeft aria-hidden="true" /></Link><div><p className="flex items-center gap-1 text-sm font-semibold text-points-500"><Gift className="size-4" /> Catálogo y entregas</p><h1 className="font-display text-3xl font-bold">Recompensas</h1></div></header><p className="mt-3 max-w-3xl text-sm leading-6 text-choco-600">El protector usa su propio precio del catálogo. Los premios normales quedan pendientes hasta marcarlos como entregados o cancelarlos con devolución de puntos.</p><div className="mt-6"><RewardsManager data={data} /></div></main>;
}
