"use client";

import { useActionState, useState } from "react";
import { PiggyBank } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateSavingSettings, type WalletActionState } from "@/lib/actions/wallet";
import type { WalletSettings } from "@/lib/data/wallet";

const initialState: WalletActionState = { status: "idle" };
const quickPercents = [0, 5, 10, 20, 30];

export function SavingSettingsForm({ childId, settings }: { childId: string; settings: WalletSettings }) {
  const [state, action, pending] = useActionState(updateSavingSettings, initialState);
  const [enabled, setEnabled] = useState(settings.enabled);
  const [percent, setPercent] = useState(settings.percent);
  const [custom, setCustom] = useState(!quickPercents.includes(settings.percent));

  return <form action={action} className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft">
    <input type="hidden" name="childId" value={childId} />
    <div className="flex items-start gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success-500/10 text-success-500"><PiggyBank aria-hidden="true" className="size-6" /></span>
      <div className="min-w-0 flex-1"><h2 className="font-display text-xl font-bold">Ahorro automático</h2><p className="text-sm text-choco-600">Solo afecta a lo que ganes desde ahora.</p></div>
      <Switch name="enabled" checked={enabled} onCheckedChange={setEnabled} disabled={pending} aria-label="Activar ahorro automático" />
    </div>
    <input type="hidden" name="percent" value={percent} />
    <fieldset className="mt-4" disabled={!enabled || pending}>
      <legend className="text-sm font-semibold">¿Qué porcentaje quieres guardar?</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {quickPercents.map((option) => <button key={option} type="button" onClick={() => { setPercent(option); setCustom(false); }} className={`min-h-11 rounded-xl border px-4 font-semibold ${!custom && percent === option ? "border-success-500 bg-success-500/10 text-success-500" : "border-cream-200 bg-white"}`}>{option} %</button>)}
        <button type="button" onClick={() => setCustom(true)} className={`min-h-11 rounded-xl border px-4 font-semibold ${custom ? "border-success-500 bg-success-500/10 text-success-500" : "border-cream-200 bg-white"}`}>Otro</button>
      </div>
      {custom ? <label className="mt-3 block text-sm font-semibold">Porcentaje personalizado<input type="number" min="0" max="100" inputMode="numeric" value={percent} onChange={(event) => setPercent(Number(event.target.value))} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3" /></label> : null}
    </fieldset>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`mt-3 text-sm font-semibold ${state.status === "error" ? "text-danger-500" : "text-success-500"}`}>{state.message}</p> : null}
    <Button type="submit" className="mt-4 w-full" disabled={pending}>{pending ? "Guardando…" : "Guardar configuración"}</Button>
  </form>;
}
