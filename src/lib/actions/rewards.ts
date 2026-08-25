"use server";

import { revalidatePath } from "next/cache";

import { requireChildSelf, requireParent } from "@/lib/auth/guards";
import { ensureStreakUpToDate } from "@/lib/actions/streak";
import { toLocalDate } from "@/lib/domain/dates";
import { redeemRewardSchema, redemptionStatusSchema, rewardSchema } from "@/lib/schemas/gamification";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

type PointRow = Database["public"]["Tables"]["point_movements"]["Row"];
type RedemptionRow = Database["public"]["Tables"]["redemptions"]["Row"];
type ProtectorRow = Database["public"]["Tables"]["protector_events"]["Row"];

export type RewardActionResult = { status: "success" | "error"; message: string };

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function revalidateRewards() {
  for (const path of ["/progreso", "/racha", "/premios", "/admin/recompensas"]) revalidatePath(path);
}

function redeemError(message: string) {
  if (message.includes("INSUFFICIENT_POINTS")) return "No tienes puntos suficientes para este premio.";
  if (message.includes("PROTECTOR_LIMIT_REACHED")) return "Ya tienes el máximo de protectores permitido.";
  if (message.includes("REWARD_OUT_OF_STOCK")) return "Este premio se quedó sin existencias.";
  if (message.includes("REWARD_UNAVAILABLE")) return "Este premio ya no está disponible.";
  return "No fue posible canjear el premio. Intenta de nuevo.";
}

export async function redeemReward(input: { childId: string; rewardId: string }): Promise<RewardActionResult> {
  const parsed = redeemRewardSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "El premio no es válido." };
  const child = await requireChildSelf(parsed.data.childId);
  const sync = await ensureStreakUpToDate(child.id, true);
  if (sync.status === "error") return { status: "error", message: sync.message ?? "No fue posible comprobar tus protectores." };
  const admin = createAdminSupabaseClient();
  const [rewardResult, settingsResult, pointsResult, streakResult] = await Promise.all([
    admin.from("rewards").select("id, name, cost_points, type, stock, active").eq("id", parsed.data.rewardId).maybeSingle(),
    admin.from("app_settings").select("timezone, protector_max").eq("id", 1).maybeSingle(),
    admin.from("point_movements").select("amount").eq("child_id", child.id),
    admin.from("child_streaks").select("protectors_available").eq("child_id", child.id).maybeSingle(),
  ]);
  if (rewardResult.error || !rewardResult.data || settingsResult.error || !settingsResult.data || pointsResult.error || streakResult.error) {
    return { status: "error", message: "No fue posible comprobar el premio." };
  }
  const reward = rewardResult.data;
  const points = (pointsResult.data ?? []).reduce((sum, row) => sum + row.amount, 0);
  if (!reward.active) return { status: "error", message: "Este premio ya no está disponible." };
  if (reward.stock !== null && reward.stock <= 0) return { status: "error", message: "Este premio se quedó sin existencias." };
  if (points < reward.cost_points) return { status: "error", message: `Te faltan ${reward.cost_points - points} puntos para canjearlo.` };
  if (reward.type === "STREAK_PROTECTOR" && (streakResult.data?.protectors_available ?? 0) >= settingsResult.data.protector_max) {
    return { status: "error", message: "Ya tienes el máximo de protectores permitido." };
  }

  const now = new Date();
  const createdAt = now.toISOString();
  const localDate = toLocalDate(now, settingsResult.data.timezone);
  const redemptionId = crypto.randomUUID();
  const isProtector = reward.type === "STREAK_PROTECTOR";
  const point: PointRow = {
    id: crypto.randomUUID(), child_id: child.id, amount: -reward.cost_points,
    reason: isProtector ? "PROTECTOR_PURCHASE" : "REDEMPTION",
    reference_type: isProtector ? "PROTECTOR" : "REDEMPTION", reference_id: redemptionId,
    description: isProtector ? `Protector: ${reward.name}` : `Canje: ${reward.name}`, created_at: createdAt,
  };
  const redemption: RedemptionRow = {
    id: redemptionId, reward_id: reward.id, child_id: child.id, reward_name: reward.name,
    points_spent: reward.cost_points, status: isProtector ? "DELIVERED" : "PENDING",
    redeemed_at: createdAt, delivered_at: isProtector ? createdAt : null, note: null,
  };
  const protector: ProtectorRow | null = isProtector ? {
    id: crypto.randomUUID(), child_id: child.id, type: "PURCHASE", quantity: 1,
    points_spent: reward.cost_points, local_date: localDate, note: reward.name, created_at: createdAt,
  } : null;
  const { error } = await admin.rpc("reward_redeem", { p: { point, redemption, protector } as unknown as Json });
  if (error) return { status: "error", message: redeemError(error.message) };
  revalidateRewards();
  return { status: "success", message: isProtector ? "Protector repuesto. Vuelves a tener una protección disponible." : "Premio canjeado. Un adulto verá que está pendiente de entrega." };
}

export async function saveReward(formData: FormData): Promise<RewardActionResult> {
  await requireParent();
  const parsed = rewardSchema.safeParse({
    id: value(formData, "id") || undefined,
    name: value(formData, "name"), description: value(formData, "description"), icon: value(formData, "icon"),
    imageUrl: value(formData, "imageUrl"), costPoints: value(formData, "costPoints"),
    type: value(formData, "type"), stock: value(formData, "stock"),
    active: formData.get("active") === "on", sortOrder: value(formData, "sortOrder"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa el premio." };
  const admin = createAdminSupabaseClient();
  const row = {
    name: parsed.data.name, description: parsed.data.description, icon: parsed.data.icon,
    image_url: parsed.data.imageUrl, cost_points: parsed.data.costPoints, type: parsed.data.type,
    stock: parsed.data.stock, active: parsed.data.active, sort_order: parsed.data.sortOrder,
  };
  const result = parsed.data.id
    ? await admin.from("rewards").update(row).eq("id", parsed.data.id)
    : await admin.from("rewards").insert(row);
  if (result.error) return { status: "error", message: "No fue posible guardar el premio." };
  revalidateRewards();
  return { status: "success", message: parsed.data.id ? "Premio actualizado." : "Premio creado." };
}

export async function deleteReward(rewardId: string): Promise<RewardActionResult> {
  await requireParent();
  const parsed = redeemRewardSchema.shape.rewardId.safeParse(rewardId);
  if (!parsed.success) return { status: "error", message: "El premio no es válido." };
  const admin = createAdminSupabaseClient();
  const { count, error: countError } = await admin.from("redemptions").select("id", { count: "exact", head: true }).eq("reward_id", parsed.data);
  if (countError) return { status: "error", message: "No fue posible comprobar los canjes del premio." };
  if ((count ?? 0) > 0) return { status: "error", message: "Este premio ya tiene canjes. Desactívalo para conservar el historial." };
  const { error } = await admin.from("rewards").delete().eq("id", parsed.data);
  if (error) return { status: "error", message: "No fue posible eliminar el premio." };
  revalidateRewards();
  return { status: "success", message: "Premio eliminado." };
}

export async function updateRedemption(input: { redemptionId: string; status: "DELIVERED" | "CANCELLED"; note?: string }): Promise<RewardActionResult> {
  const parent = await requireParent();
  const parsed = redemptionStatusSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "El cambio no es válido." };
  const admin = createAdminSupabaseClient();
  const { data: redemption, error: lookupError } = await admin.from("redemptions").select("id, child_id, points_spent, reward_name, status").eq("id", parsed.data.redemptionId).maybeSingle();
  if (lookupError || !redemption) return { status: "error", message: "El canje ya no está disponible." };
  if (redemption.status !== "PENDING") return { status: "error", message: "Este canje ya fue atendido." };
  const changedAt = new Date().toISOString();
  const refund: PointRow = {
    id: crypto.randomUUID(), child_id: redemption.child_id, amount: redemption.points_spent,
    reason: "ADJUSTMENT", reference_type: "REDEMPTION", reference_id: redemption.id,
    description: `Devolución por canje cancelado: ${redemption.reward_name}`, created_at: changedAt,
  };
  const { error } = await admin.rpc("redemption_update", { p: {
    redemption_id: redemption.id, status: parsed.data.status, changed_at: changedAt,
    note: parsed.data.note, changed_by: parent.id, refund,
  } as unknown as Json });
  if (error) return { status: "error", message: error.message.includes("REDEMPTION_NOT_PENDING") ? "Este canje ya fue atendido." : "No fue posible actualizar el canje." };
  revalidateRewards();
  return { status: "success", message: parsed.data.status === "DELIVERED" ? "Premio marcado como entregado." : "Canje cancelado y puntos devueltos." };
}
