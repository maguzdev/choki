import "server-only";

import { levelFor } from "@/lib/domain/gamification";
import { toLocalDate } from "@/lib/domain/dates";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type LevelItem = {
  id: string; number: number; name: string; xpRequired: number; icon: string;
  description: string | null; benefit: string | null; active: boolean;
};

export type ScoreMovement = {
  id: string; kind: "XP" | "POINTS"; amount: number; reason: string;
  description: string; referenceId: string | null; createdAt: string; localDate: string;
};

export type ChildGamificationData = {
  child: { id: string; name: string; avatarEmoji: string; color: string };
  today: string;
  xp: number;
  points: number;
  levels: LevelItem[];
  level: ReturnType<typeof levelFor>;
  achievements: Array<{
    id: string; name: string; description: string | null; icon: string; targetValue: number;
    conditionType: string; xpReward: number; pointsReward: number; hidden: boolean; unlockedAt: string | null;
  }>;
  challenges: Array<{
    id: string; name: string; description: string | null; icon: string; startsOn: string; endsOn: string;
    targetValue: number; currentValue: number; xpReward: number; pointsReward: number; completed: boolean;
  }>;
  ranking: Array<{ id: string; name: string; avatarEmoji: string; color: string; xp: number }>;
  history: ScoreMovement[];
  streak: {
    current: number; best: number; protectors: number; protectorMax: number;
    lastActivityDate: string | null;
    days: Array<{ date: string; status: "SOLD" | "PROTECTED" | "MISSED"; salesCount: number }>;
  };
};

export type ChildRewardsData = {
  childId: string;
  today: string;
  points: number;
  protectors: number;
  protectorMax: number;
  rewards: Array<{
    id: string; name: string; description: string | null; icon: string; imageUrl: string | null;
    costPoints: number; type: "NORMAL" | "STREAK_PROTECTOR"; stock: number | null;
  }>;
  redemptions: Array<{
    id: string; rewardName: string; pointsSpent: number; status: "PENDING" | "DELIVERED" | "CANCELLED";
    redeemedAt: string; localDate: string; deliveredAt: string | null; note: string | null;
  }>;
};

export type AdminGamificationData = {
  today: string;
  rules: Array<{ id: string; event: "SALE_COMPLETED" | "UNIT_SOLD"; xpAmount: number; pointsAmount: number; active: boolean }>;
  levels: LevelItem[];
  achievements: Array<{
    id: string; code: string; name: string; description: string | null; icon: string; conditionType: string;
    targetValue: number; productId: string | null; xpReward: number; pointsReward: number;
    hidden: boolean; active: boolean; sortOrder: number;
  }>;
  challenges: Array<{
    id: string; name: string; description: string | null; icon: string; startsOn: string; endsOn: string;
    conditionType: string; targetValue: number; productId: string | null; xpReward: number;
    pointsReward: number; status: "DRAFT" | "ACTIVE" | "FINISHED";
  }>;
  products: Array<{ id: string; name: string; emoji: string }>;
  protectorMax: number;
};

export type AdminRewardsData = {
  today: string;
  rewards: Array<{
    id: string; name: string; description: string | null; icon: string; imageUrl: string | null;
    costPoints: number; type: "NORMAL" | "STREAK_PROTECTOR"; stock: number | null;
    active: boolean; sortOrder: number;
  }>;
  redemptions: Array<{
    id: string; childName: string; childEmoji: string; rewardName: string; pointsSpent: number;
    status: "PENDING" | "DELIVERED" | "CANCELLED"; redeemedAt: string; localDate: string; deliveredAt: string | null; note: string | null;
  }>;
};

export async function getChildGamificationData(childId: string): Promise<ChildGamificationData> {
  const supabase = await createServerSupabaseClient();
  const [profileResult, settingsResult, levelsResult, achievementsResult, unlocksResult, challengesResult,
    progressResult, xpResult, pointsResult, rankingResult, streakResult, daysResult] = await Promise.all([
    supabase.from("profiles").select("id, name, avatar_emoji, color").eq("id", childId).maybeSingle(),
    supabase.from("app_settings").select("timezone, protector_max").eq("id", 1).maybeSingle(),
    supabase.from("levels").select("id, number, name, xp_required, icon, description, benefit, active").eq("active", true).order("number"),
    supabase.from("achievements").select("id, name, description, icon, condition_type, target_value, xp_reward, points_reward, hidden, active, sort_order").eq("active", true).order("sort_order"),
    supabase.from("achievement_unlocks").select("achievement_id, unlocked_at").eq("child_id", childId),
    supabase.from("challenges").select("id, name, description, icon, starts_on, ends_on, target_value, xp_reward, points_reward, status").eq("status", "ACTIVE").order("ends_on"),
    supabase.from("challenge_progress").select("challenge_id, current_value, completed_at, rewarded").eq("child_id", childId),
    supabase.from("xp_movements").select("id, amount, reason, description, reference_id, created_at").eq("child_id", childId).order("created_at", { ascending: false }),
    supabase.from("point_movements").select("id, amount, reason, description, reference_id, created_at").eq("child_id", childId).order("created_at", { ascending: false }),
    supabase.from("v_xp_ranking").select("id, name, avatar_emoji, color, xp").order("xp", { ascending: false }),
    supabase.from("child_streaks").select("current_streak, best_streak, protectors_available, last_activity_date").eq("child_id", childId).maybeSingle(),
    supabase.from("streak_days").select("local_date, status, sales_count").eq("child_id", childId).order("local_date"),
  ]);
  const error = [profileResult, settingsResult, levelsResult, achievementsResult, unlocksResult, challengesResult,
    progressResult, xpResult, pointsResult, rankingResult, streakResult, daysResult].find((result) => result.error)?.error;
  if (error || !profileResult.data) throw new Error("No fue posible cargar tu progreso.");
  const timezone = settingsResult.data?.timezone ?? "America/Bogota";
  const today = toLocalDate(new Date(), timezone);
  const levels = (levelsResult.data ?? []).map((row) => ({
    id: row.id, number: row.number, name: row.name, xpRequired: row.xp_required, icon: row.icon,
    description: row.description, benefit: row.benefit, active: row.active,
  }));
  if (!levels.length) throw new Error("Configura al menos un nivel activo.");
  const xp = (xpResult.data ?? []).reduce((sum, movement) => sum + movement.amount, 0);
  const points = (pointsResult.data ?? []).reduce((sum, movement) => sum + movement.amount, 0);
  const unlockById = new Map((unlocksResult.data ?? []).map((unlock) => [unlock.achievement_id, unlock.unlocked_at]));
  const progressById = new Map((progressResult.data ?? []).map((progress) => [progress.challenge_id, progress]));
  const history: ScoreMovement[] = [
    ...(xpResult.data ?? []).map((movement) => ({ id: movement.id, kind: "XP" as const, amount: movement.amount, reason: movement.reason, description: movement.description, referenceId: movement.reference_id, createdAt: movement.created_at, localDate: toLocalDate(new Date(movement.created_at), timezone) })),
    ...(pointsResult.data ?? []).map((movement) => ({ id: movement.id, kind: "POINTS" as const, amount: movement.amount, reason: movement.reason, description: movement.description, referenceId: movement.reference_id, createdAt: movement.created_at, localDate: toLocalDate(new Date(movement.created_at), timezone) })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    child: { id: profileResult.data.id, name: profileResult.data.name, avatarEmoji: profileResult.data.avatar_emoji, color: profileResult.data.color },
    today, xp, points, levels, level: levelFor(xp, levels),
    achievements: (achievementsResult.data ?? []).map((row) => ({
      id: row.id, name: row.name, description: row.description, icon: row.icon, targetValue: row.target_value,
      conditionType: row.condition_type, xpReward: row.xp_reward, pointsReward: row.points_reward,
      hidden: row.hidden, unlockedAt: unlockById.get(row.id) ?? null,
    })),
    challenges: (challengesResult.data ?? []).filter((row) => row.starts_on <= today && row.ends_on >= today).map((row) => {
      const progress = progressById.get(row.id);
      return { id: row.id, name: row.name, description: row.description, icon: row.icon, startsOn: row.starts_on,
        endsOn: row.ends_on, targetValue: row.target_value, currentValue: progress?.current_value ?? 0,
        xpReward: row.xp_reward, pointsReward: row.points_reward, completed: Boolean(progress?.completed_at) };
    }),
    ranking: (rankingResult.data ?? []).flatMap((row) => row.id && row.name ? [{
      id: row.id, name: row.name, avatarEmoji: row.avatar_emoji ?? "🙂", color: row.color ?? "#D98C3F", xp: row.xp ?? 0,
    }] : []),
    history,
    streak: {
      current: streakResult.data?.current_streak ?? 0,
      best: streakResult.data?.best_streak ?? 0,
      protectors: streakResult.data?.protectors_available ?? 0,
      protectorMax: settingsResult.data?.protector_max ?? 3,
      lastActivityDate: streakResult.data?.last_activity_date ?? null,
      days: (daysResult.data ?? []).map((day) => ({ date: day.local_date, status: day.status as "SOLD" | "PROTECTED" | "MISSED", salesCount: day.sales_count })),
    },
  };
}

export async function getChildRewardsData(childId: string): Promise<ChildRewardsData> {
  const supabase = await createServerSupabaseClient();
  const [pointsResult, rewardsResult, redemptionsResult, streakResult, settingsResult] = await Promise.all([
    supabase.from("point_movements").select("amount").eq("child_id", childId),
    supabase.from("rewards").select("id, name, description, icon, image_url, cost_points, type, stock, active, sort_order").eq("active", true).order("sort_order"),
    supabase.from("redemptions").select("id, reward_name, points_spent, status, redeemed_at, delivered_at, note").eq("child_id", childId).order("redeemed_at", { ascending: false }),
    supabase.from("child_streaks").select("protectors_available").eq("child_id", childId).maybeSingle(),
    supabase.from("app_settings").select("protector_max, timezone").eq("id", 1).maybeSingle(),
  ]);
  const error = [pointsResult, rewardsResult, redemptionsResult, streakResult, settingsResult].find((result) => result.error)?.error;
  if (error) throw new Error("No fue posible cargar los premios.");
  const timezone = settingsResult.data?.timezone ?? "America/Bogota";
  return {
    childId,
    today: toLocalDate(new Date(), timezone),
    points: (pointsResult.data ?? []).reduce((sum, row) => sum + row.amount, 0),
    protectors: streakResult.data?.protectors_available ?? 0,
    protectorMax: settingsResult.data?.protector_max ?? 3,
    rewards: (rewardsResult.data ?? []).map((row) => ({
      id: row.id, name: row.name, description: row.description, icon: row.icon, imageUrl: row.image_url,
      costPoints: row.cost_points, type: row.type as "NORMAL" | "STREAK_PROTECTOR", stock: row.stock,
    })),
    redemptions: (redemptionsResult.data ?? []).map((row) => ({
      id: row.id, rewardName: row.reward_name, pointsSpent: row.points_spent,
      status: row.status as "PENDING" | "DELIVERED" | "CANCELLED", redeemedAt: row.redeemed_at,
      localDate: toLocalDate(new Date(row.redeemed_at), timezone),
      deliveredAt: row.delivered_at, note: row.note,
    })),
  };
}

export async function getAdminGamificationData(): Promise<AdminGamificationData> {
  const supabase = await createServerSupabaseClient();
  const [rulesResult, levelsResult, achievementsResult, challengesResult, productsResult, settingsResult] = await Promise.all([
    supabase.from("gamification_rules").select("id, event, xp_amount, points_amount, active").order("event"),
    supabase.from("levels").select("id, number, name, xp_required, icon, description, benefit, active").order("number"),
    supabase.from("achievements").select("id, code, name, description, icon, condition_type, target_value, product_id, xp_reward, points_reward, hidden, active, sort_order").order("sort_order"),
    supabase.from("challenges").select("id, name, description, icon, starts_on, ends_on, condition_type, target_value, product_id, xp_reward, points_reward, status").order("starts_on", { ascending: false }),
    supabase.from("products").select("id, name, emoji").eq("active", true).order("sort_order"),
    supabase.from("app_settings").select("protector_max, timezone").eq("id", 1).maybeSingle(),
  ]);
  const error = [rulesResult, levelsResult, achievementsResult, challengesResult, productsResult, settingsResult].find((result) => result.error)?.error;
  if (error) throw new Error("No fue posible cargar la configuración de gamificación.");
  return {
    today: toLocalDate(new Date(), settingsResult.data?.timezone ?? "America/Bogota"),
    rules: (rulesResult.data ?? []).map((row) => ({ id: row.id, event: row.event as "SALE_COMPLETED" | "UNIT_SOLD", xpAmount: row.xp_amount, pointsAmount: row.points_amount, active: row.active })),
    levels: (levelsResult.data ?? []).map((row) => ({ id: row.id, number: row.number, name: row.name, xpRequired: row.xp_required, icon: row.icon, description: row.description, benefit: row.benefit, active: row.active })),
    achievements: (achievementsResult.data ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name, description: row.description, icon: row.icon, conditionType: row.condition_type, targetValue: row.target_value, productId: row.product_id, xpReward: row.xp_reward, pointsReward: row.points_reward, hidden: row.hidden, active: row.active, sortOrder: row.sort_order })),
    challenges: (challengesResult.data ?? []).map((row) => ({ id: row.id, name: row.name, description: row.description, icon: row.icon, startsOn: row.starts_on, endsOn: row.ends_on, conditionType: row.condition_type, targetValue: row.target_value, productId: row.product_id, xpReward: row.xp_reward, pointsReward: row.points_reward, status: row.status as "DRAFT" | "ACTIVE" | "FINISHED" })),
    products: productsResult.data ?? [],
    protectorMax: settingsResult.data?.protector_max ?? 3,
  };
}

export async function getAdminRewardsData(): Promise<AdminRewardsData> {
  const supabase = await createServerSupabaseClient();
  const [rewardsResult, redemptionsResult, settingsResult] = await Promise.all([
    supabase.from("rewards").select("id, name, description, icon, image_url, cost_points, type, stock, active, sort_order").order("sort_order"),
    supabase.from("redemptions").select("id, child_id, reward_name, points_spent, status, redeemed_at, delivered_at, note").order("redeemed_at", { ascending: false }),
    supabase.from("app_settings").select("timezone").eq("id", 1).maybeSingle(),
  ]);
  if (rewardsResult.error || redemptionsResult.error || settingsResult.error) throw new Error("No fue posible cargar recompensas y canjes.");
  const childIds = [...new Set((redemptionsResult.data ?? []).map((row) => row.child_id))];
  const { data: profiles, error: profileError } = childIds.length
    ? await supabase.from("profiles").select("id, name, avatar_emoji").in("id", childIds)
    : { data: [] as Array<{ id: string; name: string; avatar_emoji: string }>, error: null };
  if (profileError) throw new Error("No fue posible cargar los perfiles de los canjes.");
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const timezone = settingsResult.data?.timezone ?? "America/Bogota";
  return {
    today: toLocalDate(new Date(), timezone),
    rewards: (rewardsResult.data ?? []).map((row) => ({ id: row.id, name: row.name, description: row.description, icon: row.icon, imageUrl: row.image_url, costPoints: row.cost_points, type: row.type as "NORMAL" | "STREAK_PROTECTOR", stock: row.stock, active: row.active, sortOrder: row.sort_order })),
    redemptions: (redemptionsResult.data ?? []).map((row) => {
      const profile = profilesById.get(row.child_id);
      return { id: row.id, childName: profile?.name ?? "Niño", childEmoji: profile?.avatar_emoji ?? "🙂", rewardName: row.reward_name, pointsSpent: row.points_spent, status: row.status as "PENDING" | "DELIVERED" | "CANCELLED", redeemedAt: row.redeemed_at, localDate: toLocalDate(new Date(row.redeemed_at), timezone), deliveredAt: row.delivered_at, note: row.note };
    }),
  };
}
