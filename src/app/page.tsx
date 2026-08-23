import { Cookie, HeartHandshake, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";

const foundations = [
  {
    icon: Smartphone,
    title: "Mobile first",
    description: "Una base cómoda desde 360 px, con acciones táctiles de 44 px.",
  },
  {
    icon: HeartHandshake,
    title: "Hecho en familia",
    description: "Un solo lugar para aprender, vender y celebrar el progreso.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-8 sm:px-8 sm:py-12">
      <section className="flex flex-1 flex-col justify-center gap-8">
        <header className="space-y-4 text-center sm:text-left">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-caramel-400 text-choco-900 shadow-soft sm:mx-0">
            <Cookie aria-hidden="true" className="size-11" strokeWidth={2.25} />
          </div>
          <div className="space-y-2">
            <p className="font-display text-lg font-semibold text-caramel-600">
              Emprendimiento familiar
            </p>
            <h1 className="font-display text-5xl font-bold tracking-tight text-choco-800 sm:text-6xl">
              Choki
            </h1>
            <p className="mx-auto max-w-xl text-base leading-7 text-choco-600 sm:mx-0 sm:text-lg">
              Esfuerzo, ventas y progreso en una experiencia sencilla para toda la familia.
            </p>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {foundations.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-card border border-cream-200 bg-cream-50 p-5 shadow-soft"
            >
              <Icon aria-hidden="true" className="mb-3 size-6 text-caramel-600" />
              <h2 className="font-display text-xl font-bold text-choco-800">{title}</h2>
              <p className="mt-1 leading-6 text-choco-600">{description}</p>
            </article>
          ))}
        </div>

        <Button className="h-12 w-full text-base sm:w-fit" disabled>
          La aventura comienza pronto
        </Button>
      </section>

      <footer className="pt-10 text-center text-sm text-choco-400 sm:text-left">
        Fase 0 · Base técnica lista
      </footer>
    </main>
  );
}
