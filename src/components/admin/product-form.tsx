"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormSwitch } from "@/components/ui/form-switch";
import { deleteProduct, saveProduct, type CatalogActionState } from "@/lib/actions/products";
import type { Category, Product } from "@/lib/data/products";
import { formatCOP } from "@/lib/domain/money";
import { FOOD_EMOJIS } from "./category-manager";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";

const initialState: CatalogActionState = { status: "idle" };

function Editor({ categories, product, onClose }: { categories: Category[]; product?: Product; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveProduct, initialState);
  const [emoji, setEmoji] = useState(product?.emoji ?? "🍪");
  useEffect(() => setEmoji(product?.emoji ?? "🍪"), [product?.emoji, product?.id]);
  useEffect(() => {
    if (state.status === "success" && product) onClose();
  }, [onClose, product, state.status]);
  return <form action={action} className="rounded-lg border border-cream-200 bg-cream-50 p-4">
    <input type="hidden" name="id" value={product?.id ?? ""} /><input type="hidden" name="emoji" value={emoji} />
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl font-bold">{product ? "Editar producto" : "Nuevo producto"}</h2>{product ? <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button> : null}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Nombre<input name="name" defaultValue={product?.name} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3" required /></label>
      <label className="text-sm font-semibold">Categoría<select name="categoryId" defaultValue={product?.category_id ?? ""} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3"><option value="">Sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.emoji} {category.name}</option>)}</select></label>
      <label className="text-sm font-semibold sm:col-span-2">Descripción (opcional)<textarea name="description" defaultValue={product?.description ?? ""} rows={2} className="mt-1 w-full rounded-lg border border-cream-200 bg-white px-3 py-2" /></label>
      <label className="text-sm font-semibold sm:col-span-2">URL de imagen (opcional)<input name="imageUrl" type="url" defaultValue={product?.image_url ?? ""} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3" /></label>
      <label className="text-sm font-semibold">Precio de venta<input name="price" type="number" min="0" inputMode="numeric" defaultValue={product?.price ?? 0} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3" required /></label>
      <label className="text-sm font-semibold">Costo inicial (respaldo)<input name="cost" type="number" min="0" inputMode="numeric" defaultValue={product?.cost ?? 0} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3" required /><span className="mt-1 block text-xs font-normal text-choco-600">Se usa solo mientras no haya compras registradas.</span></label>
      <label className="text-sm font-semibold">Stock actual<input name="stock" type="number" inputMode="numeric" defaultValue={product?.stock ?? 0} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3" required /></label>
      <label className="text-sm font-semibold">Stock mínimo<input name="minStock" type="number" min="0" inputMode="numeric" defaultValue={product?.min_stock ?? 0} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3" required /></label>
      <label className="text-sm font-semibold">Orden<input name="sortOrder" type="number" min="0" inputMode="numeric" defaultValue={product?.sort_order ?? 0} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3" required /></label>
      <div className="self-end rounded-lg bg-cream-100 px-3"><FormSwitch name="active" defaultChecked={product?.active ?? true} label="Visible y activo" disabled={pending} /></div>
    </div>
    <div className="mt-4"><p className="text-sm font-semibold">Emoji</p><div className="mt-2 flex flex-wrap gap-1.5">{FOOD_EMOJIS.map((item, index) => <button key={`${item}-${index}`} type="button" onClick={() => setEmoji(item)} className={`flex size-11 items-center justify-center rounded-lg border text-xl ${emoji === item ? "border-caramel-600 bg-caramel-400/30" : "border-cream-200 bg-white"}`} aria-label={`Usar ${item}`}>{item}</button>)}</div></div>
    {product ? <p className="mt-4 rounded-lg bg-cream-100 p-3 text-sm text-choco-600">Costo promedio actual: <strong>{product.avg_cost}</strong>. Se calcula en compras y se usa en las ventas cuando ya existe.</p> : null}
    {state.message ? <p className={`mt-3 text-sm ${state.status === "error" ? "text-danger-500" : "text-success-500"}`}>{state.message}</p> : null}
    <Button className="mt-4 w-full" type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar producto"}</Button>
  </form>;
}

export function ProductForm({ categories, products }: { categories: Category[]; products: Product[] }) {
  const [editingId, setEditingId] = useState<string>();
  const [deleting, setDeleting] = useState<Product>();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const product = useMemo(() => products.find((item) => item.id === editingId), [editingId, products]);
  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteProduct(deleting.id);
      setMessage(result.message ?? "");
      if (result.status === "success") setDeleting(undefined);
    });
  }
  return <section className="space-y-4"><Editor key={product?.id ?? "new-product"} categories={categories} product={product} onClose={() => setEditingId(undefined)} />
    {message ? <p className="text-sm text-choco-600">{message}</p> : null}
    <div className="space-y-2"><div className="flex items-center gap-2"><Plus className="size-5 text-caramel-600" /><h2 className="font-display text-2xl font-bold">Productos</h2></div>
      {products.map((item) => <article key={item.id} className="flex items-center gap-3 rounded-lg border border-cream-200 bg-white p-3"><span className="text-2xl">{item.emoji}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.name}</p><p className="text-sm text-choco-600">{formatCOP(item.price)} · Stock {item.stock} · Costo {formatCOP(item.cost)}</p></div>{!item.active ? <span className="rounded-full bg-cream-200 px-2 py-1 text-xs">Inactivo</span> : null}<Button type="button" variant="ghost" size="icon" onClick={() => setEditingId(item.id)} aria-label={`Editar ${item.name}`}><Pencil className="size-4" /></Button><Button type="button" variant="ghost" size="icon" disabled={pending} onClick={() => setDeleting(item)} aria-label={`Eliminar ${item.name}`}><Trash2 className="size-4 text-danger-500" /></Button></article>)}
      {products.length === 0 ? <p className="rounded-lg border border-dashed border-cream-200 p-4 text-sm text-choco-600">Crea el primer producto para empezar.</p> : null}
    </div><DeleteConfirmDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(undefined); }} pending={pending} title={deleting ? `¿Eliminar “${deleting.name}”?` : "Eliminar producto"} description="Si este producto no tiene ventas registradas, se eliminará definitivamente. Si ya tiene ventas, el historial se conservará y la app te indicará que debes desactivarlo." onConfirm={remove} /></section>;
}
