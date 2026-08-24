import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PinPad } from "../../pin-pad";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type ChildLoginPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChildLoginPage({ params }: ChildLoginPageProps) {
  const { id } = await params;
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, name, avatar_emoji, type, active, pin_locked_until")
    .eq("id", id)
    .maybeSingle();

  if (!profile || profile.type !== "CHILD" || !profile.active) notFound();

  const initialLockedUntil =
    profile.pin_locked_until && new Date(profile.pin_locked_until).getTime() > Date.now()
      ? profile.pin_locked_until
      : undefined;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-6 sm:py-10">
      <Link
        href="/login"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-choco-600"
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
        Cambiar perfil
      </Link>

      <header className="mb-6 mt-4 text-center">
        <span className="text-6xl" aria-hidden="true">
          {profile.avatar_emoji}
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold text-choco-800">
          Hola, {profile.name}
        </h1>
        <p className="mt-1 text-choco-600">Escribe tu PIN de 4 dígitos.</p>
      </header>

      <PinPad profileId={profile.id} initialLockedUntil={initialLockedUntil} />
    </main>
  );
}
