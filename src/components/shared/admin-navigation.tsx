"use client";

import { Boxes, Home, PackagePlus, ReceiptText, ShoppingCart, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Inicio", icon: Home, exact: true },
  { href: "/admin/vender", label: "Vender", icon: Store },
  { href: "/admin/compras", label: "Compras", icon: ShoppingCart },
  { href: "/admin/inventario", label: "Inventario", icon: Boxes },
  { href: "/admin/productos", label: "Productos", icon: PackagePlus },
  { href: "/admin/ventas", label: "Ventas", icon: ReceiptText },
];

export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-cream-200 bg-cream-50 px-3 py-2" aria-label="Navegación administrativa">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const current = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${current ? "bg-caramel-400/25 text-choco-900" : "text-choco-600 hover:bg-cream-100"}`}><Icon aria-hidden="true" className="size-4" />{item.label}</Link>;
        })}
      </div>
    </nav>
  );
}
