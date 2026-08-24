import { PackagePlus } from "lucide-react";

import { CategoryManager, ProductForm } from "@/components/admin";
import { requireParent } from "@/lib/auth/guards";
import { getAdminCatalog } from "@/lib/data/products";

export default async function ProductsPage() {
  await requireParent();
  const { categories, products } = await getAdminCatalog();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-10">
      <header className="mb-6 rounded-card bg-choco-800 p-5 text-cream-50 shadow-soft">
        <PackagePlus aria-hidden="true" className="size-8 text-caramel-400" />
        <p className="mt-4 font-display text-lg font-semibold text-caramel-400">Catálogo</p>
        <h1 className="font-display text-3xl font-bold">Productos y categorías</h1>
        <p className="mt-2 text-sm leading-6 text-cream-200">Mantén el catálogo listo para vender. El costo promedio se actualiza con las compras.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <CategoryManager categories={categories} products={products} />
        <ProductForm categories={categories.filter((category) => category.active)} products={products} />
      </div>
    </main>
  );
}
