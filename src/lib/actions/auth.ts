"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireChild, requireParent } from "@/lib/auth/guards";
import { derivePinPassword } from "@/lib/auth/pin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const pinSchema = z.string().regex(/^\d{4}$/, "El PIN debe tener exactamente 4 dígitos.");
const passwordLoginSchema = z.object({
  email: z.string().trim().email("Escribe un correo válido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

export type AuthActionState = {
  status: "idle" | "error" | "locked" | "success";
  message?: string;
  lockedUntil?: string;
};

function fieldValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function fiveMinutesFromNow() {
  return new Date(Date.now() + 5 * 60 * 1000).toISOString();
}

export async function loginWithPin(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const profileId = fieldValue(formData, "profileId");
  const parsedPin = pinSchema.safeParse(fieldValue(formData, "pin"));

  if (!profileId || !parsedPin.success) {
    return {
      status: "error",
      message: parsedPin.error?.issues[0]?.message ?? "Selecciona un perfil válido.",
    };
  }

  const admin = createAdminSupabaseClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, type, auth_email, active, pin_failed_attempts, pin_locked_until")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError || !profile || profile.type !== "CHILD" || !profile.active) {
    return { status: "error", message: "Este perfil no está disponible." };
  }

  const now = Date.now();
  const lockExpiresAt = profile.pin_locked_until
    ? new Date(profile.pin_locked_until).getTime()
    : 0;

  if (lockExpiresAt > now) {
    return {
      status: "locked",
      message: "Demasiados intentos. Espera antes de volver a probar.",
      lockedUntil: profile.pin_locked_until ?? undefined,
    };
  }

  const attemptsBeforeThisTry = lockExpiresAt > 0 ? 0 : profile.pin_failed_attempts;
  const supabase = await createServerSupabaseClient();
  const password = derivePinPassword(profile.id, parsedPin.data);
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.auth_email,
    password,
  });

  if (signInError) {
    const failedAttempts = attemptsBeforeThisTry + 1;
    const lockedUntil = failedAttempts >= 5 ? fiveMinutesFromNow() : null;
    const { error: updateError } = await admin
      .from("profiles")
      .update({
        pin_failed_attempts: failedAttempts,
        pin_locked_until: lockedUntil,
      })
      .eq("id", profile.id);

    if (updateError) {
      return { status: "error", message: "No pudimos validar el PIN. Intenta de nuevo." };
    }

    if (lockedUntil) {
      return {
        status: "locked",
        message: "Llegaste a 5 intentos. El acceso se bloqueó durante 5 minutos.",
        lockedUntil,
      };
    }

    const remaining = 5 - failedAttempts;
    return {
      status: "error",
      message: `PIN incorrecto. Te ${remaining === 1 ? "queda" : "quedan"} ${remaining} ${
        remaining === 1 ? "intento" : "intentos"
      }.`,
    };
  }

  await admin
    .from("profiles")
    .update({ pin_failed_attempts: 0, pin_locked_until: null })
    .eq("id", profile.id);

  redirect("/");
}

export async function loginWithPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = passwordLoginSchema.safeParse({
    email: fieldValue(formData, "email"),
    password: fieldValue(formData, "password"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !user) {
    return { status: "error", message: "Correo o contraseña incorrectos." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("type, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.active || profile.type !== "PARENT") {
    await supabase.auth.signOut();
    return { status: "error", message: "Esta cuenta no tiene acceso de padre." };
  }

  redirect("/admin");
}

export async function logout() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setChildPin(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  await requireParent();

  const childId = fieldValue(formData, "childId");
  const parsedPin = pinSchema.safeParse(fieldValue(formData, "pin"));
  if (!childId || !parsedPin.success) {
    return {
      status: "error",
      message: parsedPin.error?.issues[0]?.message ?? "Selecciona un niño válido.",
    };
  }

  const admin = createAdminSupabaseClient();
  const { data: child } = await admin
    .from("profiles")
    .select("id, type")
    .eq("id", childId)
    .maybeSingle();

  if (!child || child.type !== "CHILD") {
    return { status: "error", message: "El perfil seleccionado no es de un niño." };
  }

  const { error } = await admin.auth.admin.updateUserById(child.id, {
    password: derivePinPassword(child.id, parsedPin.data),
  });

  if (error) {
    return { status: "error", message: "No fue posible actualizar el PIN." };
  }

  await admin
    .from("profiles")
    .update({ pin_failed_attempts: 0, pin_locked_until: null })
    .eq("id", child.id);

  return { status: "success", message: "PIN actualizado." };
}

export async function changeMyPin(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const child = await requireChild();
  const currentPin = pinSchema.safeParse(fieldValue(formData, "currentPin"));
  const newPin = pinSchema.safeParse(fieldValue(formData, "newPin"));

  if (!currentPin.success || !newPin.success) {
    return {
      status: "error",
      message: currentPin.error?.issues[0]?.message ?? newPin.error?.issues[0]?.message,
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error: verificationError } = await supabase.auth.signInWithPassword({
    email: child.auth_email,
    password: derivePinPassword(child.id, currentPin.data),
  });

  if (verificationError) {
    return { status: "error", message: "El PIN actual no es correcto." };
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin.auth.admin.updateUserById(child.id, {
    password: derivePinPassword(child.id, newPin.data),
  });

  if (error) {
    return { status: "error", message: "No fue posible actualizar el PIN." };
  }

  await admin
    .from("profiles")
    .update({ pin_failed_attempts: 0, pin_locked_until: null })
    .eq("id", child.id);

  return { status: "success", message: "Tu PIN se actualizó correctamente." };
}
