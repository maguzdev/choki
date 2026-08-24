"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteCategory, saveCategory, type CatalogActionState } from "@/lib/actions/products";
import type { Category, Product } from "@/lib/data/products";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";

const initialState: CatalogActionState = { status: "idle" };
export const FOOD_EMOJIS = ["🍪", "🥨", "🍫", "🍬", "🧁", "🍰", "🍩", "🍭", "🍿", "🥞", "🍯", "🍓", "🍌", "🍎", "🍊", "🍋", "🍒", "🥥", "🫐", "🍇", "🥜", "🌰", "🧇", "🍞", "🥐", "🥖", "🧀", "🥛", "☕", "🧋", "🍨", "🍦", "🍮", "🍡", "🎂", "🍉", "🥭", "🍍", "🍑", "🍈"];

function CategoryEditor({ category, onClose }: { category?: Category; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveCategory, initialState);
  const [emoji, setEmoji] = useState(category?.emoji ?? "🍪");

  useEffect(() => setEmoji(category?.emoji ?? "🍪"), [category?.emoji, category?.id]);
  useEffect(() => {
    if (state.status === "success" && category) onClose();
  }, [category, onClose, state.status]);

  return (
    <form action={action} className="rounded-lg border border-cream-200 bg-cream-50 p-4">
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <input type="hidden" name="emoji" value={emoji} />
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold">{category ? "Editar categoría" : "Nueva categoría"}</h3>
        {category ? <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button> : null}
      </div>
      <label className="mt-4 block text-sm font-semibold" htmlFor={`category-name-${category?.id ?? "new"}`}>Nombre</label>
      <input id={`category-name-${category?.id ?? "new"}`} name="name" defaultValue={category?.name} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3" required />
      <div className="mt-4">
        <p className="text-sm font-semibold">Emoji</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FOOD_EMOJIS.map((item, index) => <button key={`${item}-${index}`} type="button" onClick={() => setEmoji(item)} className={`flex size-11 items-center justify-center rounded-lg border text-xl ${emoji === item ? "border-caramel-600 bg-caramel-400/30" : "border-cream-200 bg-white"}`} aria-label={`Usar ${item}`}>{item}</button>)}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
        <label className="block text-sm font-semibold">Orden<input name="sortOrder" type="number" min="0" inputMode="numeric" defaultValue={category?.sort_order ?? 0} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3" required /></label>
        <label className="flex h-11 items-center gap-2 rounded-lg bg-cream-100 px-3 text-sm font-semibold"><input name="active" type="checkbox" defaultChecked={category?.active ?? true} /> Activa</label>
      </div>
      {state.message ? <p className={`mt-3 text-sm ${state.status === "error" ? "text-danger-500" : "text-success-500"}`}>{state.message}</p> : null}
      <Button className="mt-4 w-full" type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar categoría"}</Button>
    </form>
  );
}

export function CategoryManager({ categories, products }: { categories: Category[]; products: Product[] }) {
  const [editing, setEditing] = useState<Category | undefined>();
  const [deleting, setDeleting] = useState<Category | undefined>();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteCategory(deleting.id);
      setMessage(result.message ?? "");
      if (result.status === "success") setDeleting(undefined);
    });
  }

  const linkedProducts = deleting ? products.filter((product) => product.category_id === deleting.id).length : 0;

  return (
    <section className="space-y-4">
      <div><p className="font-display text-2xl font-bold">Categorías</p><p className="text-sm text-choco-600">Organiza el catálogo y decide cuáles están visibles.</p></div>
      {editing ? <CategoryEditor key={editing.id} category={editing} onClose={() => setEditing(undefined)} /> : <CategoryEditor key="new-category" onClose={() => undefined} />}
      {message ? <p className="text-sm text-choco-600">{message}</p> : null}
      <div className="space-y-2">
        {categories.map((category) => <article key={category.id} className="flex items-center gap-3 rounded-lg border border-cream-200 bg-white p-3">
          <span className="text-2xl">{category.emoji}</span><span className="min-w-0 flex-1 truncate font-semibold">{category.name}</span>
          {!category.active ? <span className="rounded-full bg-cream-200 px-2 py-1 text-xs">Inactiva</span> : null}
          <Button type="button" variant="ghost" size="icon" onClick={() => setEditing(category)} aria-label={`Editar ${category.name}`}><Pencil className="size-4" /></Button>
          <Button type="button" variant="ghost" size="icon" disabled={pending} onClick={() => setDeleting(category)} aria-label={`Eliminar ${category.name}`}><Trash2 className="size-4 text-danger-500" /></Button>
        </article>)}
        {categories.length === 0 ? <p className="rounded-lg border border-dashed border-cream-200 p-4 text-sm text-choco-600">Aún no hay categorías.</p> : null}
      </div>
      <DeleteConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => { if (!open) setDeleting(undefined); }}
        pending={pending}
        title={deleting ? `¿Eliminar “${deleting.name}”?` : "Eliminar categoría"}
        description={linkedProducts === 0
          ? "Esta categoría no tiene productos asociados y se eliminará definitivamente."
          : `Esta categoría tiene ${linkedProducts} ${linkedProducts === 1 ? "producto asociado" : "productos asociados"}. Los productos se conservarán, pero quedarán sin categoría.`}
        onConfirm={remove}
      />
    </section>
  );
}
