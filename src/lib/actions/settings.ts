"use server";

import { revalidatePath } from "next/cache";

import { requireParent } from "@/lib/auth/guards";
import { globalSettingsSchema, splitRuleSchema } from "@/lib/schemas/settings";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type SettingsActionResult = { status: "success" | "error"; message: string };

function text(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function revalidateSettings() {
  for (const path of ["/", "/vender", "/racha", "/premios", "/admin", "/admin/vender", "/admin/configuracion", "/admin/gamificacion"]) {
    revalidatePath(path);
  }
}

export async function saveGlobalSettings(formData: FormData): Promise<SettingsActionResult> {
  await requireParent();
  const parsed = globalSettingsSchema.safeParse({
    familyName: text(formData, "familyName"),
    timezone: text(formData, "timezone"),
    protectorMax: text(formData, "protectorMax"),
    lowStockAlerts: formData.get("lowStockAlerts") === "on",
    celebrations: formData.get("celebrations") === "on",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa la configuración." };

  const admin = createAdminSupabaseClient();
  const { data: streaks, error: streakError } = await admin.from("child_streaks").select("protectors_available");
  if (streakError) return { status: "error", message: "No fue posible comprobar los protectores actuales." };
  const highestAvailable = Math.max(0, ...(streaks ?? []).map((streak) => streak.protectors_available));
  if (parsed.data.protectorMax < highestAvailable) {
    return { status: "error", message: `Hay un niño con ${highestAvailable} protectores. Consume protectores antes de reducir el límite.` };
  }

  const { error } = await admin.from("app_settings").update({
    family_name: parsed.data.familyName,
    timezone: parsed.data.timezone,
    protector_max: parsed.data.protectorMax,
    low_stock_alerts: parsed.data.lowStockAlerts,
    celebrations: parsed.data.celebrations,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return { status: "error", message: "No fue posible guardar la configuración familiar." };
  revalidateSettings();
  return { status: "success", message: "Configuración familiar actualizada." };
}

export async function saveProfitSplit(formData: FormData): Promise<SettingsActionResult> {
  await requireParent();
  const admin = createAdminSupabaseClient();
  const { data: children, error: childrenError } = await admin
    .from("profiles")
    .select("id, name")
    .eq("type", "CHILD")
    .eq("active", true)
    .order("sort_order");
  if (childrenError) return { status: "error", message: "No fue posible comprobar los perfiles infantiles." };
  if (!children?.length) return { status: "error", message: "Debe existir al menos un niño activo para configurar el reparto." };

  const rules = children.map((child) => splitRuleSchema.safeParse({ childId: child.id, percent: text(formData, `percent-${child.id}`) }));
  const invalid = rules.find((rule) => !rule.success);
  if (invalid && !invalid.success) return { status: "error", message: invalid.error.issues[0]?.message ?? "Revisa los porcentajes." };
  const values = rules.flatMap((rule) => rule.success ? [rule.data] : []);
  const total = values.reduce((sum, rule) => sum + rule.percent, 0);
  if (Math.abs(total - 100) > 0.000_001) {
    return { status: "error", message: `El reparto debe sumar exactamente 100 %. Actualmente suma ${total.toLocaleString("es-CO", { maximumFractionDigits: 2 })} %.` };
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("profit_split_rules").upsert(
    values.map((rule) => ({ child_id: rule.childId, percent: rule.percent, updated_at: now })),
    { onConflict: "child_id" },
  );
  if (error) return { status: "error", message: "No fue posible guardar el reparto familiar." };
  revalidateSettings();
  return { status: "success", message: "Reparto familiar actualizado. Solo se aplicará a ventas futuras de los padres." };
}
