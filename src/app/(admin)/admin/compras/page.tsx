import { ArrowLeft, ClipboardPlus } from "lucide-react";
import Link from "next/link";

import { PurchaseForm, PurchaseHistory } from "@/components/admin";
import { buttonVariants } from "@/components/ui/button";
import { requireParent } from "@/lib/auth/guards";
import { getAdminInventoryData } from "@/lib/data/inventory";

export default async function PurchasesPage() {
  await requireParent();
  const { products, purchases, today } = await getAdminInventoryData();
  return <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-10"><header className="mb-6 rounded-card bg-choco-800 p-5 text-cream-50 shadow-soft"><Link href="/admin" className={buttonVariants({ variant: "ghost", size: "icon", className: "text-cream-50 hover:bg-cream-50/10 hover:text-cream-50" })} aria-label="Volver al panel"><ArrowLeft aria-hidden="true" /></Link><ClipboardPlus aria-hidden="true" className="mt-3 size-8 text-caramel-400" /><p className="mt-4 font-display text-lg font-semibold text-caramel-400">Inventario</p><h1 className="font-display text-3xl font-bold">Registrar compra</h1><p className="mt-2 text-sm leading-6 text-cream-200">El costo promedio se calcula antes de guardar.</p></header><PurchaseForm products={products.filter((product) => product.active)} /><PurchaseHistory purchases={purchases} today={today} /></main>;
}
