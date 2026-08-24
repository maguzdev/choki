import { createHmac } from "node:crypto";

import nextEnv from "@next/env";
import { createClient, type User } from "@supabase/supabase-js";

import type { Database } from "../src/types/database";

nextEnv.loadEnvConfig(process.cwd());

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
          protectors_available: 0,
          last_activity_date: null,
          last_evaluated_date: null,
        }),
      ]);

    if (settingsError) throw settingsError;
    if (splitError) throw splitError;
    if (streakError) throw streakError;
  }

  console.log(`Semilla de autenticación lista: ${createdProfiles.length} perfiles.`);
  console.log("Padres: manuel@choki.local y mama@choki.local / choki1234");
  console.log("Niños: Niño A / 1234 y Niño B / 5678");
}

main().catch((error: unknown) => {
  console.error("No fue posible cargar la semilla de autenticación.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
