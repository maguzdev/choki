import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

function requiredServerEnvironment(name: string) {
  const value = process.env[name];

  if (!value || value.startsWith("<")) {
    throw new Error(`Falta configurar la variable de servidor ${name}.`);
  }

  return value;
}

export function createAdminSupabaseClient() {
  return createClient<Database>(
    requiredServerEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredServerEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
