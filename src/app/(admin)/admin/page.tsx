import { Eye, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireParent } from "@/lib/auth/guards";

export default async function AdminHomePage() {
  const profile = await requireParent();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <section className="rounded-card border border-cream-200 bg-cream-50 p-6 shadow-soft">
        <ShieldCheck aria-hidden="true" className="size-8 text-caramel-600" />
        <p className="mt-5 font-display text-lg font-semibold text-caramel-600">
          Sesión de padre activa
        </p>
        <h1 className="mt-1 font-display text-4xl font-bold text-choco-800">
          Bienvenido, {profile.name}
        </h1>
        <p className="mt-3 leading-7 text-choco-600">
          El acceso administrativo está protegido. Ya puedes registrar ventas como padre; el panel completo llegará en su fase correspondiente.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row"><Link href="/admin/vender" className={buttonVariants({ className: "min-h-12" })}>Registrar venta</Link><Link href="/admin/perfiles" className={buttonVariants({ variant: "outline", className: "min-h-12" })}><Eye aria-hidden="true" /> Ver billeteras y metas</Link></div>
      </section>
    </main>
  );
}
