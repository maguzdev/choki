"use server";

import { revalidatePath } from "next/cache";

import { requireParent } from "@/lib/auth/guards";
import { toLocalDate } from "@/lib/domain/dates";
import {
  achievementSchema, challengeSchema, gamificationRuleSchema, levelSchema, protectorMaxSchema,
} from "@/lib/schemas/gamification";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type GamificationActionResult = { status: "success" | "error"; message: string };

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function revalidateGamification() {
  for (const path of ["/progreso", "/racha", "/premios", "/admin/gamificacion", "/admin/recompensas"]) revalidatePath(path);
}

function databaseMessage(message: string, fallback: string) {
  if (message.includes("duplicate key")) return "Ya existe otro registro con ese número o código.";
  return fallback;
}

export async function saveGamificationRule(formData: FormData): Promise<GamificationActionResult> {
  await requireParent();
  const parsed = gamificationRuleSchema.safeParse({
    event: value(formData, "event"), xpAmount: value(formData, "xpAmount"),
    pointsAmount: value(formData, "pointsAmount"), active: formData.get("active") === "on",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa la regla." };
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("gamification_rules").upsert({
    event: parsed.data.event, xp_amount: parsed.data.xpAmount, points_amount: parsed.data.pointsAmount,
    active: parsed.data.active, updated_at: new Date().toISOString(),
  }, { onConflict: "event" });
  if (error) return { status: "error", message: "No fue posible guardar la regla." };
  revalidateGamification();
  return { status: "success", message: "Regla actualizada. Solo afectará ventas futuras." };
}

export async function saveLevel(formData: FormData): Promise<GamificationActionResult> {
  await requireParent();
  const parsed = levelSchema.safeParse({
    id: value(formData, "id") || undefined, number: value(formData, "number"), name: value(formData, "name"),
    xpRequired: value(formData, "xpRequired"), icon: value(formData, "icon"), description: value(formData, "description"),
    benefit: value(formData, "benefit"), active: formData.get("active") === "on",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa el nivel." };
  const admin = createAdminSupabaseClient();
  const row = { number: parsed.data.number, name: parsed.data.name, xp_required: parsed.data.xpRequired, icon: parsed.data.icon, description: parsed.data.description, benefit: parsed.data.benefit, active: parsed.data.active };
  const result = parsed.data.id ? await admin.from("levels").update(row).eq("id", parsed.data.id) : await admin.from("levels").insert(row);
  if (result.error) return { status: "error", message: databaseMessage(result.error.message, "No fue posible guardar el nivel.") };
  revalidateGamification();
  return { status: "success", message: parsed.data.id ? "Nivel actualizado." : "Nivel creado." };
}

export async function deleteLevel(levelId: string): Promise<GamificationActionResult> {
  await requireParent();
  const parsed = levelSchema.shape.id.safeParse(levelId);
  if (!parsed.success || !parsed.data) return { status: "error", message: "El nivel no es válido." };
  const admin = createAdminSupabaseClient();
  const { data: level, error: lookupError } = await admin.from("levels").select("active").eq("id", parsed.data).maybeSingle();
  if (lookupError || !level) return { status: "error", message: "El nivel ya no existe." };
  if (level.active) {
    const { count } = await admin.from("levels").select("id", { count: "exact", head: true }).eq("active", true);
    if ((count ?? 0) <= 1) return { status: "error", message: "Debe quedar al menos un nivel activo." };
  }
  const { error } = await admin.from("levels").delete().eq("id", parsed.data);
  if (error) return { status: "error", message: "No fue posible eliminar el nivel." };
  revalidateGamification();
  return { status: "success", message: "Nivel eliminado." };
}

export async function saveAchievement(formData: FormData): Promise<GamificationActionResult> {
  await requireParent();
  const conditionType = value(formData, "conditionType");
  const parsed = achievementSchema.safeParse({
    id: value(formData, "id") || undefined, code: value(formData, "code").toUpperCase(), name: value(formData, "name"),
    description: value(formData, "description"), icon: value(formData, "icon"), conditionType,
    targetValue: value(formData, "targetValue"), productId: conditionType === "PRODUCT_UNITS" ? value(formData, "productId") || null : null,
    xpReward: value(formData, "xpReward"), pointsReward: value(formData, "pointsReward"),
    hidden: formData.get("hidden") === "on", active: formData.get("active") === "on", sortOrder: value(formData, "sortOrder"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa el logro." };
  const admin = createAdminSupabaseClient();
  const row = { code: parsed.data.code, name: parsed.data.name, description: parsed.data.description, icon: parsed.data.icon,
    condition_type: parsed.data.conditionType, target_value: parsed.data.targetValue, product_id: parsed.data.productId,
    xp_reward: parsed.data.xpReward, points_reward: parsed.data.pointsReward, hidden: parsed.data.hidden,
    active: parsed.data.active, sort_order: parsed.data.sortOrder };
  const result = parsed.data.id ? await admin.from("achievements").update(row).eq("id", parsed.data.id) : await admin.from("achievements").insert(row);
  if (result.error) return { status: "error", message: databaseMessage(result.error.message, "No fue posible guardar el logro.") };
  revalidateGamification();
  return { status: "success", message: parsed.data.id ? "Logro actualizado." : "Logro creado." };
}

export async function deleteAchievement(achievementId: string): Promise<GamificationActionResult> {
  await requireParent();
  const parsed = levelSchema.shape.id.safeParse(achievementId);
  if (!parsed.success || !parsed.data) return { status: "error", message: "El logro no es válido." };
  const admin = createAdminSupabaseClient();
  const { count, error: countError } = await admin.from("achievement_unlocks").select("id", { count: "exact", head: true }).eq("achievement_id", parsed.data);
  if (countError) return { status: "error", message: "No fue posible comprobar el historial del logro." };
  if ((count ?? 0) > 0) return { status: "error", message: "Este logro ya fue desbloqueado. Desactívalo para conservar el reconocimiento histórico." };
  const { error } = await admin.from("achievements").delete().eq("id", parsed.data);
  if (error) return { status: "error", message: "No fue posible eliminar el logro." };
  revalidateGamification();
  return { status: "success", message: "Logro eliminado." };
}

export async function saveChallenge(formData: FormData): Promise<GamificationActionResult> {
  await requireParent();
  const conditionType = value(formData, "conditionType");
  const parsed = challengeSchema.safeParse({
    id: value(formData, "id") || undefined, name: value(formData, "name"), description: value(formData, "description"),
    icon: value(formData, "icon"), startsOn: value(formData, "startsOn"), endsOn: value(formData, "endsOn"),
    conditionType, targetValue: value(formData, "targetValue"), productId: conditionType === "PRODUCT_UNITS" ? value(formData, "productId") || null : null,
    xpReward: value(formData, "xpReward"), pointsReward: value(formData, "pointsReward"), status: value(formData, "status"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa el reto." };
  const admin = createAdminSupabaseClient();
  const row = { name: parsed.data.name, description: parsed.data.description, icon: parsed.data.icon,
    starts_on: parsed.data.startsOn, ends_on: parsed.data.endsOn, condition_type: parsed.data.conditionType,
    target_value: parsed.data.targetValue, product_id: parsed.data.productId, xp_reward: parsed.data.xpReward,
    points_reward: parsed.data.pointsReward, status: parsed.data.status };
  const result = parsed.data.id ? await admin.from("challenges").update(row).eq("id", parsed.data.id) : await admin.from("challenges").insert(row);
  if (result.error) return { status: "error", message: "No fue posible guardar el reto." };
  revalidateGamification();
  return { status: "success", message: parsed.data.id ? "Reto actualizado." : "Reto creado." };
}

export async function deleteChallenge(challengeId: string): Promise<GamificationActionResult> {
  await requireParent();
  const parsed = levelSchema.shape.id.safeParse(challengeId);
  if (!parsed.success || !parsed.data) return { status: "error", message: "El reto no es válido." };
  const admin = createAdminSupabaseClient();
  const { count, error: countError } = await admin.from("challenge_progress").select("id", { count: "exact", head: true }).eq("challenge_id", parsed.data);
  if (countError) return { status: "error", message: "No fue posible comprobar el progreso del reto." };
  if ((count ?? 0) > 0) return { status: "error", message: "Este reto ya tiene progreso. Márcalo como finalizado para conservar el historial." };
  const { error } = await admin.from("challenges").delete().eq("id", parsed.data);
  if (error) return { status: "error", message: "No fue posible eliminar el reto." };
  revalidateGamification();
  return { status: "success", message: "Reto eliminado." };
}

export async function updateProtectorMax(formData: FormData): Promise<GamificationActionResult> {
  await requireParent();
  const parsed = protectorMaxSchema.safeParse(value(formData, "protectorMax"));
  if (!parsed.success) return { status: "error", message: "El máximo debe estar entre 0 y 20." };
  const admin = createAdminSupabaseClient();
  const { data: states, error: stateError } = await admin.from("child_streaks").select("protectors_available");
  if (stateError) return { status: "error", message: "No fue posible comprobar los protectores actuales." };
  const currentMax = Math.max(0, ...(states ?? []).map((state) => state.protectors_available));
  if (parsed.data < currentMax) return { status: "error", message: `Hay un niño con ${currentMax} protectores. El límite no puede quedar por debajo.` };
  const { error } = await admin.from("app_settings").update({ protector_max: parsed.data, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return { status: "error", message: "No fue posible guardar el límite." };
  revalidateGamification();
  return { status: "success", message: "Límite de protectores actualizado." };
}

export async function finishExpiredChallenges(): Promise<void> {
  await requireParent();
  const admin = createAdminSupabaseClient();
  const { data: settings } = await admin.from("app_settings").select("timezone").eq("id", 1).maybeSingle();
  const today = toLocalDate(new Date(), settings?.timezone ?? "America/Bogota");
  await admin.from("challenges").update({ status: "FINISHED" }).eq("status", "ACTIVE").lt("ends_on", today);
}
