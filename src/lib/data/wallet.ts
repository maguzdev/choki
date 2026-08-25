import "server-only";

import { toLocalDate } from "@/lib/domain/dates";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type WalletBalances = {
  available: number;
  savings: number;
  inGoals: number;
  historicEarnings: number;
};

export type WalletSettings = {
  enabled: boolean;
  percent: number;
};

export type WalletMovement = {
  id: string;
  type: string;
  availableDelta: number;
  savingsDelta: number;
  goalDelta: number;
  earningAmount: number;
  description: string;
  createdAt: string;
  localDate: string;
  goalId: string | null;
};

export type WalletGoal = {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  targetAmount: number;
  targetDate: string | null;
  priority: number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  isPrimary: boolean;
  isDisplayedPrimary: boolean;
  savedAmount: number;
  percent: number;
  completedAt: string | null;
  createdAt: string;
};

export type ChildWalletData = {
  child: { id: string; name: string; avatarEmoji: string; color: string };
  today: string;
  balances: WalletBalances;
  settings: WalletSettings;
  earnings: { own: number; family: number };
  movements: WalletMovement[];
  goals: WalletGoal[];
};

function emptyBalances(): WalletBalances {
  return { available: 0, savings: 0, inGoals: 0, historicEarnings: 0 };
}

function mapGoals(
  goals: Array<{
    id: string;
    name: string;
    emoji: string;
    description: string | null;
    target_amount: number;
    target_date: string | null;
    priority: number;
    status: string;
    is_primary: boolean;
    completed_at: string | null;
    created_at: string;
  }>,
  progress: Array<{ goal_id: string | null; saved_amount: number | null; percent: number | null }>,
): WalletGoal[] {
  const progressById = new Map(progress.map((row) => [row.goal_id, row]));
  const visible = goals.filter((goal) => goal.status !== "ARCHIVED");
  const explicitPrimary = visible.find((goal) => goal.status === "ACTIVE" && goal.is_primary);
  const fallbackPrimary = explicitPrimary ?? visible
    .filter((goal) => goal.status === "ACTIVE")
    .sort((a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at))[0];

  return visible
    .sort((a, b) => {
      const statusOrder = { ACTIVE: 0, PAUSED: 1, COMPLETED: 2 } as Record<string, number>;
      return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
        || a.priority - b.priority
        || a.created_at.localeCompare(b.created_at);
    })
    .map((goal) => {
      const current = progressById.get(goal.id);
      return {
        id: goal.id,
        name: goal.name,
        emoji: goal.emoji,
        description: goal.description,
        targetAmount: goal.target_amount,
        targetDate: goal.target_date,
        priority: goal.priority,
        status: goal.status as WalletGoal["status"],
        isPrimary: goal.is_primary,
        isDisplayedPrimary: fallbackPrimary?.id === goal.id,
        savedAmount: current?.saved_amount ?? 0,
        percent: current?.percent ?? 0,
        completedAt: goal.completed_at,
        createdAt: goal.created_at,
      };
    });
}

export async function getChildWalletData(childId: string): Promise<ChildWalletData> {
  const supabase = await createServerSupabaseClient();
  const [profileResult, balanceResult, settingsResult, allocationsResult, movementsResult, goalsResult, progressResult, appSettingsResult] = await Promise.all([
    supabase.from("profiles").select("id, name, avatar_emoji, color").eq("id", childId).maybeSingle(),
    supabase.from("v_child_balances").select("available, savings, in_goals, historic_earnings").eq("child_id", childId).maybeSingle(),
    supabase.from("child_settings").select("auto_saving_enabled, saving_percent").eq("child_id", childId).maybeSingle(),
    supabase.from("earning_allocations").select("source, total_amount, reversed").eq("child_id", childId),
    supabase.from("money_movements").select("id, type, available_delta, savings_delta, goal_delta, earning_amount, description, created_at, local_date, goal_id").eq("child_id", childId).order("created_at", { ascending: false }),
    supabase.from("goals").select("id, name, emoji, description, target_amount, target_date, priority, status, is_primary, completed_at, created_at").eq("child_id", childId),
    supabase.from("v_goal_progress").select("goal_id, saved_amount, percent").eq("child_id", childId),
    supabase.from("app_settings").select("timezone").eq("id", 1).maybeSingle(),
  ]);
  const error = [profileResult, balanceResult, settingsResult, allocationsResult, movementsResult, goalsResult, progressResult, appSettingsResult].find((result) => result.error)?.error;
  if (error || !profileResult.data) throw new Error("No fue posible cargar la billetera.");

  const balance = balanceResult.data;
  const balances = balance ? {
    available: balance.available ?? 0,
    savings: balance.savings ?? 0,
    inGoals: balance.in_goals ?? 0,
    historicEarnings: balance.historic_earnings ?? 0,
  } : emptyBalances();
  const allocations = allocationsResult.data ?? [];

  return {
    child: {
      id: profileResult.data.id,
      name: profileResult.data.name,
      avatarEmoji: profileResult.data.avatar_emoji,
      color: profileResult.data.color,
    },
    today: toLocalDate(new Date(), appSettingsResult.data?.timezone ?? "America/Bogota"),
    balances,
    settings: {
      enabled: settingsResult.data?.auto_saving_enabled ?? false,
      percent: settingsResult.data?.saving_percent ?? 0,
    },
    earnings: {
      own: allocations.filter((row) => row.source === "OWN_SALE" && !row.reversed).reduce((sum, row) => sum + row.total_amount, 0),
      family: allocations.filter((row) => row.source === "FAMILY_SHARE" && !row.reversed).reduce((sum, row) => sum + row.total_amount, 0),
    },
    movements: (movementsResult.data ?? []).map((movement) => ({
      id: movement.id,
      type: movement.type,
      availableDelta: movement.available_delta,
      savingsDelta: movement.savings_delta,
      goalDelta: movement.goal_delta,
      earningAmount: movement.earning_amount,
      description: movement.description,
      createdAt: movement.created_at,
      localDate: movement.local_date,
      goalId: movement.goal_id,
    })),
    goals: mapGoals(goalsResult.data ?? [], progressResult.data ?? []),
  };
}

export async function getAdminWalletOverview(): Promise<ChildWalletData[]> {
  const supabase = await createServerSupabaseClient();
  const { data: children, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("type", "CHILD")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error("No fue posible cargar los perfiles infantiles.");
  return Promise.all((children ?? []).map((child) => getChildWalletData(child.id)));
}
