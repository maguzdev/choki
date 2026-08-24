"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginWithPassword, type AuthActionState } from "@/lib/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full text-base" disabled={pending}>
      {pending ? "Entrando…" : "Entrar"}
    </Button>
  );
}

export function PasswordLoginForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const initialState: AuthActionState = { status: "idle" };
  const [state, formAction] = useActionState(loginWithPassword, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="font-semibold text-choco-800">
          Correo
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultEmail}
          autoComplete="email"
          className="h-12 bg-cream-50 px-4"
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="font-semibold text-choco-800">
          Contraseña
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="h-12 bg-cream-50 px-4"
          required
        />
      </div>

      {state.message ? (
        <p className="text-sm font-semibold text-danger-500" role="alert">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
