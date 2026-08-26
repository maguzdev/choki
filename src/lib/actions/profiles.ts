"use server";

import { revalidatePath } from "next/cache";

import { requireParent } from "@/lib/auth/guards";
import { derivePinPassword } from "@/lib/auth/pin";
import { toLocalDate } from "@/lib/domain/dates";
import { profileSchema } from "@/lib/schemas/settings";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type ProfileActionResult = { status: "success" | "error"; message: string };

function text(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function revalidateProfiles() {
  for (const path of ["/login", "/admin", "/admin/perfiles", "/admin/configuracion", "/admin/vender", "/vender"]) revalidatePath(path);
}

function childEmail(name: string) {
  const slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "nino";
  return `nino-${slug}-${crypto.randomUUID().slice(0, 6)}@choki.local`;
}

function databaseMessage(message: string) {
  if (message.includes("duplicate key") || message.includes("already been registered")) return "Ese correo ya está asociado a otro perfil.";
  return "No fue posible guardar el perfil.";
}

export async function saveProfile(formData: FormData): Promise<ProfileActionResult> {
  const currentParent = await requireParent();
  const parsed = profileSchema.safeParse({
    id: text(formData, "id") || undefined,
    type: text(formData, "type"),
    name: text(formData, "name"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    pin: text(formData, "pin"),
    avatarEmoji: text(formData, "avatarEmoji"),
    color: text(formData, "color"),
    sortOrder: text(formData, "sortOrder"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa el perfil." };
  const input = parsed.data;
  const admin = createAdminSupabaseClient();

  if (input.id) {
    const { data: existing, error: existingError } = await admin.from("profiles").select("id, type, auth_email, active").eq("id", input.id).maybeSingle();
    if (existingError || !existing) return { status: "error", message: "El perfil ya no existe." };
    if (existing.type !== input.type) return { status: "error", message: "El tipo de un perfil existente no se puede cambiar." };
    if (existing.id === currentParent.id && !input.active) return { status: "error", message: "No puedes desactivar el perfil con el que estás trabajando." };
    if (existing.type === "PARENT" && existing.active && !input.active) {
      const { count, error: countError } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("type", "PARENT").eq("active", true);
      if (countError) return { status: "error", message: "No fue posible comprobar los perfiles activos." };
      if ((count ?? 0) <= 1) return { status: "error", message: "Debe quedar al menos un perfil de padre activo." };
    }
    if (existing.type === "CHILD" && existing.active && !input.active) {
      const [{ count }, { data: split, error: splitError }] = await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }).eq("type", "CHILD").eq("active", true),
        admin.from("profit_split_rules").select("percent").eq("child_id", existing.id).maybeSingle(),
      ]);
      if ((count ?? 0) <= 1) return { status: "error", message: "Debe quedar al menos un perfil infantil activo." };
      if (splitError) return { status: "error", message: "No fue posible comprobar el reparto familiar." };
      if (Number(split?.percent ?? 0) > 0) return { status: "error", message: "Antes de desactivar este niño, deja su reparto en 0 % y distribuye el 100 % entre los demás." };
    }

    const nextEmail = input.type === "PARENT" && input.email ? input.email : existing.auth_email;
    const authUpdate: { email?: string; email_confirm?: boolean; password?: string } = {};
    if (nextEmail !== existing.auth_email) Object.assign(authUpdate, { email: nextEmail, email_confirm: true });
    if (input.type === "PARENT" && input.password) authUpdate.password = input.password;
    if (input.type === "CHILD" && input.pin) authUpdate.password = derivePinPassword(existing.id, input.pin);
    if (Object.keys(authUpdate).length) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, authUpdate);
      if (error) return { status: "error", message: databaseMessage(error.message) };
    }
    const { error } = await admin.from("profiles").update({
      name: input.name,
      auth_email: nextEmail,
      avatar_emoji: input.avatarEmoji,
      color: input.color,
      sort_order: input.sortOrder,
      active: input.active,
      ...(input.type === "CHILD" && input.pin ? { pin_failed_attempts: 0, pin_locked_until: null } : {}),
    }).eq("id", existing.id);
    if (error) return { status: "error", message: databaseMessage(error.message) };
    revalidateProfiles();
    return { status: "success", message: "Perfil actualizado." };
  }

  const email = input.type === "CHILD" ? childEmail(input.name) : input.email;
  const initialPassword = input.type === "CHILD" ? `${crypto.randomUUID()}-${crypto.randomUUID()}` : input.password;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password: initialPassword, email_confirm: true });
  if (authError || !authData.user) return { status: "error", message: databaseMessage(authError?.message ?? "") };
  const userId = authData.user.id;

  if (input.type === "CHILD") {
    const { error } = await admin.auth.admin.updateUserById(userId, { password: derivePinPassword(userId, input.pin), email_confirm: true });
    if (error) {
      await admin.auth.admin.deleteUser(userId);
      return { status: "error", message: "No fue posible configurar el PIN inicial." };
    }
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    name: input.name,
    type: input.type,
    auth_email: email,
    avatar_emoji: input.avatarEmoji,
    color: input.color,
    active: input.active,
    sort_order: input.sortOrder,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { status: "error", message: databaseMessage(profileError.message) };
  }

  if (input.type === "CHILD") {
    const [{ data: settings }, { count: existingChildren }] = await Promise.all([
      admin.from("app_settings").select("timezone, protector_max").eq("id", 1).maybeSingle(),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("type", "CHILD").eq("active", true).neq("id", userId),
    ]);
    const timezone = settings?.timezone ?? "America/Bogota";
    const protectorMax = settings?.protector_max ?? 3;
    const now = new Date();
    const localDate = toLocalDate(now, timezone);
    const childRows = await Promise.all([
      admin.from("child_settings").insert({ child_id: userId, auto_saving_enabled: false, saving_percent: 0 }),
      admin.from("profit_split_rules").insert({ child_id: userId, percent: (existingChildren ?? 0) === 0 ? 100 : 0 }),
      admin.from("child_streaks").insert({ child_id: userId, current_streak: 0, best_streak: 0, protectors_available: protectorMax, last_activity_date: null, last_evaluated_date: localDate }),
      ...(protectorMax > 0 ? [admin.from("protector_events").insert({ child_id: userId, type: "GRANT", quantity: protectorMax, points_spent: 0, local_date: localDate, note: "Protectores gratuitos iniciales", created_at: now.toISOString() })] : []),
    ]);
    const setupError = childRows.find((result) => result.error)?.error;
    if (setupError) {
      await admin.auth.admin.deleteUser(userId);
      return { status: "error", message: "No fue posible completar la configuración inicial del niño." };
    }
  }

  revalidateProfiles();
  return { status: "success", message: input.type === "CHILD" ? "Perfil infantil creado con su PIN y configuración inicial." : "Perfil de padre creado." };
}
