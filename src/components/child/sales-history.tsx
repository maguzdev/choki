"use client";

import { Banknote, Smartphone } from "lucide-react";

import { MonthlyHistory } from "@/components/shared/monthly-history";
import type { SaleListItem } from "@/lib/data/stats";
import { formatCOP } from "@/lib/domain/money";

export function ChildSalesHistory({ sales, today }: { sales: SaleListItem[]; today: string }) {
  return <MonthlyHistory idPrefix="child-sales" items={sales} today={today} emptyMessage="No hay ventas propias" getKey={(sale) => sale.id} renderItem={(sale) => <article className="rounded-xl border border-cream-200 bg-white p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-choco-800">Venta #{sale.id.slice(0, 6).toUpperCase()}</p><p className="mt-1 flex items-center gap-1 text-xs text-choco-600">{sale.paymentMethod === "CASH" ? <Banknote className="size-3.5" /> : <Smartphone className="size-3.5" />}{sale.paymentMethod === "CASH" ? "Efectivo" : "Transferencia"} · {sale.unitsTotal} {sale.unitsTotal === 1 ? "unidad" : "unidades"}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${sale.status === "COMPLETED" ? "bg-success-500/10 text-success-500" : "bg-danger-500/10 text-danger-500"}`}>{sale.status === "COMPLETED" ? "Completada" : "Anulada"}</span></div><div className="mt-3 grid grid-cols-2 gap-2 border-t border-cream-200 pt-3"><div><p className="text-xs text-choco-600">Total vendido</p><p className="font-bold tabular-nums">{formatCOP(sale.itemsTotal)}</p></div><div className="text-right"><p className="text-xs text-choco-600">Mi ganancia</p><p className="font-bold tabular-nums text-success-500">{formatCOP(sale.childEarning ?? 0)}</p></div></div></article>} />;
}
