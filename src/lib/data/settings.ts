import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ManagedProfile = {
  id: string;
  name: string;
  type: "CHILD" | "PARENT";
  email: string;
  avatarEmoji: string;
  color: string;
  active: boolean;
  sortOrder: number;
};

export type AdminSettingsData = {
  settings: {
    familyName: string;
    timezone: string;
    currency: string;
    protectorMax: number;
    lowStockAlerts: boolean;
    celebrations: boolean;
  };
  children: Array<ManagedProfile & { percent: number }>;
};

export async function getAdminSettingsData(): Promise<AdminSettingsData> {
  const supabase = await createServerSupabaseClient();
  const [settingsResult, profilesResult, splitsResult] = await Promise.all([
    supabase.from("app_settings").select("family_name, timezone, currency, protector_max, low_stock_alerts, celebrations").eq("id", 1).maybeSingle(),
    supabase.from("profiles").select("id, name, type, auth_email, avatar_emoji, color, active, sort_order").eq("type", "CHILD").order("sort_order"),
    supabase.from("profit_split_rules").select("child_id, percent"),
  ]);
  if (settingsResult.error || !settingsResult.data || profilesResult.error || splitsResult.error) {
    throw new Error("No fue posible cargar la configuración familiar.");
  }
  const percentByChild = new Map((splitsResult.data ?? []).map((rule) => [rule.child_id, Number(rule.percent)]));
  return {
    settings: {
      familyName: settingsResult.data.family_name,
      timezone: settingsResult.data.timezone,
      currency: settingsResult.data.currency,
      protectorMax: settingsResult.data.protector_max,
      lowStockAlerts: settingsResult.data.low_stock_alerts,
      celebrations: settingsResult.data.celebrations,
    },
    children: (profilesResult.data ?? []).map((profile) => ({
      id: profile.id,
      name: profile.name,
      type: "CHILD" as const,
      email: profile.auth_email,
      avatarEmoji: profile.avatar_emoji,
      color: profile.color,
      active: profile.active,
      sortOrder: profile.sort_order,
      percent: percentByChild.get(profile.id) ?? 0,
    })),
  };
}

export async function getAdminProfilesData(): Promise<ManagedProfile[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, type, auth_email, avatar_emoji, color, active, sort_order")
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error("No fue posible cargar los perfiles.");
  return (data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.name,
    type: profile.type as "CHILD" | "PARENT",
    email: profile.auth_email,
    avatarEmoji: profile.avatar_emoji,
    color: profile.color,
    active: profile.active,
    sortOrder: profile.sort_order,
  }));
}
