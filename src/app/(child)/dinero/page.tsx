import Link from "next/link";
import { ArrowLeft, ArrowRight, HandCoins, Users } from "lucide-react";

import { SavingSettingsForm, WalletActions, WalletCards, WalletHistory } from "@/components/child";
import { buttonVariants } from "@/components/ui/button";
import { requireChild } from "@/lib/auth/guards";
import { getChildWalletData } from "@/lib/data/wallet";
import { formatCOP } from "@/lib/domain/money";

export default async function MoneyPage() {
  const child = await requireChild();
  const data = await getChildWalletData(child.id);
  const currentTotal = data.balances.available + data.balances.savings + data.balances.inGoals;
  return <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-10 text-choco-800">
    <header className="mb-5 flex items-center justify-between gap-3"><Link href="/" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Volver al inicio"><ArrowLeft aria-hidden="true" /></Link><div className="text-center"><p className="text-sm font-semibold text-caramel-600">{data.child.avatarEmoji} {data.child.name}</p><h1 className="font-display text-3xl font-bold">Mi dinero</h1></div><Link href="/metas" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Ir a mis metas"><ArrowRight aria-hidden="true" /></Link></header>
    <WalletCards balances={data.balances} />
    <section className="mt-4 rounded-card bg-choco-800 p-5 text-cream-50 shadow-soft"><p className="text-sm text-cream-200">Dinero actual en mis tres bolsillos</p><p className="mt-1 font-display text-4xl font-bold tabular-nums">{formatCOP(currentTotal)}</p><div className="mt-4 grid grid-cols-2 gap-3 border-t border-cream-50/15 pt-4"><div><p className="flex items-center gap-1 text-xs text-cream-200"><HandCoins className="size-4" /> Ganancia propia</p><p className="mt-1 font-bold tabular-nums">{formatCOP(data.earnings.own)}</p></div><div><p className="flex items-center gap-1 text-xs text-cream-200"><Users className="size-4" /> Ganancia familiar</p><p className="mt-1 font-bold tabular-nums">{formatCOP(data.earnings.family)}</p></div></div><p className="mt-3 text-xs text-cream-200">Ganancia histórica: {formatCOP(data.balances.historicEarnings)}</p></section>
    <div className="mt-4 space-y-4"><SavingSettingsForm childId={child.id} settings={data.settings} /><WalletActions childId={child.id} balances={data.balances} /></div>
    <WalletHistory movements={data.movements} today={data.today} />
  </main>;
}
