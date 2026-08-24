import "server-only";

import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/session";

export async function requireChild() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.type !== "CHILD") redirect("/admin");

  return profile;
}

export async function requireParent() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.type !== "PARENT") redirect("/");

  return profile;
}

export async function requireChildSelf(childId: string) {
  const profile = await requireChild();

  if (profile.id !== childId) {
    throw new Error("FORBIDDEN_CHILD_PROFILE");
  }

  return profile;
}
