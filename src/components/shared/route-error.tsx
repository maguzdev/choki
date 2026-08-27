"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RouteError({ reset }: { reset: () => void }) {
  return <main className="mx-auto flex min-h-[45dvh] w-full max-w-xl items-center justify-center px-4 py-10"><section className="rounded-card border border-danger-500/30 bg-cream-50 p-6 text-center shadow-soft"><TriangleAlert aria-hidden="true" className="mx-auto size-9 text-danger-500" /><h1 className="mt-3 font-display text-2xl font-bold text-choco-800">No pudimos cargar esta sección</h1><p className="mt-2 text-sm leading-6 text-choco-600">No se realizó ningún cambio. Intenta cargar la información nuevamente.</p><Button type="button" className="mt-5" onClick={reset}><RotateCcw aria-hidden="true" /> Reintentar</Button></section></main>;
}
