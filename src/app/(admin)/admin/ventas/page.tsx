import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AdminSalesHistory } from "@/components/admin";
import { PeriodFilter } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { requireParent } from "@/lib/auth/guards";
import { getAdminSalesData, type StatsParams } from "@/lib/data/stats";

export default async function AdminSalesPage({ searchParams }: { searchParams: Promise<StatsParams> }) {
  await requireParent();
  const data = await getAdminSalesData(await searchParams);
  return <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-12 text-choco-800"><header className="mb-5 flex items-center gap-3"><Link href="/admin" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Volver al panel"><ArrowLeft /></Link><div><p className="text-sm font-semibold text-caramel-600">Trazabilidad del negocio</p><h1 className="font-display text-3xl font-bold">Historial de ventas</h1></div></header><PeriodFilter range={data.range} today={data.today} people={data.people} selectedPerson={data.selectedPerson} /><section className="mt-6"><div className="mb-3"><h2 className="font-display text-2xl font-bold">{data.sales.length} {data.sales.length === 1 ? "venta encontrada" : "ventas encontradas"}</h2><p className="text-sm text-choco-600">Las anuladas permanecen visibles y se identifican claramente.</p></div><AdminSalesHistory sales={data.sales} today={data.today} /></section></main>;
}
