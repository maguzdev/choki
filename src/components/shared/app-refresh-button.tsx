"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function AppRefreshButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      aria-label="Actualizar información"
    >
      <RotateCw aria-hidden="true" className={pending ? "animate-spin" : ""} />
      <span className="hidden min-[420px]:inline">Actualizar</span>
    </Button>
  );
}
