"use client";

import { useState } from "react";
import { Banknote, Boxes, CircleDollarSign, PackageCheck, ReceiptText } from "lucide-react";
import Link from "next/link";

import { DailyGroupedHistory } from "@/components/shared/monthly-history";
import { StatCard } from "@/components/shared/stats-ui";
import type { SaleListItem } from "@/lib/data/stats";
import { formatCOP } from "@/lib/domain/money";

export function KpiGrid({ data }: { data: { count: number; revenue: number; recoveredCost: number; profit: number; tips: number; units: number; inventoryValue: number } }) {
  const recoveredCost = data.recoveredCost;
  const collected = data.revenue + data.tips;
  return <>
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-6" aria-label="Indicadores principales">
      <StatCard icon={<ReceiptText className="size-5 text-caramel-600" />} label="Ventas" value={String(data.count)} />
      <StatCard icon={<Banknote className="size-5 text-success-500" />} label="Total vendido" value={formatCOP(data.revenue)} detail="Productos, sin propinas" tone="text-success-500" />
      <StatCard icon={<CircleDollarSign className="size-5 text-choco-600" />} label="Costo recuperado" value={formatCOP(recoveredCost)} detail="Capital para reponer lo vendido" />
      <StatCard icon={<Banknote className="size-5 text-caramel-600" />} label="Ganancia distribuida" value={formatCOP(data.profit)} detail="Margen + propinas para los niños" tone="text-caramel-600" />
      <StatCard icon={<PackageCheck className="size-5 text-goal-500" />} label="Unidades" value={String(data.units)} />
      <StatCard icon={<Boxes className="size-5 text-xp-500" />} label="Valor del inventario" value={formatCOP(data.inventoryValue)} detail="Stock actual × costo promedio" />
    </section>
    <section className="mt-3 rounded-card border border-cream-200 bg-choco-800 p-4 text-cream-50 shadow-soft" aria-label="Cuadre del dinero del periodo">
      <p className="text-sm font-semibold text-cream-200">Cuadre del dinero del periodo</p>
      <p className="mt-2 font-display text-xl font-bold tabular-nums">{formatCOP(collected)} cobrados</p>
      <p className="mt-1 text-sm text-cream-200">{formatCOP(recoveredCost)} para reponer productos + {formatCOP(data.profit)} de ganancia distribuida.</p>
      {data.tips > 0 ? <p className="mt-1 text-xs text-cream-200">El total cobrado incluye {formatCOP(data.tips)} en propinas.</p> : null}
    </section>
  </>;
}

export function SimpleBarChart({ title, data, format = "money" }: { title: string; data: Array<{ label: string; value: number }>; format?: "money" | "number" }) {
  const visible = data.slice(-14);
  const [selectedLabel, setSelectedLabel] = useState<string>();
  const selected = visible.find((item) => item.label === selectedLabel) ?? visible.at(-1);
  const max = Math.max(1, ...visible.map((item) => item.value));
  const width = Math.max(320, visible.length * 52);
  const chartLabel = visible.map((item) => `${item.label}: ${format === "money" ? formatCOP(item.value) : item.value}`).join(", ");
  return <section className="min-w-0 rounded-card border border-cream-200 bg-cream-50 p-4 shadow-soft">
    <h2 className="font-display text-xl font-bold text-choco-800">{title}</h2>
    {selected ? <div className="mt-3 flex min-h-14 items-center justify-between gap-3 rounded-xl bg-cream-100 px-3 py-2" aria-live="polite"><div><p className="text-xs font-semibold text-choco-600">Valor seleccionado</p><p className="text-sm font-bold text-choco-800">{new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${selected.label}T12:00:00Z`))}</p></div><strong className="shrink-0 text-lg tabular-nums text-caramel-600">{format === "money" ? formatCOP(selected.value) : selected.value}</strong></div> : null}
    {visible.length ? <div className="mt-4 min-w-0 max-w-full overflow-x-auto pb-1"><svg viewBox={`0 0 ${width} 190`} className="h-48 min-w-full" role="img" aria-label={`${title}. ${chartLabel}`}>
      <line x1="14" y1="150" x2={width - 10} y2="150" stroke="#E7D5B6" strokeWidth="2" />
      {visible.map((item, index) => { const x = 18 + index * 52; const height = Math.max(4, item.value / max * 112); const isSelected = item.label === selected?.label; const valueLabel = format === "money" ? formatCOP(item.value) : String(item.value); return <g key={item.label} role="button" tabIndex={0} aria-label={`${item.label}: ${valueLabel}`} aria-pressed={isSelected} className="cursor-pointer outline-none" onClick={() => setSelectedLabel(item.label)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedLabel(item.label); } }}><rect x={x - 7} y="20" width="44" height="130" fill="transparent" /><rect x={x} y={150 - height} width="30" height={height} rx="7" fill={isSelected ? "#BE7429" : "#D98C3F"} stroke={isSelected ? "#68402D" : "transparent"} strokeWidth="2" /><text x={x + 15} y="169" textAnchor="middle" fontSize="10" fontWeight={isSelected ? "700" : "400"} fill="#68402D">{item.label.slice(5)}</text></g>; })}
    </svg></div> : <p className="mt-4 rounded-xl bg-cream-100 p-4 text-sm text-choco-600">No hay ventas para graficar en este periodo.</p>}
    {visible.length ? <p className="mt-2 text-center text-xs text-choco-600">Toca una barra para consultar su valor.</p> : null}
  </section>;
}

export function SalesTable({ sales, detailBase = "/admin/ventas", childView = false }: { sales: SaleListItem[]; detailBase?: string; childView?: boolean }) {
  if (!sales.length) return <p className="rounded-card border border-cream-200 bg-cream-50 p-6 text-center text-sm text-choco-600">No hay ventas en el periodo seleccionado.</p>;
  return <><div className="space-y-2 md:hidden">{sales.map((sale) => <article key={sale.id} className="rounded-xl border border-cream-200 bg-cream-50 p-4 shadow-soft"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{sale.sellerEmoji} {sale.sellerName}</p><p className="text-xs text-choco-600">{sale.localDate} · {new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(new Date(sale.soldAt))}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${sale.status === "COMPLETED" ? "bg-success-500/10 text-success-500" : "bg-danger-500/10 text-danger-500"}`}>{sale.status === "COMPLETED" ? "Completada" : "Anulada"}</span></div><div className="mt-3 grid grid-cols-3 gap-2 border-y border-cream-200 py-3 text-sm"><p><span className="block text-xs text-choco-600">Unidades</span><strong>{sale.unitsTotal}</strong></p><p><span className="block text-xs text-choco-600">Total</span><strong>{formatCOP(sale.itemsTotal)}</strong></p><p className="text-right"><span className="block text-xs text-choco-600">Ganancia</span><strong className="text-success-500">{formatCOP(childView ? sale.childEarning ?? 0 : sale.earningsTotal)}</strong></p></div><div className="mt-3 flex items-center justify-between gap-3 text-xs text-choco-600"><span>{sale.paymentMethod === "CASH" ? "Efectivo" : "Transferencia"}</span>{childView ? <span className="font-mono">#{sale.id.slice(0, 6).toUpperCase()}</span> : <Link href={`${detailBase}/${sale.id}`} className="font-bold text-caramel-600">Ver detalle</Link>}</div></article>)}</div><div className="hidden max-w-full overflow-x-auto rounded-card border border-cream-200 bg-cream-50 shadow-soft md:block">
    <table className="w-full min-w-[720px] text-left text-sm">
      <thead className="bg-cream-100 text-xs uppercase tracking-wide text-choco-600"><tr><th className="px-4 py-3">Fecha</th>{childView ? null : <th className="px-4 py-3">Vendedor</th>}<th className="px-4 py-3">Pago</th><th className="px-4 py-3 text-right">Unidades</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">{childView ? "Mi ganancia" : "Ganancia"}</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3"><span className="sr-only">Detalle</span></th></tr></thead>
      <tbody className="divide-y divide-cream-200">{sales.map((sale) => <tr key={sale.id} className="text-choco-800"><td className="whitespace-nowrap px-4 py-3"><strong>{sale.localDate}</strong><br /><span className="text-xs text-choco-600">{new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(new Date(sale.soldAt))}</span></td>{childView ? null : <td className="px-4 py-3">{sale.sellerEmoji} {sale.sellerName}</td>}<td className="px-4 py-3">{sale.paymentMethod === "CASH" ? "Efectivo" : "Transferencia"}</td><td className="px-4 py-3 text-right tabular-nums">{sale.unitsTotal}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCOP(sale.itemsTotal)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums text-success-500">{formatCOP(childView ? sale.childEarning ?? 0 : sale.earningsTotal)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${sale.status === "COMPLETED" ? "bg-success-500/10 text-success-500" : "bg-danger-500/10 text-danger-500"}`}>{sale.status === "COMPLETED" ? "Completada" : "Anulada"}</span></td><td className="px-4 py-3">{childView ? <span className="font-mono text-xs text-choco-400">#{sale.id.slice(0, 6).toUpperCase()}</span> : <Link href={`${detailBase}/${sale.id}`} className="font-bold text-caramel-600 underline-offset-4 hover:underline">Ver detalle</Link>}</td></tr>)}</tbody>
    </table>
  </div></>;
}

export function AdminSalesHistory({ sales, today }: { sales: SaleListItem[]; today: string }) {
  return <DailyGroupedHistory
    idPrefix="admin-sales"
    items={sales}
    today={today}
    emptyMessage="No hay ventas en el periodo seleccionado"
    singularLabel="venta"
    pluralLabel="ventas"
    getKey={(sale) => sale.id}
    renderItem={(sale) => <article className="rounded-xl border border-cream-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate font-bold">{sale.sellerEmoji} {sale.sellerName}</p><p className="text-xs text-choco-600">{new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(new Date(sale.soldAt))} · #{sale.id.slice(0, 6).toUpperCase()}</p></div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${sale.status === "COMPLETED" ? "bg-success-500/10 text-success-500" : "bg-danger-500/10 text-danger-500"}`}>{sale.status === "COMPLETED" ? "Completada" : "Anulada"}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-y border-cream-200 py-3 text-sm"><p><span className="block text-xs text-choco-600">Unidades</span><strong>{sale.unitsTotal}</strong></p><p><span className="block text-xs text-choco-600">Total</span><strong>{formatCOP(sale.itemsTotal)}</strong></p><p className="text-right"><span className="block text-xs text-choco-600">Ganancia</span><strong className="text-success-500">{formatCOP(sale.earningsTotal)}</strong></p></div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-choco-600"><span>{sale.paymentMethod === "CASH" ? "Efectivo" : "Transferencia"}</span><Link href={`/admin/ventas/${sale.id}`} className="font-bold text-caramel-600">Ver detalle</Link></div>
    </article>}
  />;
}
