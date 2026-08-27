import { Cookie, LogOut } from "lucide-react";
import Link from "next/link";

import { AppRefreshButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { requireChild } from "@/lib/auth/guards";

export default async function ChildLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireChild();

  return (
    <div className="min-h-dvh bg-cream-100">
      <header className="border-b border-cream-200 bg-cream-50/95 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caramel-600" aria-label="Ir al inicio de Choki">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-caramel-400 text-choco-900">
              <Cookie aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold text-choco-800">Choki</p>
              <p className="truncate text-xs text-choco-600">
                {profile.avatar_emoji} {profile.name}
              </p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-1"><AppRefreshButton /><form action={logout}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Cambiar de perfil"><LogOut aria-hidden="true" className="size-5" /></Button>
          </form></div>
        </div>
      </header>
      {children}
    </div>
  );
}
