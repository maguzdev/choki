import { Sparkles } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireChild } from "@/lib/auth/guards";

export default async function ChildHomePage() {
  const profile = await requireChild();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <section className="rounded-card border border-cream-200 bg-cream-50 p-6 shadow-soft">
        <Sparkles aria-hidden="true" className="size-8 text-caramel-600" />
        <p className="mt-5 font-display text-lg font-semibold text-caramel-600">Sesión de niño activa</p>
        <h1 className="mt-1 font-display text-4xl font-bold text-choco-800">
          ¡Hola, {profile.name}!
        </h1>
        <p className="mt-3 leading-7 text-choco-600">
          Tu acceso está listo y protegido. Ya puedes registrar tus ventas; el dashboard completo llegará en su fase correspondiente.
        </p>
        <Link href="/vender" className={buttonVariants({ className: "mt-5 min-h-12 w-full sm:w-auto" })}>Registrar venta</Link>
      </section>
    </main>
  );
}
