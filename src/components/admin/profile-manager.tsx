"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormSwitch } from "@/components/ui/form-switch";
import { Input } from "@/components/ui/input";
import { saveProfile } from "@/lib/actions/profiles";
import type { ManagedProfile } from "@/lib/data/settings";

const label = "space-y-1 text-sm font-semibold text-choco-600";

export function PinForm({ editing }: { editing: boolean }) {
  return <label className={label}>{editing ? "Nuevo PIN (opcional)" : "PIN inicial"}<Input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="4 dígitos" required={!editing} /><span className="block text-xs font-normal">{editing ? "Déjalo vacío para conservar el PIN actual." : "El niño lo usará para iniciar sesión."}</span></label>;
}

export function ProfileForm({ profile, onSaved }: { profile?: ManagedProfile; onSaved: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<"CHILD" | "PARENT">(profile?.type ?? "CHILD");
  const [busy, startTransition] = useTransition();
  return <form className="mt-3 grid gap-3" onSubmit={(event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      const result = await saveProfile(new FormData(form));
      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
        onSaved();
      } else toast.error(result.message);
    });
  }}>
    <input type="hidden" name="id" value={profile?.id ?? ""} />
    {profile ? <><input type="hidden" name="type" value={profile.type} /><p className="text-xs font-semibold uppercase tracking-wide text-caramel-600">{profile.type === "CHILD" ? "Perfil infantil" : "Perfil de padre"}</p></> : <label className={label}>Tipo de perfil<select name="type" value={type} onChange={(event) => setType(event.target.value as "CHILD" | "PARENT")} className="h-11 w-full rounded-lg border border-input bg-white px-3 text-base"><option value="CHILD">Niño</option><option value="PARENT">Padre</option></select></label>}
    <div className="grid grid-cols-[5rem_1fr] gap-3"><label className={label}>Emoji<Input name="avatarEmoji" defaultValue={profile?.avatarEmoji ?? (type === "CHILD" ? "🧒" : "👤")} required /></label><label className={label}>Nombre<Input name="name" defaultValue={profile?.name ?? ""} required /></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className={label}>Color<Input className="h-11 p-1" name="color" type="color" defaultValue={profile?.color ?? "#D98C3F"} required /></label><label className={label}>Orden<Input name="sortOrder" type="number" min="0" inputMode="numeric" defaultValue={profile?.sortOrder ?? 0} required /></label></div>
    {type === "PARENT" ? <><label className={label}>Correo<Input name="email" type="email" autoComplete="email" defaultValue={profile?.email ?? ""} required /></label><label className={label}>{profile ? "Nueva contraseña (opcional)" : "Contraseña inicial"}<Input name="password" type="password" autoComplete="new-password" minLength={8} required={!profile} /><span className="block text-xs font-normal">{profile ? "Déjala vacía para conservar la actual." : "Mínimo 8 caracteres."}</span></label></> : <PinForm editing={Boolean(profile)} />}
    <FormSwitch name="active" defaultChecked={profile?.active ?? true} label="Perfil activo" />
    <Button disabled={busy} type="submit" className="w-full sm:w-fit"><Save /> {profile ? "Guardar perfil" : "Crear perfil"}</Button>
  </form>;
}

function ProfileEditor({ profile }: { profile?: ManagedProfile }) {
  const [open, setOpen] = useState(!profile);
  const [version, setVersion] = useState(0);
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="rounded-xl border border-cream-200 bg-white p-3"><summary className="cursor-pointer font-display text-lg font-bold">{profile ? `${profile.avatarEmoji} ${profile.name}${profile.active ? "" : " · Inactivo"}` : "➕ Crear perfil"}</summary>{open ? <ProfileForm key={version} profile={profile} onSaved={() => { setOpen(false); setVersion((current) => current + 1); }} /> : null}</details>;
}

export function ProfileManager({ profiles }: { profiles: ManagedProfile[] }) {
  return <section className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft"><h2 className="font-display text-2xl font-bold">Administrar perfiles</h2><p className="mt-1 text-sm text-choco-600">Crea, edita, ordena o desactiva accesos. Los perfiles con historial se conservan.</p><div className="mt-4 space-y-3">{profiles.map((profile) => <ProfileEditor key={profile.id} profile={profile} />)}<ProfileEditor /></div></section>;
}
