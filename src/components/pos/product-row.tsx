"use client";

import { Minus, Plus } from "lucide-react";

import type { PosProduct } from "@/lib/data/pos";
import { formatCOP } from "@/lib/domain/money";

export function ProductRow({ product, quantity, onAdd, onRemove }: { product: PosProduct; quantity: number; onAdd: () => void; onRemove: () => void }) {
  const availableStock = Math.max(0, product.stock);
  const atStockLimit = quantity >= availableStock;
  return <article className="border-b border-cream-200 bg-cream-50 last:border-0">
    <div className="flex min-h-20 items-center gap-2 px-3 py-2">
      <button type="button" onClick={onAdd} disabled={atStockLimit} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caramel-600 active:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-55" aria-label={atStockLimit ? `${product.name} sin más unidades disponibles` : `Agregar una unidad de ${product.name}`}>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-3xl">{product.emoji}</span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-choco-800">{product.name}</span>
          <span className="block font-display text-lg font-bold tabular-nums text-caramel-600">{formatCOP(product.price)}</span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {quantity > 0 ? <button type="button" onClick={onRemove} className="flex size-11 items-center justify-center rounded-xl border border-cream-200 bg-white text-choco-800 active:scale-95" aria-label={`Quitar una unidad de ${product.name}`}><Minus aria-hidden="true" className="size-5" /></button> : null}
        <span className="w-7 text-center font-display text-xl font-bold tabular-nums" aria-label={`${quantity} unidades`}>{quantity}</span>
        <button type="button" onClick={onAdd} disabled={atStockLimit} className="flex size-11 items-center justify-center rounded-xl bg-caramel-500 text-choco-900 active:scale-95 disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-choco-400" aria-label={atStockLimit ? `${product.name} sin más unidades disponibles` : `Agregar una unidad de ${product.name}`}><Plus aria-hidden="true" className="size-5" /></button>
      </div>
    </div>
    {atStockLimit ? <p className="px-4 pb-2 text-xs font-semibold text-danger-500" role="status">{availableStock === 0 ? "Producto sin existencias. Registra una compra antes de venderlo." : `Máximo disponible: ${availableStock} ${availableStock === 1 ? "unidad" : "unidades"}.`}</p> : null}
  </article>;
}
