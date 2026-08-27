import Link from "next/link";
import { ArrowLeft, Gift, Settings, Trophy, Users } from "lucide-react";

import { SettingsManager } from "@/components/admin";
import { buttonVariants } from "@/components/ui/button";
import { requireParent } from "@/lib/auth/guards";
import { getAdminSettingsData } from "@/lib/data/settings";

export default async function AdminSettingsPage() {
  await requireParent();
  const data = await getAdminSettingsData();
  return <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-12 text-choco-800">
    <header className="mb-5 flex items-start gap-3"><Link href="/admin" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Volver al panel"><ArrowLeft /></Link><div className="min-w-0 flex-1"><p className="flex items-center gap-1 text-sm font-semibold text-caramel-600"><Settings className="size-4" /> Administración familiar</p><h1 className="font-display text-3xl font-bold">Configuración</h1><p className="mt-1 text-sm text-choco-600">Preferencias globales y reparto de las ventas hechas por padres.</p></div></header>
    <section className="mb-5 grid gap-2 sm:flex sm:flex-wrap" aria-label="Configuraciones administrativas">
      <Link href="/admin/perfiles" className={buttonVariants({ variant: "outline", className: "w-full sm:w-fit" })}><Users /> Administrar perfiles y accesos</Link>
      <Link href="/admin/gamificacion" className={buttonVariants({ variant: "outline", className: "w-full sm:w-fit" })}><Trophy /> Configurar gamificación</Link>
      <Link href="/admin/recompensas" className={buttonVariants({ variant: "outline", className: "w-full sm:w-fit" })}><Gift /> Configurar recompensas</Link>
    </section>
    <SettingsManager data={data} />
  </main>;
}
