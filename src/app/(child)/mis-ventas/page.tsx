import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ChildSalesHistory } from "@/components/child";
import { buttonVariants } from "@/components/ui/button";
import { requireChild } from "@/lib/auth/guards";
import { getChildSalesHistory } from "@/lib/data/stats";

export default async function ChildSalesPage() {
  const child = await requireChild();
  const history = await getChildSalesHistory(child.id);
  return <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-12 text-choco-800"><header className="mb-5 flex items-center gap-3"><Link href="/" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Volver al inicio"><ArrowLeft /></Link><div><p className="text-sm font-semibold text-caramel-600">Solo tus ventas propias</p><h1 className="font-display text-3xl font-bold">Mis ventas</h1></div></header><section><h2 className="font-display text-2xl font-bold">Historial</h2><p className="text-sm text-choco-600">Cada venta muestra cuánto vendiste y cuánto ganaste.</p><ChildSalesHistory sales={history.sales} today={history.today} /></section></main>;
}
