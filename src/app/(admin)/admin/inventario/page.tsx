import { Boxes } from "lucide-react";

import { InventoryTable, StockAdjustForm } from "@/components/admin";
import { requireParent } from "@/lib/auth/guards";
import { getAdminInventoryData } from "@/lib/data/inventory";

export default async function AdminInventoryPage() {
  await requireParent();
  const { products, movements } = await getAdminInventoryData();
  return <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-10"><header className="mb-6 rounded-card bg-choco-800 p-5 text-cream-50 shadow-soft"><Boxes aria-hidden="true" className="size-8 text-caramel-400" /><p className="mt-4 font-display text-lg font-semibold text-caramel-400">Inventario</p><h1 className="font-display text-3xl font-bold">Stock y movimientos</h1><p className="mt-2 text-sm leading-6 text-cream-200">Ajusta existencias con un motivo para mantener el historial claro.</p></header><div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]"><StockAdjustForm products={products} /><InventoryTable products={products} movements={movements} /></div></main>;
}
