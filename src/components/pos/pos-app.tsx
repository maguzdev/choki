"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Search, ShoppingBasket } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SaleSummary } from "@/lib/actions/sales";
import { createClientUuid } from "@/lib/client-id";
import type { PosData } from "@/lib/data/pos";
import { formatCOP } from "@/lib/domain/money";
import { PaymentSheet } from "./payment-sheet";
import { ProductRow } from "./product-row";
import { SaleResultSheet } from "./sale-result-sheet";

type Cart = Record<string, number>;
type CartAction = { type: "add" | "remove"; productId: string } | { type: "restore"; cart: Cart } | { type: "reset" };

function cartReducer(state: Cart, action: CartAction): Cart {
  if (action.type === "restore") return action.cart;
  if (action.type === "reset") return {};
  const current = state[action.productId] ?? 0;
  if (action.type === "add") return { ...state, [action.productId]: current + 1 };
  if (current <= 1) {
    const next = { ...state };
    delete next[action.productId];
    return next;
  }
  return { ...state, [action.productId]: current - 1 };
}

export function PosApp({ seller, categories, products, homeHref }: PosData & { homeHref: string }) {
  const [cart, dispatch] = useReducer(cartReducer, {});
  const [hydrated, setHydrated] = useState(false);
  const [categoryId, setCategoryId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [saleId, setSaleId] = useState("");
  const [summary, setSummary] = useState<SaleSummary>();
  const [resultMessage, setResultMessage] = useState<string>();
  const skipNextPersist = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("choki:cart") ?? "null") as { sellerId?: string; items?: Cart } | null;
      if (saved?.sellerId === seller.id && saved.items) {
        const stockById = new Map(products.map((product) => [product.id, Math.max(0, product.stock)]));
        dispatch({
          type: "restore",
          cart: Object.fromEntries(Object.entries(saved.items).flatMap(([id, quantity]) => {
            const stock = stockById.get(id) ?? 0;
            const restored = Number.isInteger(quantity) ? Math.min(quantity, stock) : 0;
            return restored > 0 ? [[id, restored]] : [];
          })),
        });
      }
    } catch {
      sessionStorage.removeItem("choki:cart");
    }
    setHydrated(true);
  }, [products, seller.id]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    sessionStorage.setItem("choki:cart", JSON.stringify({ sellerId: seller.id, items: cart }));
  }, [cart, hydrated, seller.id]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const categoryMatches = categoryId === "ALL" || product.categoryId === categoryId;
    const searchMatches = !search || product.name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es"));
    return categoryMatches && searchMatches;
  }), [categoryId, products, search]);
  const cartItems = products.flatMap((product) => {
    const quantity = cart[product.id] ?? 0;
    return quantity > 0 ? [{ productId: product.id, quantity, price: product.price }] : [];
  });
  const unitsTotal = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const itemsTotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

  function openPayment() {
    if (!unitsTotal) return;
    setSaleId(createClientUuid());
    setPaymentOpen(true);
  }
  function completed(nextSummary: SaleSummary, message?: string) {
    setSummary(nextSummary);
    setResultMessage(message);
    skipNextPersist.current = true;
    sessionStorage.removeItem("choki:cart");
    dispatch({ type: "reset" });
    setPaymentOpen(false);
    setResultOpen(true);
  }
  function newSale() {
    setResultOpen(false);
    setSummary(undefined);
    setResultMessage(undefined);
    setSaleId("");
  }

  if (!hydrated) {
    return <main className="mx-auto flex min-h-[calc(100dvh-68px)] w-full max-w-3xl items-center justify-center bg-cream-100 px-4"><p className="rounded-card bg-cream-50 p-5 font-semibold text-choco-600 shadow-soft">Preparando tu carrito…</p></main>;
  }

  return <main className="mx-auto min-h-[calc(100dvh-68px)] w-full max-w-3xl bg-cream-100 pb-32">
    <header className="sticky top-0 z-20 border-b border-cream-200 bg-cream-50/95 px-4 py-3 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-wide text-choco-600">Vendiendo como</p>
      <h1 className="font-display text-2xl font-bold text-choco-800">{seller.avatarEmoji} {seller.name}</h1>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Categorías">
        <button type="button" onClick={() => setCategoryId("ALL")} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${categoryId === "ALL" ? "border-caramel-600 bg-caramel-400/30" : "border-cream-200 bg-white"}`}>Todos</button>
        {categories.map((category) => <button key={category.id} type="button" onClick={() => setCategoryId(category.id)} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${categoryId === category.id ? "border-caramel-600 bg-caramel-400/30" : "border-cream-200 bg-white"}`}>{category.emoji} {category.name}</button>)}
      </div>
      {products.length > 12 ? <label className="relative mt-3 block"><Search aria-hidden="true" className="absolute left-3 top-3 size-5 text-choco-400" /><span className="sr-only">Buscar producto</span><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-cream-200 bg-white pl-10 pr-3" placeholder="Buscar producto" /></label> : null}
    </header>

    <section className="mx-4 mt-4 overflow-hidden rounded-card border border-cream-200 bg-cream-50 shadow-soft" aria-label="Productos">
      {visibleProducts.map((product) => <ProductRow key={product.id} product={product} quantity={cart[product.id] ?? 0} onAdd={() => dispatch({ type: "add", productId: product.id })} onRemove={() => dispatch({ type: "remove", productId: product.id })} />)}
      {visibleProducts.length === 0 ? <div className="p-8 text-center"><ShoppingBasket aria-hidden="true" className="mx-auto size-10 text-caramel-600" /><p className="mt-3 font-semibold">No hay productos para mostrar.</p></div> : null}
    </section>

    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cream-200 bg-cream-50/95 px-4 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_20px_rgba(59,36,28,.1)] backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3"><div className="min-w-0 flex-1"><p className="text-sm text-choco-600">{unitsTotal} {unitsTotal === 1 ? "producto" : "productos"}</p><p className="font-display text-2xl font-bold tabular-nums text-choco-800">{formatCOP(itemsTotal)}</p></div><Button type="button" className="min-h-12 px-5" disabled={!unitsTotal} onClick={openPayment}>Registrar venta</Button></div>
    </div>

    {saleId ? <PaymentSheet key={saleId} open={paymentOpen} onOpenChange={setPaymentOpen} saleId={saleId} seller={seller} items={cartItems.map(({ productId, quantity }) => ({ productId, quantity }))} itemsTotal={itemsTotal} onCompleted={completed} /> : null}
    <SaleResultSheet open={resultOpen} summary={summary} message={resultMessage} homeHref={homeHref} onNewSale={newSale} />
  </main>;
}
