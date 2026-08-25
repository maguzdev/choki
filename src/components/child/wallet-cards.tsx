import { Landmark, PiggyBank, Target } from "lucide-react";

import type { WalletBalances } from "@/lib/data/wallet";
import { formatCOP } from "@/lib/domain/money";

const cards = [
  { key: "available", label: "Disponible", icon: Landmark, tone: "bg-caramel-400/25 text-caramel-600" },
  { key: "savings", label: "Ahorro", icon: PiggyBank, tone: "bg-success-500/10 text-success-500" },
  { key: "inGoals", label: "En metas", icon: Target, tone: "bg-goal-500/10 text-goal-500" },
] as const;

export function WalletCards({ balances }: { balances: WalletBalances }) {
  return <section className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Saldos actuales">
    {cards.map(({ key, label, icon: Icon, tone }, index) => <article key={key} className={`rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft ${index === 2 ? "col-span-2 sm:col-span-1" : ""}`}>
      <span className={`flex size-10 items-center justify-center rounded-xl ${tone}`}><Icon aria-hidden="true" className="size-5" /></span>
      <p className="mt-3 text-sm font-semibold text-choco-600">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-choco-800">{formatCOP(balances[key])}</p>
    </article>)}
  </section>;
}
