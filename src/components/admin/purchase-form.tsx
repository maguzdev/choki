"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Calculator, History, ShoppingBasket } from "lucide-react";

import { MonthlyHistory } from "@/components/shared/monthly-history";
import { Button } from "@/components/ui/button";
import { registerPurchase, type InventoryActionState } from "@/lib/actions/inventory";
import type { InventoryProduct, PurchaseHistoryItem } from "@/lib/data/inventory";
import { applyPurchase } from "@/lib/domain/inventory";
import { formatCOP } from "@/lib/domain/money";

const initialState: InventoryActionState = { status: "idle" };

export function formatCost(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

function PurchaseEditor({ products, onSaved }: { products: InventoryProduct[]; onSaved: () => void }) {
  const [state, action, pending] = useActionState(registerPurchase, initialState);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const product = products.find((item) => item.id === productId);
  const preview = useMemo(() => {
    const units = Number(quantity);
    const total = Number(totalCost);
    if (!product || !Number.isInteger(units) || units <= 0 || !Number.isInteger(total) || total < 0) return null;
    return applyPurchase({ stock: product.stock, avgCost: product.avg_cost }, { quantity: units, totalCost: total });
  }, [product, quantity, totalCost]);

  useEffect(() => { if (state.status === "success") onSaved(); }, [onSaved, state.status]);

  return <form action={action} className="rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft">
    <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-caramel-400/30 text-caramel-600"><ShoppingBasket className="size-6" /></span><div><h2 className="font-display text-2xl font-bold">Registrar compra</h2><p className="text-sm text-choco-600">Actualiza stock y costo promedio.</p></div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold sm:col-span-2">Producto<select name="productId" value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3" required><option value="">Selecciona un producto</option>{products.map((item) => <option key={item.id} value={item.id}>{item.emoji} {item.name} · stock {item.stock}</option>)}</select></label>
      <label className="text-sm font-semibold">Cantidad<input name="quantity" type="number" min="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3" required /></label>
      <label className="text-sm font-semibold">Costo total<input name="totalCost" type="number" min="0" inputMode="numeric" value={totalCost} onChange={(event) => setTotalCost(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-cream-200 bg-white px-3" required /></label>
      <label className="text-sm font-semibold sm:col-span-2">Nota (opcional)<textarea name="note" rows={2} className="mt-1 w-full rounded-lg border border-cream-200 bg-white px-3 py-2" placeholder="Ej.: compra al proveedor" /></label>
    </div>
    {preview ? <section className="mt-4 rounded-lg bg-cream-100 p-4" aria-live="polite"><div className="flex items-center gap-2 text-sm font-semibold text-choco-600"><Calculator className="size-4" /> Vista previa</div><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><p className="text-xs text-choco-600">Unitario</p><p className="font-display font-bold tabular-nums">{formatCost(preview.unitCost)}</p></div><div><p className="text-xs text-choco-600">Nuevo promedio</p><p className="font-display font-bold tabular-nums text-caramel-600">{formatCost(preview.avgCost)}</p></div><div><p className="text-xs text-choco-600">Stock final</p><p className="font-display font-bold tabular-nums">{preview.stock}</p></div></div></section> : null}
    {state.message ? <p className={`mt-3 text-sm ${state.status === "error" ? "text-danger-500" : "text-success-500"}`}>{state.message}</p> : null}
    <Button className="mt-4 w-full" type="submit" disabled={pending}>{pending ? "Registrando…" : "Registrar compra"}</Button>
  </form>;
}

export function PurchaseForm({ products }: { products: InventoryProduct[] }) {
  const [version, setVersion] = useState(0);
  return <PurchaseEditor key={version} products={products} onSaved={() => setVersion((value) => value + 1)} />;
}

export function PurchaseHistory({ purchases, today }: { purchases: PurchaseHistoryItem[]; today: string }) {
  return <section className="mt-6"><div className="flex items-center gap-2"><History aria-hidden="true" className="size-5 text-caramel-600" /><h2 className="font-display text-2xl font-bold">Historial de compras</h2></div><MonthlyHistory idPrefix="purchases" items={purchases.map((purchase) => ({ ...purchase, localDate: purchase.local_date }))} today={today} emptyMessage="No hay compras" getKey={(purchase) => purchase.id} renderItem={(purchase) => <article className="flex items-center gap-3 rounded-lg border border-cream-200 bg-white p-3"><span className="text-2xl">{purchase.productEmoji}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{purchase.productName}</p><p className="text-sm text-choco-600">{purchase.quantity} uds · {formatCOP(purchase.total_cost)} · unitario {formatCost(purchase.unit_cost)}</p></div><div className="text-right text-sm"><p className="text-choco-600">Promedio</p><p className="font-semibold text-caramel-600">{formatCost(purchase.avgCostAfter)}</p></div></article>} /></section>;
}
