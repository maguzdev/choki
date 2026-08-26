import Link from "next/link";
import { ArrowLeft, Eye, PiggyBank, Target, Users } from "lucide-react";

import { ProfileManager } from "@/components/admin";
import { WalletCards } from "@/components/child";
import { buttonVariants } from "@/components/ui/button";
import { requireParent } from "@/lib/auth/guards";
import { getAdminProfilesData } from "@/lib/data/settings";
import { getAdminWalletOverview } from "@/lib/data/wallet";
import { formatCOP } from "@/lib/domain/money";

export default async function AdminProfilesPage() {
  await requireParent();
  const [profiles, children] = await Promise.all([getAdminProfilesData(), getAdminWalletOverview()]);
  return <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-12 text-choco-800">
    <header className="mb-5 flex items-start gap-3"><Link href="/admin" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Volver al panel"><ArrowLeft /></Link><div><p className="flex items-center gap-1 text-sm font-semibold text-caramel-600"><Users className="size-4" /> Accesos familiares</p><h1 className="font-display text-3xl font-bold">Perfiles</h1><p className="mt-1 text-sm text-choco-600">Administra accesos y acompaña el dinero y las metas de los niños.</p></div></header>
    <ProfileManager profiles={profiles} />
    <section className="mt-8"><div className="mb-4"><p className="flex items-center gap-1 text-sm font-semibold text-caramel-600"><Eye className="size-4" /> Solo lectura financiera</p><h2 className="font-display text-2xl font-bold">Billeteras y metas</h2></div><div className="grid gap-5 lg:grid-cols-2">{children.map((child) => <article key={child.child.id} className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-full text-3xl" style={{ backgroundColor: `${child.child.color}22` }}>{child.child.avatarEmoji}</span><div><h3 className="font-display text-2xl font-bold">{child.child.name}</h3><p className="text-sm text-choco-600">Ganancia histórica {formatCOP(child.balances.historicEarnings)}</p></div></div><div className="mt-4"><WalletCards balances={child.balances} /></div><div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-cream-100 p-3 text-sm"><p><PiggyBank className="mb-1 size-4 text-success-500" />Ahorro automático<br /><strong>{child.settings.enabled ? `${child.settings.percent} %` : "Desactivado"}</strong></p><p>Propia<br /><strong>{formatCOP(child.earnings.own)}</strong><br />Familiar<br /><strong>{formatCOP(child.earnings.family)}</strong></p></div><section className="mt-4"><h4 className="flex items-center gap-2 font-display text-xl font-bold"><Target className="size-5 text-goal-500" /> Metas</h4><div className="mt-2 space-y-2">{child.goals.map((goal) => <div key={goal.id} className="rounded-xl border border-cream-200 bg-white p-3"><div className="flex justify-between gap-3"><span className="font-semibold">{goal.emoji} {goal.name}</span><span className="text-sm font-bold text-goal-500">{goal.percent} %</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-200"><div className="h-full bg-goal-500" style={{ width: `${Math.min(100, Math.max(0, goal.percent))}%` }} /></div><p className="mt-1 text-xs text-choco-600">{formatCOP(goal.savedAmount)} de {formatCOP(goal.targetAmount)} · {goal.status}</p></div>)}{child.goals.length === 0 ? <p className="text-sm text-choco-600">Sin metas activas o completadas.</p> : null}</div></section></article>)}{children.length === 0 ? <p className="text-sm text-choco-600">No hay perfiles infantiles activos.</p> : null}</div></section>
  </main>;
}
