import { Cookie, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AdminNavigation, AppRefreshButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { requireParent } from "@/lib/auth/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireParent();

  return (
    <div className="min-h-dvh bg-cream-100">
      <header className="border-b border-cream-200 bg-choco-800 px-4 py-3 text-cream-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/admin" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caramel-400" aria-label="Ir al inicio administrativo de Choki">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-caramel-400 text-choco-900">
              <Cookie aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">Choki Admin</p>
              <p className="flex items-center gap-1 truncate text-xs text-cream-200">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                {profile.name}
              </p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-1"><AppRefreshButton className="text-cream-50 hover:bg-cream-50/10 hover:text-cream-50" /><form action={logout}>
            <Button type="submit" variant="ghost" size="icon" className="text-cream-50 hover:bg-cream-50/10 hover:text-cream-50" aria-label="Cambiar de perfil"><LogOut aria-hidden="true" className="size-5" /></Button>
          </form></div>
        </div>
      </header>
      <AdminNavigation />
      {children}
    </div>
  );
}
