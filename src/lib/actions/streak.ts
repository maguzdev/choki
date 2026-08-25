"use server";

import { revalidatePath } from "next/cache";

import { requireChildSelf } from "@/lib/auth/guards";
import { toLocalDate } from "@/lib/domain/dates";
import { replayStreak } from "@/lib/domain/streak";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export type StreakActionResult = { status: "success" | "error"; message?: string };

export async function ensureStreakUpToDate(childId: string, force = false): Promise<StreakActionResult> {
  const child = await requireChildSelf(childId);
  const admin = createAdminSupabaseClient();
  const [settingsResult, stateResult] = await Promise.all([
    admin.from("app_settings").select("timezone, protector_max").eq("id", 1).maybeSingle(),
    admin.from("child_streaks").select("last_evaluated_date").eq("child_id", child.id).maybeSingle(),
  ]);
  if (settingsResult.error || !settingsResult.data || stateResult.error) {
    return { status: "error", message: "No fue posible comprobar tu racha." };
  }
  const now = new Date();
  const createdAt = now.toISOString();
  const today = toLocalDate(now, settingsResult.data.timezone);
  if (!force && stateResult.data?.last_evaluated_date && stateResult.data.last_evaluated_date >= today) {
    return { status: "success" };
  }

  const [salesResult, grantsResult, previousDaysResult] = await Promise.all([
    admin.from("sales").select("local_date").eq("seller_id", child.id).eq("seller_type", "CHILD").eq("status", "COMPLETED").order("local_date"),
    admin.from("protector_events").select("local_date, quantity").eq("child_id", child.id).order("local_date"),
    admin.from("streak_days").select("local_date, status").eq("child_id", child.id),
  ]);
  if (salesResult.error || grantsResult.error || previousDaysResult.error) {
    return { status: "error", message: "No fue posible reconstruir tu racha." };
  }
  const counts = new Map<string, number>();
  for (const sale of salesResult.data ?? []) counts.set(sale.local_date, (counts.get(sale.local_date) ?? 0) + 1);
  const result = replayStreak({
    saleDays: [...counts].map(([date, count]) => ({ date, count })),
    protectorGrants: (grantsResult.data ?? []).map((grant) => ({ date: grant.local_date, quantity: grant.quantity })),
    today,
    maxProtectors: settingsResult.data.protector_max,
  });
  const previousProtected = new Set((previousDaysResult.data ?? []).filter((day) => day.status === "PROTECTED").map((day) => day.local_date));
  const notifications: NotificationRow[] = result.days
    .filter((day) => day.status === "PROTECTED" && !previousProtected.has(day.date))
    .map((day) => ({
      id: crypto.randomUUID(), profile_id: child.id, type: "PROTECTOR_USED",
      title: "Un protector cuidó tu racha", body: `Tu protector cubrió el ${day.date}.`, icon: "🛡️",
      reference_type: null, reference_id: null, read_at: null, created_at: createdAt,
    }));
  const payload = {
    streak: {
      child_id: child.id,
      days: result.days.map((day) => ({ child_id: child.id, local_date: day.date, status: day.status, sales_count: day.salesCount })),
      state: [{
        child_id: child.id, current_streak: result.currentStreak, best_streak: result.bestStreak,
        protectors_available: result.protectorsAvailable, last_activity_date: result.lastActivityDate,
        last_evaluated_date: today, updated_at: createdAt,
      }],
    },
    notifications,
  };
  const { error } = await admin.rpc("streak_refresh", { p: payload as unknown as Json });
  if (error) return { status: "error", message: "No fue posible actualizar tu racha." };
  for (const path of ["/", "/progreso", "/racha", "/premios", "/notificaciones"]) revalidatePath(path);
  return { status: "success" };
}
