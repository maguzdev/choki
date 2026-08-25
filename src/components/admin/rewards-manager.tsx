"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { MonthlyHistory } from "@/components/shared/monthly-history";
import { Button } from "@/components/ui/button";
import { FormSwitch } from "@/components/ui/form-switch";
import { Input } from "@/components/ui/input";
import { deleteReward, saveReward, updateRedemption, type RewardActionResult } from "@/lib/actions/rewards";
import type { AdminRewardsData } from "@/lib/data/gamification";

const field = "min-h-11 w-full rounded-lg border border-input bg-white px-3 text-base";
const label = "space-y-1 text-sm font-semibold text-choco-600";

function RewardEditor({ item, busy, submit, remove }: { item?: AdminRewardsData["rewards"][number]; busy: boolean; submit: (data: FormData, form: HTMLFormElement) => void; remove?: () => void }) {
  return <details open={!item} className="rounded-xl border border-cream-200 bg-white p-3">
    <summary className="cursor-pointer font-display text-lg font-bold">{item ? `${item.icon} ${item.name}` : "➕ Nuevo premio"}</summary>
    <form className="mt-3 grid gap-3" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); submit(new FormData(event.currentTarget), event.currentTarget); }}>
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <div className="grid grid-cols-[5rem_1fr] gap-3"><label className={label}>Icono<Input name="icon" defaultValue={item?.icon ?? "🎁"} required /></label><label className={label}>Nombre<Input name="name" defaultValue={item?.name ?? ""} required /></label></div>
      <label className={label}>Descripción<textarea name="description" defaultValue={item?.description ?? ""} className={`${field} min-h-20 py-2`} /></label>
      <label className={label}>URL de imagen opcional<Input name="imageUrl" type="url" defaultValue={item?.imageUrl ?? ""} /></label>
      <div className="grid grid-cols-2 gap-3"><label className={label}>Costo en puntos<Input name="costPoints" inputMode="numeric" defaultValue={item?.costPoints ?? 0} required /></label><label className={label}>Tipo<select name="type" defaultValue={item?.type ?? "NORMAL"} className={field}><option value="NORMAL">Premio normal</option><option value="STREAK_PROTECTOR">Protector de racha</option></select></label></div>
      <div className="grid grid-cols-2 gap-3"><label className={label}>Stock <span className="font-normal">(vacío = ilimitado)</span><Input name="stock" inputMode="numeric" defaultValue={item?.stock ?? ""} /></label><label className={label}>Orden<Input name="sortOrder" inputMode="numeric" defaultValue={item?.sortOrder ?? 0} /></label></div>
      <FormSwitch name="active" defaultChecked={item?.active ?? true} label="Premio activo" disabled={busy} />
      <div className="flex flex-col gap-2 sm:flex-row"><Button disabled={busy} type="submit"><Save /> Guardar premio</Button>{remove ? <Button disabled={busy} type="button" variant="destructive" onClick={remove}><Trash2 /> Eliminar</Button> : null}</div>
    </form>
  </details>;
}

function RedemptionItem({ item, busy, act }: { item: AdminRewardsData["redemptions"][number]; busy: boolean; act: (status: "DELIVERED" | "CANCELLED", note: string) => void }) {
  const [note, setNote] = useState(item.note ?? "");
  const labelStatus = { PENDING: "Pendiente", DELIVERED: "Entregado", CANCELLED: "Cancelado" } as const;
  return <article className="rounded-xl border border-cream-200 bg-white p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{item.childEmoji} {item.childName} · {item.rewardName}</p><p className="text-xs text-choco-600">{new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.redeemedAt))} · {item.pointsSpent} puntos</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.status === "PENDING" ? "bg-points-500/15 text-caramel-600" : item.status === "DELIVERED" ? "bg-success-500/10 text-success-500" : "bg-danger-500/10 text-danger-500"}`}>{labelStatus[item.status]}</span></div>{item.status === "PENDING" ? <div className="mt-3"><Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota opcional de entrega o cancelación" maxLength={300} /><div className="mt-2 grid grid-cols-2 gap-2"><Button disabled={busy} type="button" onClick={() => act("DELIVERED", note)}><Check /> Entregado</Button><Button disabled={busy} type="button" variant="destructive" onClick={() => act("CANCELLED", note)}><X /> Cancelar y devolver</Button></div></div> : item.note ? <p className="mt-2 text-sm text-choco-600">{item.note}</p> : null}</article>;
}

export function RewardsManager({ data }: { data: AdminRewardsData }) {
  const [createVersion, setCreateVersion] = useState(0);
  const [busy, startTransition] = useTransition();
  const run = (action: () => Promise<RewardActionResult>, onSuccess?: () => void) => startTransition(async () => {
    const result = await action();
    if (result.status === "success") {
      onSuccess?.();
      toast.success(result.message);
    }
    else toast.error(result.message);
  });
  return <div className="space-y-8">
    <section>
      <h2 className="mb-3 font-display text-2xl font-bold">Catálogo configurable</h2>
      <div className="space-y-3">
        {data.rewards.map((item) => <RewardEditor key={JSON.stringify(item)} item={item} busy={busy} submit={(form) => run(() => saveReward(form))} remove={() => run(() => deleteReward(item.id))} />)}
        <RewardEditor key={`new-reward-${createVersion}`} busy={busy} submit={(form) => run(() => saveReward(form), () => setCreateVersion((version) => version + 1))} />
      </div>
    </section>
    <section>
      <h2 className="font-display text-2xl font-bold">Canjes</h2>
      <p className="text-sm text-choco-600">Al cancelar se devuelven los puntos y, si aplica, una unidad de stock.</p>
      <MonthlyHistory idPrefix="admin-redemptions" items={data.redemptions} today={data.today} emptyMessage="No hay canjes" getKey={(item) => item.id} renderItem={(item) => <RedemptionItem item={item} busy={busy} act={(status, note) => run(() => updateRedemption({ redemptionId: item.id, status, note }))} />} />
    </section>
  </div>;
}
