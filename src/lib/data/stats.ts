import "server-only";

import { toLocalDate } from "@/lib/domain/dates";
import { metricByDate, resolvePeriodRange, summarizeSales, type PeriodRange, type SaleMetricInput } from "@/lib/domain/stats";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type StatsParams = {
  period?: string;
  from?: string;
  to?: string;
  person?: string;
};

export type SaleListItem = {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerEmoji: string;
  sellerType: "CHILD" | "PARENT";
  soldAt: string;
  localDate: string;
  paymentMethod: "CASH" | "TRANSFER";
  itemsTotal: number;
  costTotal: number;
  marginTotal: number;
  tipTotal: number;
  earningsTotal: number;
  unitsTotal: number;
  status: "COMPLETED" | "VOIDED";
  childEarning?: number;
};

export type ChildPeriodStats = {
  today: string;
  range: PeriodRange;
  ownSales: ReturnType<typeof summarizeSales>;
  ownEarnings: number;
  familyEarnings: number;
  totalEarnings: number;
  sales: SaleListItem[];
};

export type AdminDashboardData = {
  today: string;
  range: PeriodRange;
  selectedPerson: string;
  people: Array<{ id: string; name: string; emoji: string; type: "CHILD" | "PARENT" }>;
  kpis: ReturnType<typeof summarizeSales> & { inventoryValue: number };
  salesByDate: Array<{ label: string; value: number }>;
  profitByDate: Array<{ label: string; value: number }>;
  salesByPerson: Array<{ id: string; name: string; emoji: string; sales: number; revenue: number; profit: number }>;
  childEarnings: Array<{ id: string; name: string; emoji: string; own: number; family: number; total: number }>;
  topProducts: Array<{ id: string; name: string; emoji: string; units: number; revenue: number; profit: number }>;
  lowStock: Array<{ id: string; name: string; emoji: string; stock: number; minStock: number }>;
  negativeBalances: Array<{ id: string; name: string; emoji: string; available: number; savings: number; inGoals: number }>;
  sales: SaleListItem[];
};

export type SaleDetailData = {
  sale: SaleListItem & { cashReceived: number | null; changeGiven: number | null; note: string | null; voidedAt: string | null; voidReason: string | null };
  items: Array<{ id: string; productName: string; productEmoji: string; quantity: number; unitPrice: number; unitCost: number; lineTotal: number; lineCost: number; lineMargin: number }>;
  allocations: Array<{ id: string; childName: string; childEmoji: string; source: "OWN_SALE" | "FAMILY_SHARE"; sharePercent: number | null; marginAmount: number; tipAmount: number; totalAmount: number; reversed: boolean }>;
  reversal: {
    stockUnits: number;
    xp: number;
    points: number;
    money: Array<{ childName: string; childEmoji: string; total: number; available: number; savings: number }>;
  };
};

async function getTimeContext(params: StatsParams) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("app_settings").select("timezone").eq("id", 1).maybeSingle();
  if (error) throw new Error("No fue posible cargar la zona horaria familiar.");
  const today = toLocalDate(new Date(), data?.timezone ?? "America/Bogota");
  return { supabase, today, range: resolvePeriodRange({ preset: params.period, from: params.from, to: params.to }, today) };
}

function asSaleMetric(sale: SaleListItem): SaleMetricInput {
  return {
    id: sale.id,
    localDate: sale.localDate,
    status: sale.status,
    itemsTotal: sale.itemsTotal,
    costTotal: sale.costTotal,
    earningsTotal: sale.earningsTotal,
    tipTotal: sale.tipTotal,
    unitsTotal: sale.unitsTotal,
    paymentMethod: sale.paymentMethod,
  };
}

export async function getChildPeriodStats(childId: string, params: StatsParams): Promise<ChildPeriodStats> {
  const { supabase, today, range } = await getTimeContext(params);
  const { data, error } = await supabase
    .from("v_child_sales")
    .select("id, seller_id, sold_at, local_date, payment_method, items_total, tip_total, units_total, status, child_id, source, child_earning")
    .eq("child_id", childId)
    .gte("local_date", range.from)
    .lte("local_date", range.to)
    .order("sold_at", { ascending: false });
  if (error) throw new Error("No fue posible cargar tus estadísticas.");

  const ownRows = (data ?? []).filter((row) => row.source === "OWN_SALE" && row.seller_id === childId);
  const sales: SaleListItem[] = ownRows.flatMap((row) => row.id && row.seller_id && row.sold_at && row.local_date && row.payment_method && row.status ? [{
    id: row.id,
    sellerId: row.seller_id,
    sellerName: "Tú",
    sellerEmoji: "🙂",
    sellerType: "CHILD" as const,
    soldAt: row.sold_at,
    localDate: row.local_date,
    paymentMethod: row.payment_method as "CASH" | "TRANSFER",
    itemsTotal: row.items_total ?? 0,
    costTotal: 0,
    marginTotal: 0,
    tipTotal: row.tip_total ?? 0,
    earningsTotal: row.child_earning ?? 0,
    unitsTotal: row.units_total ?? 0,
    status: row.status as "COMPLETED" | "VOIDED",
    childEarning: row.child_earning ?? 0,
  }] : []);
  const completedRows = (data ?? []).filter((row) => row.status === "COMPLETED");
  const ownEarnings = completedRows.filter((row) => row.source === "OWN_SALE").reduce((sum, row) => sum + (row.child_earning ?? 0), 0);
  const familyEarnings = completedRows.filter((row) => row.source === "FAMILY_SHARE").reduce((sum, row) => sum + (row.child_earning ?? 0), 0);
  return { today, range, ownSales: summarizeSales(sales.map(asSaleMetric)), ownEarnings, familyEarnings, totalEarnings: ownEarnings + familyEarnings, sales };
}

export async function getChildSalesHistory(childId: string) {
  const { supabase, today } = await getTimeContext({});
  const { data, error } = await supabase
    .from("v_child_sales")
    .select("id, seller_id, sold_at, local_date, payment_method, items_total, tip_total, units_total, status, child_id, source, child_earning")
    .eq("child_id", childId)
    .eq("seller_id", childId)
    .eq("source", "OWN_SALE")
    .order("sold_at", { ascending: false });
  if (error) throw new Error("No fue posible cargar tu historial de ventas.");

  const sales: SaleListItem[] = (data ?? []).flatMap((row) => row.id && row.seller_id && row.sold_at && row.local_date && row.payment_method && row.status ? [{
    id: row.id,
    sellerId: row.seller_id,
    sellerName: "Tú",
    sellerEmoji: "🙂",
    sellerType: "CHILD" as const,
    soldAt: row.sold_at,
    localDate: row.local_date,
    paymentMethod: row.payment_method as "CASH" | "TRANSFER",
    itemsTotal: row.items_total ?? 0,
    costTotal: 0,
    marginTotal: 0,
    tipTotal: row.tip_total ?? 0,
    earningsTotal: row.child_earning ?? 0,
    unitsTotal: row.units_total ?? 0,
    status: row.status as "COMPLETED" | "VOIDED",
    childEarning: row.child_earning ?? 0,
  }] : []);

  return { today, sales };
}

async function getAdminSalesRows(params: StatsParams) {
  const { supabase, today, range } = await getTimeContext(params);
  const validRequestedPerson = params.person && params.person !== "ALL" && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(params.person) ? params.person : "ALL";
  let salesQuery = supabase.from("sales").select("id, seller_id, seller_type, sold_at, local_date, payment_method, items_total, cost_total, margin_total, tip_total, earnings_total, units_total, status, sale_items(sale_id, product_id, product_name, product_emoji, quantity, line_total, line_margin), earning_allocations(sale_id, child_id, source, total_amount, reversed)").gte("local_date", range.from).lte("local_date", range.to).order("sold_at", { ascending: false });
  if (validRequestedPerson !== "ALL") salesQuery = salesQuery.eq("seller_id", validRequestedPerson);
  const [{ data: profiles, error: profilesError }, { data, error }] = await Promise.all([
    supabase.from("profiles").select("id, name, avatar_emoji, type").eq("active", true).order("sort_order"), salesQuery,
  ]);
  if (profilesError) throw new Error("No fue posible cargar los perfiles.");
  if (error) throw new Error("No fue posible cargar las ventas.");
  const people = (profiles ?? []).map((profile) => ({ id: profile.id, name: profile.name, emoji: profile.avatar_emoji, type: profile.type as "CHILD" | "PARENT" }));
  const validPerson = people.some((person) => person.id === validRequestedPerson) ? validRequestedPerson : "ALL";
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const sales: SaleListItem[] = (data ?? []).map((row) => {
    const seller = peopleById.get(row.seller_id);
    return {
      id: row.id, sellerId: row.seller_id, sellerName: seller?.name ?? "Perfil", sellerEmoji: seller?.emoji ?? "🙂",
      sellerType: row.seller_type as "CHILD" | "PARENT", soldAt: row.sold_at, localDate: row.local_date,
      paymentMethod: row.payment_method as "CASH" | "TRANSFER", itemsTotal: row.items_total, costTotal: Number(row.cost_total),
      marginTotal: row.margin_total, tipTotal: row.tip_total, earningsTotal: row.earnings_total, unitsTotal: row.units_total,
      status: row.status as "COMPLETED" | "VOIDED",
    };
  });
  const items = (data ?? []).flatMap((row) => row.sale_items ?? []);
  const allocations = (data ?? []).flatMap((row) => row.earning_allocations ?? []);
  return { supabase, today, range, people, selectedPerson: validPerson, sales, items, allocations };
}

export async function getAdminDashboardData(params: StatsParams): Promise<AdminDashboardData> {
  const extraClient = await createServerSupabaseClient();
  const [context, productsResult, balancesResult, settingsResult] = await Promise.all([
    getAdminSalesRows(params),
    extraClient.from("products").select("id, name, emoji, stock, min_stock, avg_cost, active").eq("active", true).order("sort_order"),
    extraClient.from("v_child_balances").select("child_id, available, savings, in_goals"),
    extraClient.from("app_settings").select("low_stock_alerts").eq("id", 1).maybeSingle(),
  ]);
  const { sales } = context;
  const childProfiles = context.people.filter((person) => person.type === "CHILD");
  const error = productsResult.error || balancesResult.error || settingsResult.error;
  if (error) throw new Error("No fue posible completar los indicadores del panel.");
  const completedIds = new Set(sales.filter((sale) => sale.status === "COMPLETED").map((sale) => sale.id));
  const metrics = sales.map(asSaleMetric);
  const summary = summarizeSales(metrics);
  const productTotals = new Map<string, { id: string; name: string; emoji: string; units: number; revenue: number; profit: number }>();
  for (const item of context.items) {
    if (!completedIds.has(item.sale_id)) continue;
    const current = productTotals.get(item.product_id) ?? { id: item.product_id, name: item.product_name, emoji: item.product_emoji, units: 0, revenue: 0, profit: 0 };
    current.units += item.quantity;
    current.revenue += item.line_total;
    current.profit += item.line_margin;
    productTotals.set(item.product_id, current);
  }
  const saleById = new Map(sales.map((sale) => [sale.id, sale]));
  const personTotals = new Map(context.people.map((person) => [person.id, { id: person.id, name: person.name, emoji: person.emoji, sales: 0, revenue: 0, profit: 0 }]));
  for (const sale of sales) {
    if (sale.status !== "COMPLETED") continue;
    const current = personTotals.get(sale.sellerId);
    if (!current) continue;
    current.sales += 1; current.revenue += sale.itemsTotal; current.profit += sale.earningsTotal;
  }
  const earningsByChild = new Map(childProfiles.map((child) => [child.id, { id: child.id, name: child.name, emoji: child.emoji, own: 0, family: 0, total: 0 }]));
  for (const allocation of context.allocations) {
    if (!completedIds.has(allocation.sale_id) || allocation.reversed) continue;
    const current = earningsByChild.get(allocation.child_id);
    if (!current || !saleById.has(allocation.sale_id)) continue;
    if (allocation.source === "OWN_SALE") current.own += allocation.total_amount;
    else current.family += allocation.total_amount;
    current.total += allocation.total_amount;
  }
  const childById = new Map(childProfiles.map((child) => [child.id, child]));
  const negativeBalances = (balancesResult.data ?? []).flatMap((balance) => {
    const child = balance.child_id ? childById.get(balance.child_id) : undefined;
    const available = balance.available ?? 0; const savings = balance.savings ?? 0; const inGoals = balance.in_goals ?? 0;
    return child && (available < 0 || savings < 0 || inGoals < 0) ? [{ id: child.id, name: child.name, emoji: child.emoji, available, savings, inGoals }] : [];
  });
  const products = productsResult.data ?? [];
  return {
    today: context.today, range: context.range, selectedPerson: context.selectedPerson, people: context.people,
    kpis: { ...summary, inventoryValue: Math.round(products.reduce((sum, product) => sum + Math.max(0, product.stock) * Number(product.avg_cost), 0)) },
    salesByDate: metricByDate(metrics, "revenue"), profitByDate: metricByDate(metrics, "profit"),
    salesByPerson: [...personTotals.values()].filter((person) => person.sales > 0).sort((a, b) => b.revenue - a.revenue),
    childEarnings: [...earningsByChild.values()],
    topProducts: [...productTotals.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 5),
    lowStock: settingsResult.data?.low_stock_alerts === false ? [] : products.filter((product) => product.stock <= product.min_stock).map((product) => ({ id: product.id, name: product.name, emoji: product.emoji, stock: product.stock, minStock: product.min_stock })),
    negativeBalances, sales,
  };
}

export async function getAdminSalesData(params: StatsParams) {
  const context = await getAdminSalesRows(params);
  return { today: context.today, range: context.range, people: context.people, selectedPerson: context.selectedPerson, sales: context.sales };
}

export async function getAdminSaleDetail(saleId: string): Promise<SaleDetailData | null> {
  const supabase = await createServerSupabaseClient();
  const [saleResult, itemsResult, allocationsResult, profilesResult, moneyResult, xpResult, pointsResult] = await Promise.all([
    supabase.from("sales").select("id, seller_id, seller_type, sold_at, local_date, payment_method, items_total, cost_total, margin_total, cash_received, change_given, tip_total, earnings_total, units_total, status, note, voided_at, void_reason").eq("id", saleId).maybeSingle(),
    supabase.from("sale_items").select("id, product_name, product_emoji, quantity, unit_price, unit_cost, line_total, line_cost, line_margin").eq("sale_id", saleId).order("product_name"),
    supabase.from("earning_allocations").select("id, child_id, source, share_percent, margin_amount, tip_amount, total_amount, reversed").eq("sale_id", saleId),
    supabase.from("profiles").select("id, name, avatar_emoji, type"),
    supabase.from("money_movements").select("child_id, earning_amount, available_delta, savings_delta").eq("reference_type", "SALE").eq("reference_id", saleId).eq("type", "EARNING"),
    supabase.from("xp_movements").select("amount").eq("reference_type", "SALE").eq("reference_id", saleId),
    supabase.from("point_movements").select("amount").eq("reference_type", "SALE").eq("reference_id", saleId),
  ]);
  const error = saleResult.error || itemsResult.error || allocationsResult.error || profilesResult.error || moneyResult.error || xpResult.error || pointsResult.error;
  if (error) throw new Error("No fue posible cargar el detalle de la venta.");
  if (!saleResult.data) return null;
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const row = saleResult.data; const seller = profiles.get(row.seller_id);
  return {
    sale: {
      id: row.id, sellerId: row.seller_id, sellerName: seller?.name ?? "Perfil", sellerEmoji: seller?.avatar_emoji ?? "🙂", sellerType: row.seller_type as "CHILD" | "PARENT",
      soldAt: row.sold_at, localDate: row.local_date, paymentMethod: row.payment_method as "CASH" | "TRANSFER", itemsTotal: row.items_total,
      costTotal: Number(row.cost_total), marginTotal: row.margin_total, cashReceived: row.cash_received, changeGiven: row.change_given,
      tipTotal: row.tip_total, earningsTotal: row.earnings_total, unitsTotal: row.units_total, status: row.status as "COMPLETED" | "VOIDED",
      note: row.note, voidedAt: row.voided_at, voidReason: row.void_reason,
    },
    items: (itemsResult.data ?? []).map((item) => ({ id: item.id, productName: item.product_name, productEmoji: item.product_emoji, quantity: item.quantity, unitPrice: item.unit_price, unitCost: Number(item.unit_cost), lineTotal: item.line_total, lineCost: Number(item.line_cost), lineMargin: item.line_margin })),
    allocations: (allocationsResult.data ?? []).map((allocation) => { const child = profiles.get(allocation.child_id); return { id: allocation.id, childName: child?.name ?? "Niño", childEmoji: child?.avatar_emoji ?? "🙂", source: allocation.source as "OWN_SALE" | "FAMILY_SHARE", sharePercent: allocation.share_percent == null ? null : Number(allocation.share_percent), marginAmount: allocation.margin_amount, tipAmount: allocation.tip_amount, totalAmount: allocation.total_amount, reversed: allocation.reversed }; }),
    reversal: {
      stockUnits: (itemsResult.data ?? []).reduce((sum, item) => sum + item.quantity, 0),
      xp: (xpResult.data ?? []).reduce((sum, movement) => sum + movement.amount, 0),
      points: (pointsResult.data ?? []).reduce((sum, movement) => sum + movement.amount, 0),
      money: (moneyResult.data ?? []).map((movement) => { const child = profiles.get(movement.child_id); return { childName: child?.name ?? "Niño", childEmoji: child?.avatar_emoji ?? "🙂", total: movement.earning_amount, available: movement.available_delta, savings: movement.savings_delta }; }),
    },
  };
}
