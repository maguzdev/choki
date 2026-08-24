"use client";

import { Delete } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { loginWithPin, type AuthActionState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

type PinPadProps = {
  profileId: string;
  initialLockedUntil?: string;
};

export function PinPad({ profileId, initialLockedUntil }: PinPadProps) {
  const initialState: AuthActionState = initialLockedUntil
    ? {
        status: "locked",
        message: "Este perfil está bloqueado temporalmente.",
        lockedUntil: initialLockedUntil,
      }
    : { status: "idle" };
  const [state, formAction, isPending] = useActionState(loginWithPin, initialState);
  const [pin, setPin] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedPinRef = useRef<string | null>(null);
  const lockedUntil = state.lockedUntil ?? initialLockedUntil;
  const remainingSeconds =
    now !== null && lockedUntil
      ? Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - now) / 1000))
      : 0;
  const isLocked = remainingSeconds > 0;

  useEffect(() => {
    setNow(Date.now());
    if (!lockedUntil) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [lockedUntil]);

  useEffect(() => {
    if (
      pin.length === 4 &&
      submittedPinRef.current !== pin &&
      !isPending &&
      !isLocked
    ) {
      submittedPinRef.current = pin;
      formRef.current?.requestSubmit();
    }
  }, [isLocked, isPending, pin]);

  useEffect(() => {
    if (state.status === "error" || state.status === "locked") {
      submittedPinRef.current = null;
      setPin("");
    }
  }, [state]);

  function addDigit(digit: number) {
    if (isPending || isLocked) return;
    setPin((current) => `${current}${digit}`.slice(0, 4));
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="pin" value={pin} />

      <div className="flex justify-center gap-3" aria-label={`${pin.length} de 4 dígitos escritos`}>
        {[0, 1, 2, 3].map((position) => (
          <span
            key={position}
            aria-hidden="true"
            className={cn(
              "size-4 rounded-full border-2 border-choco-400 transition-colors",
              position < pin.length && "border-caramel-600 bg-caramel-500",
            )}
          />
        ))}
      </div>

      <div className="min-h-12 text-center" aria-live="polite">
        {isPending ? <p className="font-semibold text-choco-600">Comprobando…</p> : null}
        {!isPending && isLocked ? (
          <p className="font-semibold text-danger-500">
            Intenta de nuevo en {minutes}:{seconds}
          </p>
        ) : null}
        {!isPending && !isLocked && state.message ? (
          <p className={state.status === "success" ? "text-success-500" : "text-danger-500"}>
            {state.message}
          </p>
        ) : null}
      </div>

      <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-3">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => addDigit(digit)}
            disabled={isPending || isLocked}
            aria-label={`Dígito ${digit}`}
            className="aspect-square min-h-16 rounded-card border border-cream-200 bg-cream-50 font-display text-3xl font-bold text-choco-800 shadow-soft transition active:scale-95 disabled:opacity-50"
          >
            {digit}
          </button>
        ))}
        <span aria-hidden="true" />
        <button
          type="button"
          onClick={() => addDigit(0)}
          disabled={isPending || isLocked}
          aria-label="Dígito 0"
          className="aspect-square min-h-16 rounded-card border border-cream-200 bg-cream-50 font-display text-3xl font-bold text-choco-800 shadow-soft transition active:scale-95 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => setPin((current) => current.slice(0, -1))}
          disabled={isPending || isLocked || pin.length === 0}
          aria-label="Borrar último dígito"
          className="flex aspect-square min-h-16 items-center justify-center rounded-card text-choco-600 transition active:scale-95 disabled:opacity-30"
        >
          <Delete aria-hidden="true" className="size-7" />
        </button>
      </div>
    </form>
  );
}
