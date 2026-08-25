"use client";

import { useState, useTransition } from "react";
import { History, Shield, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MonthlyHistory } from "@/components/shared/monthly-history";
import { redeemReward } from "@/lib/actions/rewards";
import type { ChildRewardsData } from "@/lib/data/gamification";

type Reward = ChildRewardsData["rewards"][number];

export function RewardCatalog({ data, onlyProtectors = false }: { data: ChildRewardsData; onlyProtectors?: boolean }) {
  const [selected, setSelected] = useState<Reward | null>(null);
  const [pending, startTransition] = useTransition();
  const rewards = onlyProtectors ? data.rewards.filter((reward) => reward.type === "STREAK_PROTECTOR") : data.rewards;
  const confirm = () => {
    if (!selected) return;
    startTransition(async () => {
      const result = await redeemReward({ childId: data.childId, rewardId: selected.id });
      if (result.status === "success") toast.success(result.message);
      else toast.error(result.message);
      if (result.status === "success") setSelected(null);
    });
  };
  return <>
    <div className={onlyProtectors ? "space-y-3" : "grid gap-3 sm:grid-cols-2"}>{rewards.map((reward) => {
      const insufficient = data.points < reward.costPoints;
      const soldOut = reward.stock !== null && reward.stock <= 0;
      const maxProtectors = reward.type === "STREAK_PROTECTOR" && data.protectors >= data.protectorMax;
      const disabled = insufficient || soldOut || maxProtectors;
      const reason = soldOut ? "Sin existencias" : maxProtectors ? `Capacidad completa: ${data.protectorMax} de ${data.protectorMax}` : insufficient ? `Te faltan ${reward.costPoints - data.points} pts` : reward.type === "STREAK_PROTECTOR" ? "Reponer 1 protector" : "Canjear premio";
      return <article key={reward.id} className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft"><div className="flex items-start gap-3"><span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-points-500/15 text-3xl">{reward.icon}</span><div className="min-w-0 flex-1"><h3 className="font-display text-xl font-bold text-choco-800">{reward.name}</h3><p className="text-sm leading-5 text-choco-600">{reward.description}</p><p className="mt-2 font-bold text-caramel-600">🪙 {reward.costPoints} puntos</p>{reward.type === "STREAK_PROTECTOR" ? <p className="text-xs text-choco-600">Tienes {data.protectors} disponible{data.protectors === 1 ? "" : "s"} · capacidad máxima {data.protectorMax}</p> : reward.stock !== null ? <p className="text-xs text-choco-600">Quedan {reward.stock}</p> : <p className="text-xs text-choco-600">Disponibilidad ilimitada</p>}</div></div><Button type="button" className="mt-4 w-full" variant={disabled ? "secondary" : "default"} disabled={disabled} onClick={() => setSelected(reward)}>{reward.type === "STREAK_PROTECTOR" ? <Shield aria-hidden="true" /> : <ShoppingBag aria-hidden="true" />}{reason}</Button></article>;
    })}{rewards.length === 0 ? <p className="rounded-card border border-cream-200 bg-cream-50 p-5 text-sm text-choco-600">No hay premios activos configurados.</p> : null}</div>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open && !pending) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>Confirmar canje</DialogTitle><DialogDescription>Vas a usar {selected?.costPoints ?? 0} puntos para {selected?.name}. Esta acción quedará en tu historial.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => setSelected(null)}>Volver</Button><Button type="button" disabled={pending} onClick={confirm}>{pending ? "Canjeando…" : "Sí, canjear"}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}

export function RedemptionHistory({ redemptions, today }: { redemptions: ChildRewardsData["redemptions"]; today: string }) {
  const labels = { PENDING: "Pendiente de entrega", DELIVERED: "Entregado", CANCELLED: "Cancelado" } as const;
  return <section><div className="flex items-center gap-2"><History aria-hidden="true" className="size-5 text-caramel-600" /><h2 className="font-display text-2xl font-bold text-choco-800">Mis canjes</h2></div><MonthlyHistory idPrefix="redemptions" items={redemptions} today={today} emptyMessage="No hay canjes" getKey={(redemption) => redemption.id} renderItem={(redemption) => <article className="flex items-center justify-between gap-3 rounded-xl border border-cream-200 bg-white p-3"><div><p className="font-bold">{redemption.rewardName}</p><p className="text-xs text-choco-600">{labels[redemption.status]}</p></div><span className="font-bold text-caramel-600">−{redemption.pointsSpent} pts</span></article>} /></section>;
}
