import { createHmac } from "node:crypto";

import nextEnv from "@next/env";
import { createClient, type User } from "@supabase/supabase-js";

import { toLocalDate, weekDays } from "../src/lib/domain/dates";
import type { Database } from "../src/types/database";

const useProductionEnvironment = process.argv.includes("--production");
nextEnv.loadEnvConfig(process.cwd(), !useProductionEnvironment);

type SeedProfile = {
  name: string;
  type: "CHILD" | "PARENT";
  email: string;
  credential: string;
  avatarEmoji: string;
  color: string;
  sortOrder: number;
  savingPercent?: number;
};

const PROFILES: readonly SeedProfile[] = [
  {
    name: "Manuel",
    type: "PARENT",
    email: "manuel@choki.local",
    credential: "choki1234",
    avatarEmoji: "👨",
    color: "#3B241C",
    sortOrder: 1,
  },
  {
    name: "Mamá",
    type: "PARENT",
    email: "mama@choki.local",
    credential: "choki1234",
    avatarEmoji: "👩",
    color: "#68402D",
    sortOrder: 2,
  },
  {
    name: "Niño A",
    type: "CHILD",
    email: "nino-a@choki.local",
    credential: "1234",
    avatarEmoji: "🧒",
    color: "#D98C3F",
    sortOrder: 3,
    savingPercent: 10,
  },
  {
    name: "Niño B",
    type: "CHILD",
    email: "nino-b@choki.local",
    credential: "5678",
    avatarEmoji: "👦",
    color: "#17A398",
    sortOrder: 4,
    savingPercent: 0,
  },
];

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value || value.startsWith("<")) throw new Error(`Falta configurar ${name}.`);
  return value;
}

function childPassword(profileId: string, pin: string, pepper: string) {
  return createHmac("sha256", pepper).update(`${profileId}:${pin}`).digest("hex");
}

function authPassword(profile: SeedProfile, userId: string, pepper: string) {
  return profile.type === "CHILD"
    ? childPassword(userId, profile.credential, pepper)
    : profile.credential;
}

async function main() {
  const supabase = createClient<Database>(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const pepper = requiredEnvironment("CHILD_PIN_PEPPER");
  const reset = process.argv.includes("--reset");
  const accessOnly = process.argv.includes("--access-only");
  const { data: listedUsers, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) throw listError;
  let users = listedUsers.users;

  if (reset) {
    const seedEmails = new Set(PROFILES.map((profile) => profile.email));
    const seedUsers = users.filter((user) => user.email && seedEmails.has(user.email));
    for (const user of seedUsers) {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;
    }
    users = users.filter((user) => !seedUsers.some((seedUser) => seedUser.id === user.id));
  }

  const createdProfiles: Array<{ definition: SeedProfile; user: User }> = [];

  for (const definition of PROFILES) {
    let user = users.find((candidate) => candidate.email === definition.email);

    if (!user) {
      const temporaryPassword =
        definition.type === "CHILD"
          ? createHmac("sha256", pepper).update(`bootstrap:${definition.email}`).digest("hex")
          : definition.credential;
      const { data, error } = await supabase.auth.admin.createUser({
        email: definition.email,
        password: temporaryPassword,
        email_confirm: true,
      });
      if (error) throw error;
      user = data.user;
    }

    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(user.id, {
      password: authPassword(definition, user.id, pepper),
      email_confirm: true,
    });
    if (updateAuthError) throw updateAuthError;

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      name: definition.name,
      type: definition.type,
      auth_email: definition.email,
      avatar_emoji: definition.avatarEmoji,
      color: definition.color,
      active: true,
      sort_order: definition.sortOrder,
      pin_failed_attempts: 0,
      pin_locked_until: null,
    });
    if (profileError) throw profileError;

    createdProfiles.push({ definition, user });
  }

  for (const { definition, user } of createdProfiles) {
    if (definition.type !== "CHILD") continue;

    const savingPercent = definition.savingPercent ?? 0;
    const [{ error: settingsError }, { error: splitError }, { error: streakError }] =
      await Promise.all([
        supabase.from("child_settings").upsert({
          child_id: user.id,
          auto_saving_enabled: savingPercent > 0,
          saving_percent: savingPercent,
        }),
        supabase.from("profit_split_rules").upsert({ child_id: user.id, percent: 50 }),
        supabase.from("child_streaks").upsert({
          child_id: user.id,
          current_streak: 0,
          best_streak: 0,
          protectors_available: 3,
          last_activity_date: null,
          last_evaluated_date: null,
        }, { onConflict: "child_id", ignoreDuplicates: true }),
      ]);

    if (settingsError) throw settingsError;
    if (splitError) throw splitError;
    if (streakError) throw streakError;
  }

  if (accessOnly) {
    console.log(`Acceso inicial listo: ${createdProfiles.length} perfiles y configuración técnica mínima.`);
    return;
  }

  const defaultGoals = new Map([
    ["Niño A", { name: "Audífonos", emoji: "🎧", targetAmount: 350_000 }],
    ["Niño B", { name: "Patineta", emoji: "🛹", targetAmount: 200_000 }],
  ]);
  for (const { definition, user } of createdProfiles) {
    if (definition.type !== "CHILD") continue;
    const goal = defaultGoals.get(definition.name);
    if (!goal) continue;
    const { data: existingGoal, error: goalLookupError } = await supabase
      .from("goals")
      .select("id")
      .eq("child_id", user.id)
      .eq("name", goal.name)
      .limit(1)
      .maybeSingle();
    if (goalLookupError) throw goalLookupError;
    if (!existingGoal) {
      const { error: goalError } = await supabase.from("goals").insert({
        child_id: user.id,
        name: goal.name,
        emoji: goal.emoji,
        description: "Meta de ejemplo para probar el ahorro.",
        target_amount: goal.targetAmount,
        target_date: null,
        priority: 1,
        status: "ACTIVE",
        is_primary: true,
        completed_at: null,
      });
      if (goalError) throw goalError;
    }
  }

  const [{ error: rulesError }, { error: levelsError }, { error: achievementsError }] = await Promise.all([
    supabase.from("gamification_rules").upsert([
      { event: "SALE_COMPLETED", xp_amount: 10, points_amount: 5, active: true },
      { event: "UNIT_SOLD", xp_amount: 2, points_amount: 1, active: true },
    ], { onConflict: "event" }),
    supabase.from("levels").upsert([
      { number: 1, name: "Aprendiz", xp_required: 0, icon: "🐣", description: "Aquí comienza tu aventura.", benefit: null, active: true },
      { number: 2, name: "Vendedor", xp_required: 100, icon: "🚀", description: "Ya dominas tus primeras ventas.", benefit: null, active: true },
      { number: 3, name: "Experto", xp_required: 300, icon: "🏆", description: "Eres un gran vendedor.", benefit: null, active: true },
    ], { onConflict: "number" }),
    supabase.from("achievements").upsert([
      { code: "FIRST_SALE", name: "Primera venta", description: "Registra tu primera venta.", icon: "🥇", condition_type: "TOTAL_SALES", target_value: 1, product_id: null, xp_reward: 20, points_reward: 10, hidden: false, active: true, sort_order: 1 },
      { code: "TEN_UNITS", name: "10 productos", description: "Vende 10 productos.", icon: "📦", condition_type: "TOTAL_UNITS", target_value: 10, product_id: null, xp_reward: 30, points_reward: 15, hidden: false, active: true, sort_order: 2 },
      { code: "STREAK_3", name: "3 días seguidos", description: "Vende durante 3 días consecutivos.", icon: "🔥", condition_type: "STREAK_DAYS", target_value: 3, product_id: null, xp_reward: 50, points_reward: 25, hidden: false, active: true, sort_order: 3 },
    ], { onConflict: "code" }),
  ]);
  if (rulesError) throw rulesError;
  if (levelsError) throw levelsError;
  if (achievementsError) throw achievementsError;

  const today = toLocalDate(new Date(), "America/Bogota");
  const currentWeek = weekDays(today);
  const challengeName = "Vender 10 unidades esta semana";
  const { data: existingChallenge, error: challengeLookupError } = await supabase
    .from("challenges")
    .select("id")
    .eq("name", challengeName)
    .limit(1)
    .maybeSingle();
  if (challengeLookupError) throw challengeLookupError;
  const challengeRow = {
    name: challengeName,
    description: "Suma 10 productos vendidos entre lunes y domingo.",
    icon: "🎯",
    starts_on: currentWeek[0]!,
    ends_on: currentWeek[6]!,
    condition_type: "UNITS_SOLD",
    target_value: 10,
    product_id: null,
    xp_reward: 50,
    points_reward: 25,
    status: "ACTIVE",
  };
  const { error: challengeError } = existingChallenge
    ? await supabase.from("challenges").update(challengeRow).eq("id", existingChallenge.id)
    : await supabase.from("challenges").insert(challengeRow);
  if (challengeError) throw challengeError;

  const rewardSeeds: Database["public"]["Tables"]["rewards"]["Insert"][] = [
    { name: "Protector de racha", description: "Repone uno de los 3 protectores gratuitos después de usarlo.", icon: "🛡️", image_url: null, cost_points: 100, type: "STREAK_PROTECTOR", stock: null, active: true, sort_order: 1 },
    { name: "30 min extra de pantalla", description: "Canjea tiempo adicional de pantalla con un adulto.", icon: "📺", image_url: null, cost_points: 200, type: "NORMAL", stock: null, active: true, sort_order: 2 },
  ];
  for (const reward of rewardSeeds) {
    const { data: existingReward, error: rewardLookupError } = await supabase
      .from("rewards").select("id").eq("name", reward.name).limit(1).maybeSingle();
    if (rewardLookupError) throw rewardLookupError;
    const { error: rewardError } = existingReward
      ? await supabase.from("rewards").update(reward).eq("id", existingReward.id)
      : await supabase.from("rewards").insert(reward);
    if (rewardError) throw rewardError;
  }

  console.log(`Semilla base lista: ${createdProfiles.length} perfiles y configuración de progreso.`);
  console.log("Padres: manuel@choki.local y mama@choki.local / choki1234");
  console.log("Niños: Niño A / 1234 y Niño B / 5678");
}

main().catch((error: unknown) => {
  console.error("No fue posible cargar la semilla base.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
