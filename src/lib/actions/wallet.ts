"use server";

import { revalidatePath } from "next/cache";

import { requireChildSelf } from "@/lib/auth/guards";
import { toLocalDate } from "@/lib/domain/dates";
import { createSavingMovement, createWithdrawalMovement } from "@/lib/domain/savings";
import { savingMovementSchema, savingSettingsSchema, withdrawalSchema } from "@/lib/schemas/wallet";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type WalletActionState = { status: "idle" | "success" | "error"; message?: string };

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function revalidateWallet() {
  for (const path of ["/", "/dinero", "/metas", "/admin/perfiles"]) revalidatePath(path);
}

async function context(childId: string) {
  const admin = createAdminSupabaseClient();
  const [settingsResult, balanceResult] = await Promise.all([
    admin.from("app_settings").select("timezone").eq("id", 1).maybeSingle(),
    admin.from("v_child_balances").select("available, savings").eq("child_id", childId).maybeSingle(),
  ]);
  if (settingsResult.error || balanceResult.error) throw new Error("WALLET_CONTEXT_ERROR");
  const now = new Date();
  return {
    admin,
    createdAt: now.toISOString(),
    localDate: toLocalDate(now, settingsResult.data?.timezone ?? "America/Bogota"),
    available: balanceResult.data?.available ?? 0,
    savings: balanceResult.data?.savings ?? 0,
  };
}

function commitErrorMessage(message: string) {
  if (message.includes("INSUFFICIENT_AVAILABLE")) return "No tienes suficiente dinero disponible para realizar este movimiento.";
  if (message.includes("INSUFFICIENT_SAVINGS")) return "No tienes suficiente dinero en ahorro para realizar este movimiento.";
  return "No fue posible guardar el movimiento. Intenta de nuevo.";
}

export async function updateSavingSettings(
  _previousState: WalletActionState,
  formData: FormData,
): Promise<WalletActionState> {
  const parsed = savingSettingsSchema.safeParse({
    childId: value(formData, "childId"),
    enabled: formData.get("enabled") === "on",
    percent: value(formData, "percent"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  await requireChildSelf(parsed.data.childId);
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("child_settings").upsert({
    child_id: parsed.data.childId,
    auto_saving_enabled: parsed.data.enabled,
    saving_percent: parsed.data.percent,
    updated_at: new Date().toISOString(),
  });
  if (error) return { status: "error", message: "No fue posible actualizar el ahorro automático." };
  revalidateWallet();
  return {
    status: "success",
    message: parsed.data.enabled
      ? `Desde tu próxima ganancia se ahorrará ${parsed.data.percent} %.`
      : "El ahorro automático quedó desactivado para ganancias futuras.",
  };
}

export async function moveSavings(
  _previousState: WalletActionState,
  formData: FormData,
): Promise<WalletActionState> {
  const parsed = savingMovementSchema.safeParse({
    childId: value(formData, "childId"),
    direction: value(formData, "direction"),
    amount: value(formData, "amount"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const child = await requireChildSelf(parsed.data.childId);
  let current: Awaited<ReturnType<typeof context>>;
  try {
    current = await context(child.id);
  } catch {
    return { status: "error", message: "No fue posible comprobar tus saldos." };
  }
  let movement;
  try {
    movement = createSavingMovement({
      idFactory: () => crypto.randomUUID(),
      childId: child.id,
      createdBy: child.id,
      createdAt: current.createdAt,
      localDate: current.localDate,
      description: parsed.data.direction === "IN" ? "Moví dinero a ahorro" : "Saqué dinero del ahorro",
      direction: parsed.data.direction,
      amount: parsed.data.amount,
      sourceBalance: parsed.data.direction === "IN" ? current.available : current.savings,
    });
  } catch {
    return { status: "error", message: parsed.data.direction === "IN" ? "No tienes suficiente dinero disponible." : "No tienes suficiente dinero ahorrado." };
  }
  const { error } = await current.admin.rpc("wallet_commit", { p: { movement, notifications: [] } as unknown as Json });
  if (error) return { status: "error", message: commitErrorMessage(error.message) };
  revalidateWallet();
  return { status: "success", message: parsed.data.direction === "IN" ? "Dinero movido a ahorro." : "Dinero devuelto a disponible." };
}

export async function registerWithdrawal(
  _previousState: WalletActionState,
  formData: FormData,
): Promise<WalletActionState> {
  const parsed = withdrawalSchema.safeParse({
    childId: value(formData, "childId"),
    amount: value(formData, "amount"),
    description: value(formData, "description"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const child = await requireChildSelf(parsed.data.childId);
  let current: Awaited<ReturnType<typeof context>>;
  try {
    current = await context(child.id);
  } catch {
    return { status: "error", message: "No fue posible comprobar tu saldo disponible." };
  }
  let movement;
  try {
    movement = createWithdrawalMovement({
      idFactory: () => crypto.randomUUID(),
      childId: child.id,
      createdBy: child.id,
      createdAt: current.createdAt,
      localDate: current.localDate,
      description: parsed.data.description,
      amount: parsed.data.amount,
      availableBalance: current.available,
    });
  } catch {
    return { status: "error", message: "No puedes usar más dinero del que tienes disponible." };
  }
  const { error } = await current.admin.rpc("wallet_commit", { p: { movement, notifications: [] } as unknown as Json });
  if (error) return { status: "error", message: commitErrorMessage(error.message) };
  revalidateWallet();
  return { status: "success", message: "Uso de dinero registrado en tu extracto." };
}
