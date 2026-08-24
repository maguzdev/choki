import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { PasswordLoginForm } from "../password-login-form";

type ParentLoginPageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function ParentLoginPage({ searchParams }: ParentLoginPageProps) {
  const { email } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6 sm:justify-center sm:py-10">
      <Link
        href="/login"
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-2 font-semibold text-choco-600"
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
        Cambiar perfil
      </Link>

      <section className="mt-5 rounded-card border border-cream-200 bg-cream-50 p-5 shadow-soft sm:p-7">
        <header className="mb-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-caramel-400/40 text-caramel-600">
            <ShieldCheck aria-hidden="true" className="size-8" />
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold text-choco-800">Acceso de padres</h1>
          <p className="mt-1 text-sm text-choco-600">Ingresa con tu correo y contraseña.</p>
        </header>

        <PasswordLoginForm defaultEmail={email} />
      </section>
    </main>
  );
}
