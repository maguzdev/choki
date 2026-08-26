"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Save, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormSwitch } from "@/components/ui/form-switch";
import { Input } from "@/components/ui/input";
import { saveGlobalSettings, saveProfitSplit, type SettingsActionResult } from "@/lib/actions/settings";
import type { AdminSettingsData } from "@/lib/data/settings";

const label = "space-y-1 text-sm font-semibold text-choco-600";

export function SettingsManager({ data }: { data: AdminSettingsData }) {
  const activeChildren = data.children.filter((child) => child.active);
  const [percentages, setPercentages] = useState<Record<string, string>>(() => Object.fromEntries(activeChildren.map((child) => [child.id, String(child.percent)])));
  const [busy, startTransition] = useTransition();
  const total = activeChildren.reduce((sum, child) => sum + (Number(percentages[child.id]) || 0), 0);

  function run(action: () => Promise<SettingsActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.status === "success") toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return <div className="space-y-6">
    <section className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft">
      <h2 className="font-display text-2xl font-bold">Configuración general</h2>
      <p className="mt-1 text-sm text-choco-600">Estos cambios afectan la experiencia de toda la familia.</p>
      <form className="mt-4 grid gap-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); run(() => saveGlobalSettings(new FormData(event.currentTarget))); }}>
        <label className={label}>Nombre familiar<Input name="familyName" defaultValue={data.settings.familyName} required /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Zona horaria<Input name="timezone" list="family-timezones" defaultValue={data.settings.timezone} required /><datalist id="family-timezones"><option value="America/Bogota" /><option value="America/Lima" /><option value="America/Mexico_City" /><option value="America/New_York" /></datalist></label>
          <label className={label}>Moneda<Input value={data.settings.currency} disabled /><span className="block text-xs font-normal">Los importes del MVP permanecen en pesos colombianos.</span></label>
        </div>
        <label className={label}>Capacidad máxima de protectores<Input className="max-w-32" name="protectorMax" type="number" min="0" max="3" inputMode="numeric" defaultValue={data.settings.protectorMax} required /><span className="block text-xs font-normal">Nunca puede superar 3 ni quedar debajo de los protectores disponibles.</span></label>
        <div className="grid gap-2 sm:grid-cols-2">
          <FormSwitch name="lowStockAlerts" defaultChecked={data.settings.lowStockAlerts} label="Alertas de inventario bajo" />
          <FormSwitch name="celebrations" defaultChecked={data.settings.celebrations} label="Celebraciones visuales" />
        </div>
        <Button disabled={busy} type="submit" className="w-full sm:w-fit"><Save /> Guardar configuración</Button>
      </form>
    </section>

    <section className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft">
      <div className="flex items-center gap-2"><Users className="size-5 text-caramel-600" /><h2 className="font-display text-2xl font-bold">Reparto de ventas familiares</h2></div>
      <p className="mt-1 text-sm text-choco-600">Se aplica a las ventas nuevas registradas por un padre. Los porcentajes deben sumar exactamente 100 %.</p>
      {activeChildren.length ? <form className="mt-4 grid gap-3" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); run(() => saveProfitSplit(new FormData(event.currentTarget))); }}>
        {activeChildren.map((child) => <label key={child.id} className="grid grid-cols-[1fr_7rem] items-center gap-3 rounded-xl border border-cream-200 bg-white p-3 font-semibold"><span>{child.avatarEmoji} {child.name}</span><span className="relative"><Input name={`percent-${child.id}`} type="number" min="0" max="100" step="0.01" inputMode="decimal" value={percentages[child.id] ?? ""} onChange={(event) => setPercentages((current) => ({ ...current, [child.id]: event.target.value }))} required /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-choco-600">%</span></span></label>)}
        <p className={`rounded-xl p-3 text-sm font-bold ${Math.abs(total - 100) < 0.000_001 ? "bg-success-500/10 text-success-500" : "bg-danger-500/10 text-danger-500"}`}>Total: {total.toLocaleString("es-CO", { maximumFractionDigits: 2 })} %</p>
        <Button disabled={busy || Math.abs(total - 100) > 0.000_001} type="submit" className="w-full sm:w-fit"><Save /> Guardar reparto</Button>
      </form> : <p className="mt-4 rounded-xl bg-cream-100 p-3 text-sm text-choco-600">Activa o crea un perfil infantil antes de configurar el reparto.</p>}
    </section>
  </div>;
}
