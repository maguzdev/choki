"use server";

import { revalidatePath } from "next/cache";

import { requireChildSelf, requireParent } from "@/lib/auth/guards";
import { toLocalDate } from "@/lib/domain/dates";
import { evaluateAchievements, evaluateChallenges, levelFor, xpAndPointsForSale, type AchievementCondition, type Challenge, type ChallengeCondition, type GamificationRule } from "@/lib/domain/gamification";
import { buildSaleCommitPayload, buildSaleVoidPayload, type ChallengeProgressDraft, type NotificationDraft } from "@/lib/domain/payloads";
import { computeCashOutcome, computeSaleTotals } from "@/lib/domain/sale";
import { replayStreak } from "@/lib/domain/streak";
import { registerSaleSchema, type RegisterSaleInput } from "@/lib/schemas/sale";
import { voidSaleSchema } from "@/lib/schemas/settings";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

type SaleRow = Database["public"]["Tables"]["sales"]["Row"];

export type SaleSummary = {
  saleId: string;
  sellerType: "CHILD" | "PARENT";
  itemsTotal: number;
  marginTotal: number;
  tipTotal: number;
  earningsTotal: number;
  unitsTotal: number;
  xpEarned: number | null;
  pointsEarned: number | null;
  currentStreak: number | null;
  levelName: string | null;
  xpToNextLevel: number | null;
  allocations: { childId: string; childName: string; amount: number }[];
  unlockedAchievements: string[];
  completedChallenges: string[];
  shouldCelebrate: boolean;
  duplicate: boolean;
};

export type SaleActionResult =
  | { status: "success" | "duplicate"; message?: string; summary: SaleSummary }
  | { status: "error"; message: string };

export type VoidSaleActionResult = { status: "success" | "error"; message: string };

function revalidateSalePaths() {
  for (const path of [
    "/", "/vender", "/inventario", "/progreso", "/racha", "/premios", "/dinero",
    "/mis-ventas", "/estadisticas", "/notificaciones", "/admin", "/admin/vender",
    "/admin/ventas", "/admin/inventario", "/admin/productos",
  ]) revalidatePath(path);
}

async function existingSaleSummary(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  sale: SaleRow,
): Promise<SaleSummary> {
  const { data: allocations } = await admin
    .from("earning_allocations")
    .select("child_id, total_amount")
    .eq("sale_id", sale.id)
    .order("created_at");
  const childIds = [...new Set((allocations ?? []).map((row) => row.child_id))];
  const { data: profiles } = childIds.length
    ? await admin.from("profiles").select("id, name").in("id", childIds)
    : { data: [] as { id: string; name: string }[] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.name]));
  const { data: streak } = sale.seller_type === "CHILD"
    ? await admin.from("child_streaks").select("current_streak").eq("child_id", sale.seller_id).maybeSingle()
    : { data: null };
  return {
    saleId: sale.id,
    sellerType: sale.seller_type as "CHILD" | "PARENT",
    itemsTotal: sale.items_total,
    marginTotal: sale.margin_total,
    tipTotal: sale.tip_total,
    earningsTotal: sale.earnings_total,
    unitsTotal: sale.units_total,
    xpEarned: null,
    pointsEarned: null,
    currentStreak: streak?.current_streak ?? null,
    levelName: null,
    xpToNextLevel: null,
    allocations: (allocations ?? []).map((allocation) => ({
      childId: allocation.child_id,
      childName: names.get(allocation.child_id) ?? "Niño",
      amount: allocation.total_amount,
    })),
    unlockedAchievements: [],
    completedChallenges: [],
    shouldCelebrate: false,
    duplicate: true,
  };
}

function paymentTip(input: RegisterSaleInput, itemsTotal: number): number {
  if (input.paymentMethod === "TRANSFER") return input.transferTip;
  if (input.cashReceived == null) throw new Error("Indica cuánto dinero recibiste.");
  return computeCashOutcome({
    itemsTotal,
    cashReceived: input.cashReceived,
    changeGiven: input.changeGiven ?? Math.max(0, input.cashReceived - itemsTotal),
  }).tip;
}

export async function registerSale(rawInput: RegisterSaleInput): Promise<SaleActionResult> {
  const parsed = registerSaleSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos de la venta." };
  const input = parsed.data;

  const seller = input.sellerType === "CHILD"
    ? await requireChildSelf(input.sellerId)
    : await requireParent();
  if (seller.id !== input.sellerId || seller.type !== input.sellerType) {
    return { status: "error", message: "El vendedor no coincide con la sesión activa." };
  }

  const admin = createAdminSupabaseClient();
  const { data: existing, error: existingError } = await admin.from("sales").select("*").eq("id", input.saleId).maybeSingle();
  if (existingError) return { status: "error", message: "No fue posible comprobar la venta. Intenta de nuevo." };
  if (existing) {
    if (existing.seller_id !== seller.id) return { status: "error", message: "El identificador de venta ya está en uso." };
    return { status: "duplicate", message: "Esta venta ya estaba registrada; no se duplicó.", summary: await existingSaleSummary(admin, existing) };
  }

  const productIds = input.items.map((item) => item.productId);
  const [settingsResult, productsResult, childrenResult, parentsResult, savingResult, splitResult] = await Promise.all([
    admin.from("app_settings").select("timezone, protector_max, celebrations, low_stock_alerts").eq("id", 1).maybeSingle(),
    admin.from("products").select("id, name, emoji, price, cost, avg_cost, stock, min_stock, active").in("id", productIds),
    admin.from("profiles").select("id, name, sort_order").eq("type", "CHILD").eq("active", true).order("sort_order"),
    admin.from("profiles").select("id").eq("type", "PARENT").eq("active", true),
    admin.from("child_settings").select("child_id, auto_saving_enabled, saving_percent"),
    admin.from("profit_split_rules").select("child_id, percent"),
  ]);
  if (settingsResult.error || !settingsResult.data || productsResult.error || childrenResult.error || parentsResult.error || savingResult.error || splitResult.error) {
    return { status: "error", message: "No fue posible preparar la venta. Intenta de nuevo." };
  }

  const productsById = new Map(productsResult.data.map((product) => [product.id, product]));
  const lines = input.items.flatMap((item) => {
    const product = productsById.get(item.productId);
    if (!product || !product.active) return [];
    return [{
      productId: product.id,
      name: product.name,
      emoji: product.emoji,
      quantity: item.quantity,
      unitPrice: product.price,
      unitCost: product.avg_cost > 0 ? product.avg_cost : product.cost,
      stock: product.stock,
    }];
  });
  if (lines.length !== input.items.length) return { status: "error", message: "Uno de los productos ya no está disponible. Revisa el carrito." };
  const insufficientStock = lines.find((line) => line.quantity > line.stock);
  if (insufficientStock) {
    const available = Math.max(0, insufficientStock.stock);
    return {
      status: "error",
      message: `No puedes vender ${insufficientStock.quantity} ${insufficientStock.quantity === 1 ? "unidad" : "unidades"} de ${insufficientStock.name}: solo hay ${available} ${available === 1 ? "disponible" : "disponibles"}. Cierra el cobro y actualiza el carrito.`,
    };
  }

  let totals: ReturnType<typeof computeSaleTotals>;
  let tipTotal: number;
  try {
    totals = computeSaleTotals(lines);
    tipTotal = paymentTip(input, totals.itemsTotal);
  } catch (error) {
    return { status: "error", message: error instanceof Error && error.message.includes("below") ? "El dinero recibido no alcanza para cubrir la venta." : "Revisa el pago y el cambio antes de confirmar." };
  }
  if (totals.marginTotal + tipTotal < 0) {
    return { status: "error", message: "Esta venta produciría una ganancia negativa. Revisa el precio o el costo del producto." };
  }

  const now = new Date();
  const soldAt = now.toISOString();
  const localDate = toLocalDate(now, settingsResult.data.timezone);
  const activeChildIds = new Set(childrenResult.data.map((child) => child.id));
  const savingSettings = Object.fromEntries(savingResult.data
    .filter((setting) => activeChildIds.has(setting.child_id))
    .map((setting) => [setting.child_id, { enabled: setting.auto_saving_enabled, percent: setting.saving_percent }]));
  const splitRules = childrenResult.data.map((child) => ({
    childId: child.id,
    sortOrder: child.sort_order,
    percent: Number(splitResult.data.find((rule) => rule.child_id === child.id)?.percent ?? 0),
  }));
  if (input.sellerType === "PARENT" && Math.abs(splitRules.reduce((sum, rule) => sum + rule.percent, 0) - 100) > 0.000_001) {
    return { status: "error", message: "El reparto familiar debe sumar 100 % antes de registrar una venta de padre." };
  }

  let gamificationRules: Parameters<typeof xpAndPointsForSale>[1] = [];
  let achievementRewards: ReturnType<typeof evaluateAchievements> = [];
  let challengeProgress: ChallengeProgressDraft[] = [];
  let streak: ReturnType<typeof replayStreak> | undefined;
  let xpEarned: number | null = null;
  let pointsEarned: number | null = null;
  let levelName: string | null = null;
  let xpToNextLevel: number | null = null;
  let unlockedAchievementNames: string[] = [];
  let completedChallengeNames: string[] = [];
  let milestoneCelebration = false;
  const notifications: NotificationDraft[] = [];

  if (input.sellerType === "CHILD") {
    const childId = seller.id;
    const [salesResult, rulesResult, levelsResult, achievementsResult, unlocksResult, challengesResult, progressResult, xpResult, protectorResult, streakDaysResult, goalsResult] = await Promise.all([
      admin.from("sales").select("id, local_date, units_total, earnings_total, items_total").eq("seller_id", childId).eq("seller_type", "CHILD").eq("status", "COMPLETED"),
      admin.from("gamification_rules").select("event, xp_amount, points_amount, active"),
      admin.from("levels").select("id, number, name, xp_required").eq("active", true).order("number"),
      admin.from("achievements").select("id, name, icon, condition_type, target_value, product_id, xp_reward, points_reward, hidden, active").eq("active", true),
      admin.from("achievement_unlocks").select("achievement_id").eq("child_id", childId),
      admin.from("challenges").select("id, name, icon, starts_on, ends_on, condition_type, target_value, product_id, xp_reward, points_reward, status").eq("status", "ACTIVE").lte("starts_on", localDate).gte("ends_on", localDate),
      admin.from("challenge_progress").select("id, challenge_id, current_value, completed_at, rewarded").eq("child_id", childId),
      admin.from("xp_movements").select("amount").eq("child_id", childId),
      admin.from("protector_events").select("local_date, quantity").eq("child_id", childId).order("local_date"),
      admin.from("streak_days").select("local_date, status").eq("child_id", childId),
      admin.from("goals").select("id", { count: "exact", head: true }).eq("child_id", childId).eq("status", "COMPLETED"),
    ]);
    const contextError = [salesResult, rulesResult, levelsResult, achievementsResult, unlocksResult, challengesResult, progressResult, xpResult, protectorResult, streakDaysResult, goalsResult].find((result) => result.error)?.error;
    if (contextError) return { status: "error", message: "No fue posible calcular el progreso de la venta." };

    const existingSales = salesResult.data ?? [];
    const rulesRows = rulesResult.data ?? [];
    const levelRows = levelsResult.data ?? [];
    const achievementRows = achievementsResult.data ?? [];
    const unlockRows = unlocksResult.data ?? [];
    const challengeRows = challengesResult.data ?? [];
    const progressRows = progressResult.data ?? [];
    const xpRows = xpResult.data ?? [];
    const protectorRows = protectorResult.data ?? [];
    const streakDayRows = streakDaysResult.data ?? [];
    const saleIds = existingSales.map((sale) => sale.id);
    const { data: existingItems, error: itemsError } = saleIds.length
      ? await admin.from("sale_items").select("sale_id, product_id, quantity").in("sale_id", saleIds)
      : { data: [] as { sale_id: string; product_id: string; quantity: number }[], error: null };
    if (itemsError) return { status: "error", message: "No fue posible calcular el historial de productos vendidos." };

    const saleDays = new Map<string, number>();
    for (const sale of existingSales) saleDays.set(sale.local_date, (saleDays.get(sale.local_date) ?? 0) + 1);
    saleDays.set(localDate, (saleDays.get(localDate) ?? 0) + 1);
    streak = replayStreak({
      saleDays: [...saleDays].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
      protectorGrants: protectorRows.map((grant) => ({ date: grant.local_date, quantity: grant.quantity })),
      today: localDate,
      maxProtectors: settingsResult.data.protector_max,
    });

    const productUnits: Record<string, number> = {};
    for (const item of existingItems) productUnits[item.product_id] = (productUnits[item.product_id] ?? 0) + item.quantity;
    for (const line of lines) productUnits[line.productId] = (productUnits[line.productId] ?? 0) + line.quantity;
    const alreadyUnlocked = new Set(unlockRows.map((unlock) => unlock.achievement_id));
    achievementRewards = evaluateAchievements({
      stats: {
        totalSales: existingSales.length + 1,
        totalUnits: existingSales.reduce((sum, sale) => sum + sale.units_total, 0) + totals.unitsTotal,
        totalProfit: existingSales.reduce((sum, sale) => sum + sale.earnings_total, 0) + totals.marginTotal + tipTotal,
        bestStreak: streak.bestStreak,
        productUnits,
        goalsCompleted: goalsResult.count ?? 0,
      },
      achievements: achievementRows.map((achievement) => ({
        id: achievement.id,
        conditionType: achievement.condition_type as AchievementCondition,
        targetValue: achievement.target_value,
        productId: achievement.product_id,
        xpReward: achievement.xp_reward,
        pointsReward: achievement.points_reward,
        hidden: achievement.hidden,
        active: achievement.active,
      })),
      alreadyUnlocked,
    });

    const progressByChallenge = new Map(progressRows.map((progress) => [progress.challenge_id, progress]));
    const challengeValues: Record<string, number> = {};
    for (const challenge of challengeRows) {
      const salesInRange = existingSales.filter((sale) => sale.local_date >= challenge.starts_on && sale.local_date <= challenge.ends_on);
      const saleIdSet = new Set(salesInRange.map((sale) => sale.id));
      const newSaleApplies = localDate >= challenge.starts_on && localDate <= challenge.ends_on;
      switch (challenge.condition_type) {
        case "SALES_COUNT": challengeValues[challenge.id] = salesInRange.length + (newSaleApplies ? 1 : 0); break;
        case "UNITS_SOLD": challengeValues[challenge.id] = salesInRange.reduce((sum, sale) => sum + sale.units_total, 0) + (newSaleApplies ? totals.unitsTotal : 0); break;
        case "PROFIT_AMOUNT": challengeValues[challenge.id] = salesInRange.reduce((sum, sale) => sum + sale.earnings_total, 0) + (newSaleApplies ? totals.marginTotal + tipTotal : 0); break;
        case "ACTIVE_DAYS": challengeValues[challenge.id] = new Set([...salesInRange.map((sale) => sale.local_date), ...(newSaleApplies ? [localDate] : [])]).size; break;
        case "PRODUCT_UNITS": {
          const previous = existingItems.filter((item) => saleIdSet.has(item.sale_id) && item.product_id === challenge.product_id).reduce((sum, item) => sum + item.quantity, 0);
          const current = newSaleApplies ? lines.filter((line) => line.productId === challenge.product_id).reduce((sum, line) => sum + line.quantity, 0) : 0;
          challengeValues[challenge.id] = previous + current;
          break;
        }
      }
    }
    const challengeDefinitions: Challenge[] = challengeRows.map((challenge) => ({
      id: challenge.id,
      startsOn: challenge.starts_on,
      endsOn: challenge.ends_on,
      conditionType: challenge.condition_type as ChallengeCondition,
      targetValue: challenge.target_value,
      productId: challenge.product_id,
      xpReward: challenge.xp_reward,
      pointsReward: challenge.points_reward,
      status: challenge.status as Challenge["status"],
    }));
    const evaluations = evaluateChallenges({
      today: localDate,
      challenges: challengeDefinitions,
      values: challengeValues,
      rewardedChallengeIds: new Set(progressRows.filter((progress) => progress.rewarded).map((progress) => progress.challenge_id)),
    });
    challengeProgress = evaluations.map((evaluation) => {
      const previous = progressByChallenge.get(evaluation.challengeId);
      return {
        id: previous?.id,
        challengeId: evaluation.challengeId,
        childId,
        currentValue: evaluation.currentValue,
        completedAt: previous?.completed_at ?? (evaluation.completed ? soldAt : null),
        rewarded: previous?.rewarded || evaluation.grantReward,
        grantReward: evaluation.grantReward,
        xpReward: evaluation.xp,
        pointsReward: evaluation.points,
      };
    });

    gamificationRules = rulesRows.map((rule) => ({ event: rule.event as GamificationRule["event"], xp: rule.xp_amount, points: rule.points_amount, active: rule.active }));
    const baseRewards = xpAndPointsForSale({ unitsTotal: totals.unitsTotal }, gamificationRules);
    xpEarned = baseRewards.xp.reduce((sum, movement) => sum + movement.amount, 0)
      + achievementRewards.reduce((sum, reward) => sum + reward.xp, 0)
      + challengeProgress.filter((progress) => progress.grantReward).reduce((sum, progress) => sum + (progress.xpReward ?? 0), 0);
    pointsEarned = baseRewards.points.reduce((sum, movement) => sum + movement.amount, 0)
      + achievementRewards.reduce((sum, reward) => sum + reward.points, 0)
      + challengeProgress.filter((progress) => progress.grantReward).reduce((sum, progress) => sum + (progress.pointsReward ?? 0), 0);

    const levels = levelRows.map((level) => ({ id: level.id, number: level.number, name: level.name, xpRequired: level.xp_required }));
    const previousXp = xpRows.reduce((sum, movement) => sum + movement.amount, 0);
    if (levels.length) {
      const before = levelFor(previousXp, levels);
      const after = levelFor(previousXp + xpEarned, levels);
      levelName = after.current.name;
      xpToNextLevel = after.next ? Math.max(0, after.next.xpRequired - (previousXp + xpEarned)) : null;
      if (before.current.id !== after.current.id) {
        milestoneCelebration = true;
        notifications.push({ profileId: childId, type: "LEVEL_UP", title: `¡Subiste al nivel ${after.current.name}!`, icon: "⭐", referenceType: "SALE", referenceId: input.saleId });
      }
    }

    const achievementById = new Map(achievementRows.map((achievement) => [achievement.id, achievement]));
    unlockedAchievementNames = achievementRewards.map((reward) => achievementById.get(reward.achievementId)?.name ?? "Nuevo logro");
    for (const reward of achievementRewards) {
      const achievement = achievementById.get(reward.achievementId);
      notifications.push({ profileId: childId, type: "ACHIEVEMENT", title: `Logro desbloqueado: ${achievement?.name ?? "Nuevo logro"}`, icon: achievement?.icon ?? "🏅", referenceType: "ACHIEVEMENT", referenceId: reward.achievementId });
    }
    const challengeById = new Map(challengeRows.map((challenge) => [challenge.id, challenge]));
    const completedNow = challengeProgress.filter((progress) => progress.grantReward);
    completedChallengeNames = completedNow.map((progress) => challengeById.get(progress.challengeId)?.name ?? "Reto completado");
    for (const progress of completedNow) {
      const challenge = challengeById.get(progress.challengeId);
      notifications.push({ profileId: childId, type: "CHALLENGE_COMPLETED", title: `Reto completado: ${challenge?.name ?? "Reto"}`, icon: challenge?.icon ?? "🎯", referenceType: "CHALLENGE", referenceId: progress.challengeId });
    }
    const previousProtected = new Set(streakDayRows.filter((day) => day.status === "PROTECTED").map((day) => day.local_date));
    for (const day of streak.days.filter((item) => item.status === "PROTECTED" && !previousProtected.has(item.date))) {
      notifications.push({ profileId: childId, type: "PROTECTOR_USED", title: "Un protector cuidó tu racha", body: `Protegió el día ${day.date}.`, icon: "🛡️" });
    }
    milestoneCelebration ||= achievementRewards.length > 0 || completedNow.length > 0 || totals.itemsTotal > Math.max(0, ...existingSales.map((sale) => sale.items_total));
  }

  for (const line of lines) {
    const product = productsById.get(line.productId)!;
    const stockAfter = product.stock - line.quantity;
    if (settingsResult.data.low_stock_alerts && stockAfter <= product.min_stock) {
      for (const parent of parentsResult.data) notifications.push({
        profileId: parent.id,
        type: "LOW_STOCK",
        title: `Stock bajo: ${product.name}`,
        body: `Quedan ${stockAfter} unidades registradas.`,
        icon: "⚠️",
        referenceType: "SALE",
        referenceId: input.saleId,
      });
    }
  }

  let payload: ReturnType<typeof buildSaleCommitPayload>;
  try {
    payload = buildSaleCommitPayload({
      idFactory: () => crypto.randomUUID(),
      saleId: input.saleId,
      seller: { id: seller.id, type: seller.type },
      lines,
      paymentMethod: input.paymentMethod,
      cashReceived: input.cashReceived ?? undefined,
      changeGiven: input.changeGiven ?? undefined,
      transferTip: input.transferTip,
      soldAt,
      localDate,
      splitRules,
      savingSettings,
      gamificationRules,
      achievementRewards,
      challengeProgress,
      streak,
      notifications,
    });
  } catch {
    return { status: "error", message: "No fue posible calcular todos los efectos de la venta." };
  }

  const { error: commitError } = await admin.rpc("sale_commit", { p: payload as unknown as Json });
  if (commitError) {
    if (commitError.code === "23505") {
      const { data: committed } = await admin.from("sales").select("*").eq("id", input.saleId).maybeSingle();
      if (committed?.seller_id === seller.id) return { status: "duplicate", message: "Esta venta ya estaba registrada; no se duplicó.", summary: await existingSaleSummary(admin, committed) };
    }
    if (commitError.message.includes("INSUFFICIENT_STOCK")) {
      return { status: "error", message: "El stock cambió mientras confirmabas la venta. No se guardó ningún cambio; cierra el cobro, actualiza la página y revisa las cantidades." };
    }
    return { status: "error", message: "No fue posible registrar la venta. No se guardó ningún cambio; intenta de nuevo." };
  }

  revalidateSalePaths();
  const childNames = new Map(childrenResult.data.map((child) => [child.id, child.name]));
  const currentStreak = input.sellerType === "CHILD" ? streak?.currentStreak ?? 0 : null;
  return {
    status: "success",
    summary: {
      saleId: input.saleId,
      sellerType: input.sellerType,
      itemsTotal: totals.itemsTotal,
      marginTotal: totals.marginTotal,
      tipTotal,
      earningsTotal: totals.marginTotal + tipTotal,
      unitsTotal: totals.unitsTotal,
      xpEarned,
      pointsEarned,
      currentStreak,
      levelName,
      xpToNextLevel,
      allocations: payload.allocations.map((allocation) => ({ childId: allocation.child_id, childName: childNames.get(allocation.child_id) ?? seller.name, amount: allocation.total_amount })),
      unlockedAchievements: unlockedAchievementNames,
      completedChallenges: completedChallengeNames,
      shouldCelebrate: settingsResult.data.celebrations && milestoneCelebration,
      duplicate: false,
    },
  };
}

export async function voidSale(saleId: string, reason: string): Promise<VoidSaleActionResult> {
  const parent = await requireParent();
  const parsed = voidSaleSchema.safeParse({ saleId, reason });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa el motivo de la anulación." };

  const admin = createAdminSupabaseClient();
  const [saleResult, settingsResult] = await Promise.all([
    admin.from("sales").select("*").eq("id", parsed.data.saleId).maybeSingle(),
    admin.from("app_settings").select("timezone, protector_max").eq("id", 1).maybeSingle(),
  ]);
  if (saleResult.error || !saleResult.data) return { status: "error", message: "La venta ya no existe." };
  if (settingsResult.error || !settingsResult.data) return { status: "error", message: "No fue posible cargar la configuración familiar." };
  if (saleResult.data.status !== "COMPLETED") return { status: "error", message: "Esta venta ya fue anulada y no puede anularse nuevamente." };
  const sale = saleResult.data;

  const [itemsResult, allocationsResult, moneyResult, xpResult, pointsResult] = await Promise.all([
    admin.from("sale_items").select("*").eq("sale_id", sale.id),
    admin.from("earning_allocations").select("*").eq("sale_id", sale.id),
    admin.from("money_movements").select("*").eq("reference_type", "SALE").eq("reference_id", sale.id).eq("type", "EARNING"),
    admin.from("xp_movements").select("*").eq("reference_type", "SALE").eq("reference_id", sale.id),
    admin.from("point_movements").select("*").eq("reference_type", "SALE").eq("reference_id", sale.id),
  ]);
  const saleDataError = [itemsResult, allocationsResult, moneyResult, xpResult, pointsResult].find((result) => result.error)?.error;
  if (saleDataError || !itemsResult.data?.length) return { status: "error", message: "No fue posible reconstruir los efectos originales de la venta." };
  if ((moneyResult.data?.length ?? 0) !== (allocationsResult.data?.length ?? 0)) {
    return { status: "error", message: "La venta no tiene un reparto de dinero completo y requiere revisión antes de anularse." };
  }

  const productIds = [...new Set(itemsResult.data.map((item) => item.product_id))];
  const { data: products, error: productsError } = await admin.from("products").select("id, stock").in("id", productIds);
  if (productsError || (products?.length ?? 0) !== productIds.length) return { status: "error", message: "No fue posible comprobar el inventario que se debe restituir." };
  const stockByProduct = Object.fromEntries((products ?? []).map((product) => [product.id, product.stock]));

  const now = new Date();
  const voidedAt = now.toISOString();
  const localDate = toLocalDate(now, settingsResult.data.timezone);
  let streak: ReturnType<typeof replayStreak> | undefined;
  let challengeProgress: ChallengeProgressDraft[] = [];

  if (sale.seller_type === "CHILD") {
    const childId = sale.seller_id;
    const [salesResult, protectorsResult, challengesResult, progressResult] = await Promise.all([
      admin.from("sales").select("id, local_date, units_total, earnings_total").eq("seller_id", childId).eq("seller_type", "CHILD").eq("status", "COMPLETED").neq("id", sale.id),
      admin.from("protector_events").select("local_date, quantity").eq("child_id", childId).order("local_date"),
      admin.from("challenges").select("id, starts_on, ends_on, condition_type, target_value, product_id"),
      admin.from("challenge_progress").select("id, challenge_id, child_id, completed_at, rewarded").eq("child_id", childId),
    ]);
    const progressError = [salesResult, protectorsResult, challengesResult, progressResult].find((result) => result.error)?.error;
    if (progressError) return { status: "error", message: "No fue posible recalcular la racha y los retos." };
    const remainingSales = salesResult.data ?? [];
    const saleDays = new Map<string, number>();
    for (const remaining of remainingSales) saleDays.set(remaining.local_date, (saleDays.get(remaining.local_date) ?? 0) + 1);
    streak = replayStreak({
      saleDays: [...saleDays].map(([date, count]) => ({ date, count })),
      protectorGrants: (protectorsResult.data ?? []).map((event) => ({ date: event.local_date, quantity: event.quantity })),
      today: localDate,
      maxProtectors: settingsResult.data.protector_max,
    });

    const remainingSaleIds = remainingSales.map((remaining) => remaining.id);
    const { data: remainingItems, error: remainingItemsError } = remainingSaleIds.length
      ? await admin.from("sale_items").select("sale_id, product_id, quantity").in("sale_id", remainingSaleIds)
      : { data: [] as { sale_id: string; product_id: string; quantity: number }[], error: null };
    if (remainingItemsError) return { status: "error", message: "No fue posible recalcular los productos de los retos." };
    const challengeById = new Map((challengesResult.data ?? []).map((challenge) => [challenge.id, challenge]));
    challengeProgress = (progressResult.data ?? []).flatMap((progress) => {
      const challenge = challengeById.get(progress.challenge_id);
      if (!challenge) return [];
      const salesInRange = remainingSales.filter((remaining) => remaining.local_date >= challenge.starts_on && remaining.local_date <= challenge.ends_on);
      const idsInRange = new Set(salesInRange.map((remaining) => remaining.id));
      let currentValue = 0;
      switch (challenge.condition_type as ChallengeCondition) {
        case "SALES_COUNT": currentValue = salesInRange.length; break;
        case "UNITS_SOLD": currentValue = salesInRange.reduce((sum, remaining) => sum + remaining.units_total, 0); break;
        case "PROFIT_AMOUNT": currentValue = salesInRange.reduce((sum, remaining) => sum + remaining.earnings_total, 0); break;
        case "ACTIVE_DAYS": currentValue = new Set(salesInRange.map((remaining) => remaining.local_date)).size; break;
        case "PRODUCT_UNITS": currentValue = (remainingItems ?? []).filter((item) => idsInRange.has(item.sale_id) && item.product_id === challenge.product_id).reduce((sum, item) => sum + item.quantity, 0); break;
      }
      return [{
        id: progress.id,
        challengeId: progress.challenge_id,
        childId: progress.child_id,
        currentValue,
        completedAt: currentValue >= Number(challenge.target_value) ? progress.completed_at : null,
        rewarded: progress.rewarded,
      }];
    });
  }

  const recipients = new Set([sale.seller_id, ...(allocationsResult.data ?? []).map((allocation) => allocation.child_id)]);
  const notifications: NotificationDraft[] = [...recipients].map((profileId) => ({
    profileId,
    type: "SALE_VOIDED",
    title: `Venta #${sale.id.slice(0, 6).toUpperCase()} anulada`,
    body: `Motivo: ${parsed.data.reason}`,
    icon: "↩️",
    referenceType: "SALE",
    referenceId: sale.id,
  }));

  let payload: ReturnType<typeof buildSaleVoidPayload>;
  try {
    payload = buildSaleVoidPayload({
      idFactory: () => crypto.randomUUID(),
      sale,
      items: itemsResult.data,
      allocations: allocationsResult.data ?? [],
      originalMoney: moneyResult.data ?? [],
      originalXp: xpResult.data ?? [],
      originalPoints: pointsResult.data ?? [],
      stockByProduct,
      voidedAt,
      voidedBy: parent.id,
      voidReason: parsed.data.reason,
      localDate,
      challengeProgress,
      streak,
      notifications,
    });
  } catch {
    return { status: "error", message: "No fue posible preparar una reversión íntegra de la venta." };
  }

  const { error } = await admin.rpc("sale_void", { p: payload as unknown as Json });
  if (error) {
    if (error.message.includes("SALE_NOT_VOIDABLE")) return { status: "error", message: "La venta fue anulada por otra operación. Actualiza la página." };
    return { status: "error", message: "No fue posible anular la venta. No se guardó ningún cambio." };
  }
  revalidateSalePaths();
  return { status: "success", message: "Venta anulada. Se revirtieron inventario, dinero y progreso en una sola operación." };
}
