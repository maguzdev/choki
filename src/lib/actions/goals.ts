"use server";

import { revalidatePath } from "next/cache";

import { requireChildSelf } from "@/lib/auth/guards";
import { toLocalDate } from "@/lib/domain/dates";
import { createGoalContributionMovement, createGoalExitMovement } from "@/lib/domain/savings";
import { goalContributionSchema, goalExitSchema, goalSchema, goalStatusSchema } from "@/lib/schemas/wallet";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type GoalActionState = { status: "idle" | "success" | "error"; message?: string; celebrate?: boolean };

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function revalidateGoals() {
  for (const path of ["/", "/dinero", "/metas", "/admin/perfiles"]) revalidatePath(path);
}

async function goalContext(childId: string, goalId: string) {
  const admin = createAdminSupabaseClient();
  const [goalResult, progressResult, balanceResult, settingsResult, notificationsResult] = await Promise.all([
    admin.from("goals").select("id, child_id, name, target_amount, status, is_primary").eq("id", goalId).eq("child_id", childId).maybeSingle(),
    admin.from("v_goal_progress").select("saved_amount").eq("goal_id", goalId).maybeSingle(),
    admin.from("v_child_balances").select("available, savings").eq("child_id", childId).maybeSingle(),
    admin.from("app_settings").select("timezone, celebrations").eq("id", 1).maybeSingle(),
    admin.from("notifications").select("type").eq("profile_id", childId).eq("reference_type", "GOAL").eq("reference_id", goalId),
  ]);
  const error = [goalResult, progressResult, balanceResult, settingsResult, notificationsResult].find((result) => result.error)?.error;
  if (error || !goalResult.data) throw new Error("GOAL_CONTEXT_ERROR");
  const now = new Date();
  return {
    admin,
    goal: goalResult.data,
    savedAmount: progressResult.data?.saved_amount ?? 0,
    available: balanceResult.data?.available ?? 0,
    savings: balanceResult.data?.savings ?? 0,
    createdAt: now.toISOString(),
    localDate: toLocalDate(now, settingsResult.data?.timezone ?? "America/Bogota"),
    celebrations: settingsResult.data?.celebrations ?? true,
    notificationTypes: new Set((notificationsResult.data ?? []).map((row) => row.type)),
  };
}

function notification(input: {
  childId: string;
  type: "GOAL_NEAR" | "GOAL_COMPLETED";
  title: string;
  body: string;
  goalId: string;
  createdAt: string;
}): NotificationRow {
  return {
    id: crypto.randomUUID(), profile_id: input.childId, type: input.type,
    title: input.title, body: input.body,
    icon: input.type === "GOAL_COMPLETED" ? "🎉" : "🎯",
    reference_type: "GOAL", reference_id: input.goalId,
    read_at: null, created_at: input.createdAt,
  };
}

function commitError(message: string) {
  if (message.includes("INSUFFICIENT_AVAILABLE")) return "No tienes suficiente dinero disponible.";
  if (message.includes("INSUFFICIENT_SAVINGS")) return "No tienes suficiente dinero ahorrado.";
  if (message.includes("INSUFFICIENT_GOAL_BALANCE")) return "La meta ya no tiene ese dinero disponible.";
  return "No fue posible guardar el cambio de la meta. Intenta de nuevo.";
}

export async function saveGoal(
  _previousState: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  const parsed = goalSchema.safeParse({
    id: value(formData, "id") || undefined,
    childId: value(formData, "childId"),
    name: value(formData, "name"),
    emoji: value(formData, "emoji"),
    description: value(formData, "description"),
    targetAmount: value(formData, "targetAmount"),
    targetDate: value(formData, "targetDate"),
    priority: value(formData, "priority"),
    isPrimary: formData.get("isPrimary") === "on",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const child = await requireChildSelf(parsed.data.childId);
  const admin = createAdminSupabaseClient();
  let existing: { id: string; status: string } | null = null;
  if (parsed.data.id) {
    const { data, error } = await admin.from("goals").select("id, status").eq("id", parsed.data.id).eq("child_id", child.id).maybeSingle();
    if (error || !data) return { status: "error", message: "La meta ya no está disponible." };
    if (!["ACTIVE", "PAUSED"].includes(data.status)) return { status: "error", message: "Una meta completada o archivada ya no se puede editar." };
    existing = data;
    const { data: progress } = await admin.from("v_goal_progress").select("saved_amount").eq("goal_id", data.id).maybeSingle();
    if ((progress?.saved_amount ?? 0) >= parsed.data.targetAmount) {
      return { status: "error", message: "El objetivo debe ser mayor que lo que ya tienes guardado. También puedes marcar la meta como cumplida." };
    }
  }

  if (parsed.data.isPrimary) {
    const { error } = await admin.from("goals").update({ is_primary: false, updated_at: new Date().toISOString() }).eq("child_id", child.id).eq("is_primary", true);
    if (error) return { status: "error", message: "No fue posible cambiar la meta principal." };
  }
  const row = {
    child_id: child.id,
    name: parsed.data.name,
    emoji: parsed.data.emoji,
    description: parsed.data.description,
    target_amount: parsed.data.targetAmount,
    target_date: parsed.data.targetDate,
    priority: parsed.data.priority,
    is_primary: parsed.data.isPrimary && (existing?.status ?? "ACTIVE") === "ACTIVE",
    updated_at: new Date().toISOString(),
  };
  const result = existing
    ? await admin.from("goals").update(row).eq("id", existing.id).eq("child_id", child.id)
    : await admin.from("goals").insert({ ...row, status: "ACTIVE", completed_at: null });
  if (result.error) return { status: "error", message: "No fue posible guardar la meta." };
  revalidateGoals();
  return { status: "success", message: existing ? "Meta actualizada." : "Meta creada. ¡Ahora a llenarla poco a poco!" };
}

export async function contributeToGoal(
  _previousState: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  const parsed = goalContributionSchema.safeParse({
    childId: value(formData, "childId"), goalId: value(formData, "goalId"),
    amount: value(formData, "amount"), source: value(formData, "source"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const child = await requireChildSelf(parsed.data.childId);
  let current: Awaited<ReturnType<typeof goalContext>>;
  try { current = await goalContext(child.id, parsed.data.goalId); }
  catch { return { status: "error", message: "No fue posible comprobar la meta y tus saldos." }; }
  if (current.goal.status !== "ACTIVE") return { status: "error", message: "Solo puedes aportar a una meta activa." };
  let movement;
  try {
    movement = createGoalContributionMovement({
      idFactory: () => crypto.randomUUID(), childId: child.id, createdBy: child.id,
      createdAt: current.createdAt, localDate: current.localDate,
      description: `Aporte a ${current.goal.name}`, goalId: current.goal.id,
      amount: parsed.data.amount, source: parsed.data.source,
      sourceBalance: parsed.data.source === "AVAILABLE" ? current.available : current.savings,
    });
  } catch {
    return { status: "error", message: parsed.data.source === "AVAILABLE" ? "No tienes suficiente dinero disponible." : "No tienes suficiente dinero ahorrado." };
  }
  const savedAfter = current.savedAmount + parsed.data.amount;
  const completed = savedAfter >= current.goal.target_amount;
  const near = !completed && savedAfter * 100 >= current.goal.target_amount * 80;
  const notifications: NotificationRow[] = [];
  if (completed && !current.notificationTypes.has("GOAL_COMPLETED")) {
    notifications.push(notification({ childId: child.id, type: "GOAL_COMPLETED", title: `¡Completaste ${current.goal.name}!`, body: "Tu meta alcanzó el valor que necesitabas.", goalId: current.goal.id, createdAt: current.createdAt }));
  } else if (near && !current.notificationTypes.has("GOAL_NEAR")) {
    notifications.push(notification({ childId: child.id, type: "GOAL_NEAR", title: `¡Ya casi completas ${current.goal.name}!`, body: "Superaste el 80 % de tu objetivo.", goalId: current.goal.id, createdAt: current.createdAt }));
  }
  const payload = {
    movement, notifications,
    ...(completed ? { goal_update: { id: current.goal.id, child_id: child.id, status: "COMPLETED", completed_at: current.createdAt, is_primary: false } } : {}),
  } satisfies Json;
  const { error } = await current.admin.rpc("wallet_commit", { p: payload });
  if (error) return { status: "error", message: commitError(error.message) };
  revalidateGoals();
  return { status: "success", message: completed ? "¡Meta completada!" : "Aporte guardado en tu meta.", celebrate: completed && current.celebrations };
}

export async function exitGoalMoney(
  _previousState: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  const parsed = goalExitSchema.safeParse({
    childId: value(formData, "childId"), goalId: value(formData, "goalId"),
    amount: value(formData, "amount") || undefined, action: value(formData, "action"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const child = await requireChildSelf(parsed.data.childId);
  let current: Awaited<ReturnType<typeof goalContext>>;
  try { current = await goalContext(child.id, parsed.data.goalId); }
  catch { return { status: "error", message: "No fue posible comprobar el dinero de la meta." }; }
  if (current.goal.status === "ARCHIVED") return { status: "error", message: "La meta está archivada." };
  if (parsed.data.action === "SPEND" && current.goal.status !== "COMPLETED") {
    return { status: "error", message: "Marca la meta como cumplida antes de registrar la compra." };
  }
  const amount = parsed.data.action === "SPEND" ? current.savedAmount : parsed.data.amount;
  if (!amount) return { status: "error", message: "Indica cuánto dinero quieres sacar." };
  let movement;
  try {
    movement = createGoalExitMovement({
      idFactory: () => crypto.randomUUID(), childId: child.id, createdBy: child.id,
      createdAt: current.createdAt, localDate: current.localDate,
      description: parsed.data.action === "SPEND" ? `Compré: ${current.goal.name}` : `Saqué dinero de ${current.goal.name}`,
      goalId: current.goal.id, action: parsed.data.action,
      amount, goalBalance: current.savedAmount,
    });
  } catch { return { status: "error", message: "No puedes sacar más dinero del que tiene la meta." }; }
  const { error } = await current.admin.rpc("wallet_commit", { p: { movement, notifications: [] } as unknown as Json });
  if (error) return { status: "error", message: commitError(error.message) };
  revalidateGoals();
  return { status: "success", message: parsed.data.action === "SPEND" ? "Compra registrada; el dinero salió de la meta." : "Dinero retirado de la meta." };
}

export async function changeGoalStatus(input: {
  childId: string;
  goalId: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
}): Promise<GoalActionState> {
  const parsed = goalStatusSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const child = await requireChildSelf(parsed.data.childId);
  let current: Awaited<ReturnType<typeof goalContext>>;
  try { current = await goalContext(child.id, parsed.data.goalId); }
  catch { return { status: "error", message: "La meta ya no está disponible." }; }
  const allowed = (current.goal.status === "ACTIVE" && ["PAUSED", "COMPLETED", "ARCHIVED"].includes(parsed.data.status))
    || (current.goal.status === "PAUSED" && ["ACTIVE", "ARCHIVED"].includes(parsed.data.status))
    || (current.goal.status === "COMPLETED" && parsed.data.status === "ARCHIVED");
  if (!allowed) return { status: "error", message: "Ese cambio de estado no está permitido para la meta." };
  if (parsed.data.status === "ARCHIVED" && current.savedAmount > 0) {
    return { status: "error", message: "Antes de archivar, saca el dinero de la meta o registra que ya la compraste." };
  }
  if (parsed.data.status === "COMPLETED") {
    const notifications = current.notificationTypes.has("GOAL_COMPLETED") ? [] : [notification({
      childId: child.id, type: "GOAL_COMPLETED", title: `¡Completaste ${current.goal.name}!`,
      body: "Marcaste esta meta como cumplida.", goalId: current.goal.id, createdAt: current.createdAt,
    })];
    const { error } = await current.admin.rpc("wallet_commit", { p: {
      goal_update: { id: current.goal.id, child_id: child.id, status: "COMPLETED", completed_at: current.createdAt, is_primary: false },
      notifications,
    } as unknown as Json });
    if (error) return { status: "error", message: commitError(error.message) };
    revalidateGoals();
    return { status: "success", message: "Meta marcada como cumplida.", celebrate: current.celebrations };
  }
  const { error } = await current.admin.from("goals").update({
    status: parsed.data.status,
    is_primary: parsed.data.status === "ACTIVE" ? current.goal.is_primary : false,
    updated_at: current.createdAt,
  }).eq("id", current.goal.id).eq("child_id", child.id);
  if (error) return { status: "error", message: "No fue posible actualizar el estado de la meta." };
  revalidateGoals();
  return { status: "success", message: parsed.data.status === "ACTIVE" ? "Meta reanudada." : parsed.data.status === "PAUSED" ? "Meta pausada." : "Meta archivada." };
}
