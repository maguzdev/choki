import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

function requiredServerEnvironment(primary: string, legacy?: string) {
  const value = process.env[primary] ?? (legacy ? process.env[legacy] : undefined);

  if (!value || value.startsWith("<")) {
    throw new Error(`Falta configurar la variable de servidor ${primary}.`);
  }

  return value;
}

export function createAdminSupabaseClient() {
  return createClient<Database>(
    requiredServerEnvironment("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    requiredServerEnvironment("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
