import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";

import { GoalManager, WalletCards } from "@/components/child";
import { buttonVariants } from "@/components/ui/button";
import { requireChild } from "@/lib/auth/guards";
import { getChildWalletData } from "@/lib/data/wallet";

export default async function GoalsPage() {
  const child = await requireChild();
  const data = await getChildWalletData(child.id);
  return <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-10 text-choco-800"><header className="mb-5 flex items-center justify-between gap-3"><Link href="/" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Volver al inicio"><ArrowLeft aria-hidden="true" /></Link><div className="text-center"><p className="text-sm font-semibold text-goal-500">Esfuerzo → progreso</p><h1 className="font-display text-3xl font-bold">Mis metas</h1></div><Link href="/dinero" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Ir a mi dinero"><Wallet aria-hidden="true" /></Link></header><WalletCards balances={data.balances} /><section className="mt-5"><p className="mb-3 text-sm leading-6 text-choco-600">Separa dinero desde disponible o ahorro. Puedes pausarlo, retirarlo o registrar cuando hayas comprado tu meta.</p><GoalManager childId={child.id} goals={data.goals} balances={data.balances} /></section></main>;
}
