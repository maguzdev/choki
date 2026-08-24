import { Cookie, KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const admin = createAdminSupabaseClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, name, type, auth_email, avatar_emoji, color")
    .eq("active", true)
    .order("sort_order")
    .order("name");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-8 sm:justify-center sm:px-6">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-caramel-400 text-choco-900 shadow-soft">
          <Cookie aria-hidden="true" className="size-11" strokeWidth={2.25} />
        </div>
        <h1 className="font-display text-4xl font-bold text-choco-800">¿Quién eres?</h1>
        <p className="mt-2 text-choco-600">Elige tu perfil para entrar a Choki.</p>
      </header>

      {error ? (
        <div className="rounded-card border border-danger-500/30 bg-cream-50 p-5 text-center text-danger-500">
          No fue posible cargar los perfiles.
        </div>
      ) : null}

      {!error && profiles?.length === 0 ? (
        <div className="rounded-card border border-cream-200 bg-cream-50 p-5 text-center shadow-soft">
          <p className="font-display text-xl font-bold text-choco-800">Aún no hay perfiles</p>
          <p className="mt-1 text-sm text-choco-600">
            Ejecuta <code className="font-semibold">npm run seed</code> para crearlos.
          </p>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3" aria-label="Perfiles disponibles">
        {profiles?.map((profile) => {
          const href =
            profile.type === "CHILD"
              ? `/login/nino/${profile.id}`
              : `/login/padre?email=${encodeURIComponent(profile.auth_email)}`;

          return (
            <Link
              key={profile.id}
              href={href}
              className="flex min-h-40 flex-col items-center justify-center rounded-card border-2 bg-cream-50 p-4 text-center shadow-soft transition active:scale-[0.98]"
              style={{ borderColor: profile.color }}
            >
              <span className="text-5xl" aria-hidden="true">
                {profile.avatar_emoji}
              </span>
              <span className="mt-3 font-display text-xl font-bold text-choco-800">
                {profile.name}
              </span>
              <span className="mt-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-choco-400">
                {profile.type === "CHILD" ? (
                  <KeyRound aria-hidden="true" className="size-3.5" />
                ) : (
                  <ShieldCheck aria-hidden="true" className="size-3.5" />
                )}
                {profile.type === "CHILD" ? "PIN" : "Contraseña"}
              </span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
