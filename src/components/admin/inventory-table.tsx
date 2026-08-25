"use client";

import { useActionState, useEffect, useState } from "react";
import { History, SlidersHorizontal, TriangleAlert } from "lucide-react";

import { MonthlyHistory } from "@/components/shared/monthly-history";
import { Button } from "@/components/ui/button";
import { adjustStock, type InventoryActionState } from "@/lib/actions/inventory";
import type { InventoryHistoryItem, InventoryProduct } from "@/lib/data/inventory";
import { formatCost } from "./purchase-form";

const initialState: InventoryActionState = { status: "idle" };
const reasonLabels = { MERMA: "Merma", CONSUMO: "Consumo", DANO: "Daño", CORRECCION: "Corrección", OTRO: "Otro" };

function AdjustmentEditor({ product, onSaved }: { product: InventoryProduct; onSaved: () => void }) {
  const [state, action, pending] = useActionState(adjustStock, initialState);
  useEffect(() => { if (state.status === "success") onSaved(); }, [onSaved, state.status]);
  return <form action={action} className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft"><input type="hidden" name="productId" value={product.id} /><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-caramel-400/30 text-2xl">{product.emoji}</span><div><h2 className="font-display text-xl font-bold">Ajustar {product.name}</h2><p className="text-sm text-choco-600">Stock actual: {product.stock}</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Ajuste (+/- unidades)<input name="quantityDelta" type="number" inputMode="numeric" className="mt-1 h-12 w-full rounded-lg border border-cream-200 bg-white px-3 text-base" placeholder="Ej.: -2" required /></label><label className="text-sm font-semibold">Motivo<select name="reason" defaultValue="CORRECCION" className="mt-1 h-12 w-full rounded-lg border border-cream-200 bg-white px-3 text-base">{Object.entries(reasonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-semibold sm:col-span-2">Nota<input name="note" className="mt-1 h-12 w-full rounded-lg border border-cream-200 bg-white px-3 text-base" placeholder="Explica el ajuste" required /></label></div>{state.message ? <p className={`mt-3 text-sm ${state.status === "error" ? "text-danger-500" : "text-success-500"}`}>{state.message}</p> : null}<Button className="mt-4 w-full" type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar ajuste"}</Button></form>;
}

export function StockAdjustForm({ products }: { products: InventoryProduct[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [version, setVersion] = useState(0);
  const product = products.find((item) => item.id === selectedId);
  return <section><label className="text-sm font-semibold">Producto a ajustar<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1 h-12 w-full rounded-lg border border-cream-200 bg-white px-3 text-base"><option value="">Selecciona un producto</option>{products.map((item) => <option key={item.id} value={item.id}>{item.emoji} {item.name} · stock {item.stock}</option>)}</select></label>{product ? <div className="mt-4"><AdjustmentEditor key={`${product.id}-${version}`} product={product} onSaved={() => { setSelectedId(""); setVersion((value) => value + 1); }} /></div> : null}</section>;
}

export function InventoryTable({ products, movements, today }: { products: InventoryProduct[]; movements: InventoryHistoryItem[]; today: string }) {
  const [historyProductId, setHistoryProductId] = useState<string>();
  const history = movements.filter((movement) => movement.product_id === historyProductId).map((movement) => ({ ...movement, localDate: movement.local_date }));
  return <section className="mt-6">
    <div className="flex items-center gap-2"><SlidersHorizontal className="size-5 text-caramel-600" /><h2 className="font-display text-2xl font-bold">Inventario actual</h2></div>
    <div className="mt-3 space-y-3 md:hidden">
      {products.map((product) => { const low = product.stock <= product.min_stock; return <article key={product.id} className="rounded-card border border-cream-200 bg-white p-4 shadow-soft">
        <div className="flex min-w-0 items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-2xl">{product.emoji}</span><div className="min-w-0"><h3 className="break-words font-bold text-choco-800">{product.name}</h3>{low ? <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-danger-500/10 px-2 py-1 text-xs font-bold text-danger-500"><TriangleAlert className="size-3" /> Stock bajo</span> : null}</div></div></div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-cream-200 py-3 text-sm"><p><span className="block text-xs text-choco-600">Stock</span><strong className={`text-lg tabular-nums ${low ? "text-danger-500" : ""}`}>{product.stock}</strong></p><p className="text-center"><span className="block text-xs text-choco-600">Mínimo</span><strong className="text-lg tabular-nums">{product.min_stock}</strong></p><p className="text-right"><span className="block text-xs text-choco-600">Costo prom.</span><strong className="tabular-nums">{formatCost(product.avg_cost)}</strong></p></div>
        <Button type="button" variant="outline" className="mt-3 min-h-11 w-full" onClick={() => setHistoryProductId(product.id)}><History className="size-4" /> Ver historial</Button>
      </article>; })}
    </div>
    <div className="mt-3 hidden max-w-full overflow-x-auto rounded-card border border-cream-200 bg-white md:block"><table className="w-full min-w-150 text-left text-sm"><thead className="bg-cream-100 text-choco-600"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3 text-right">Stock</th><th className="px-4 py-3 text-right">Mín.</th><th className="px-4 py-3 text-right">Costo prom.</th><th className="px-4 py-3">Acción</th></tr></thead><tbody>{products.map((product) => { const low = product.stock <= product.min_stock; return <tr key={product.id} className="border-t border-cream-200"><td className="px-4 py-3 font-semibold">{product.emoji} {product.name}{low ? <span className="ml-2 inline-flex items-center gap-1 text-xs text-danger-500"><TriangleAlert className="size-3" /> Bajo</span> : null}</td><td className={`px-4 py-3 text-right font-bold tabular-nums ${low ? "text-danger-500" : ""}`}>{product.stock}</td><td className="px-4 py-3 text-right tabular-nums">{product.min_stock}</td><td className="px-4 py-3 text-right tabular-nums">{formatCost(product.avg_cost)}</td><td className="px-4 py-3"><Button type="button" variant="ghost" size="sm" onClick={() => setHistoryProductId(product.id)}><History className="size-4" /> Historial</Button></td></tr>; })}</tbody></table></div>
    {products.length === 0 ? <p className="mt-3 text-sm text-choco-600">Crea productos antes de registrar compras.</p> : null}
    {historyProductId ? <section className="mt-5"><div className="flex items-center justify-between gap-3"><h3 className="font-display text-xl font-bold">Historial de movimientos</h3><Button type="button" variant="ghost" size="sm" onClick={() => setHistoryProductId(undefined)}>Cerrar</Button></div><MonthlyHistory idPrefix={`inventory-${historyProductId}`} items={history} today={today} emptyMessage="No hay movimientos para este producto" getKey={(movement) => movement.id} renderItem={(movement) => <article className="flex items-center justify-between gap-3 rounded-lg border border-cream-200 bg-white p-3"><div><p className="font-semibold">{movement.type === "ADJUSTMENT" ? `Ajuste: ${movement.reason ? reasonLabels[movement.reason as keyof typeof reasonLabels] : ""}` : "Compra"}</p><p className="text-sm text-choco-600">{movement.note ?? "Sin nota"}</p></div><div className="text-right"><p className={`font-bold tabular-nums ${movement.quantity_delta < 0 ? "text-danger-500" : "text-success-500"}`}>{movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}</p><p className="text-xs text-choco-600">Stock: {movement.stock_after}</p></div></article>} /></section> : null}
  </section>;
}
