import "server-only";

import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const getSession = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSession();
  if (!user) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error("No fue posible cargar el perfil actual.");
  }

  return data;
});
