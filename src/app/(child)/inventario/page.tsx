import { PackageOpen } from "lucide-react";

import { requireChild } from "@/lib/auth/guards";
import { getChildInventory } from "@/lib/data/products";
import { formatCOP } from "@/lib/domain/money";

export default async function ChildInventoryPage() {
  await requireChild();
  const products = await getChildInventory();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-10">
      <header className="rounded-card bg-choco-800 p-5 text-cream-50 shadow-soft">
        <PackageOpen aria-hidden="true" className="size-8 text-caramel-400" />
        <p className="mt-4 font-display text-lg font-semibold text-caramel-400">Inventario</p>
        <h1 className="font-display text-3xl font-bold">Productos disponibles</h1>
        <p className="mt-2 text-sm text-cream-200">Aquí ves precios y existencias, sin información de costos.</p>
      </header>
      <section className="mt-5 space-y-3" aria-label="Productos disponibles">
        {products.map((product) => {
          const stock = product.stock ?? 0;
          const minStock = product.min_stock ?? 0;
          const lowStock = stock <= minStock;
          return <article key={product.id} className="flex min-h-20 items-center gap-3 rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-3xl">{product.emoji}</span>
            <div className="min-w-0 flex-1"><h2 className="truncate font-display text-lg font-bold">{product.name}</h2>{product.description ? <p className="truncate text-sm text-choco-600">{product.description}</p> : null}</div>
            <div className="text-right"><p className="font-display text-lg font-bold tabular-nums text-caramel-600">{formatCOP(product.price ?? 0)}</p><p className={`text-sm font-semibold ${lowStock ? "text-danger-500" : "text-choco-600"}`}>Stock: {stock}</p></div>
          </article>;
        })}
        {products.length === 0 ? <p className="rounded-card border border-dashed border-cream-200 bg-cream-50 p-6 text-center text-choco-600">Aún no hay productos disponibles.</p> : null}
      </section>
    </main>
  );
}
