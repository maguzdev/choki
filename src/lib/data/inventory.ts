import "server-only";

import { applyPurchase } from "@/lib/domain/inventory";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type InventoryMovement = Database["public"]["Tables"]["inventory_movements"]["Row"];
export type Purchase = Database["public"]["Tables"]["purchases"]["Row"];
export type InventoryProduct = Database["public"]["Tables"]["products"]["Row"];

export type PurchaseHistoryItem = Purchase & {
  productName: string;
  productEmoji: string;
  avgCostAfter: number;
};

export type InventoryHistoryItem = InventoryMovement & {
  productName: string;
  productEmoji: string;
};

export async function getAdminInventoryData(): Promise<{
  products: InventoryProduct[];
  purchases: PurchaseHistoryItem[];
  movements: InventoryHistoryItem[];
}> {
  const supabase = await createServerSupabaseClient();
  const [productsResult, purchasesResult, movementsResult] = await Promise.all([
    supabase.from("products").select("*").order("sort_order").order("name"),
    supabase.from("purchases").select("*").order("purchased_at", { ascending: true }),
    supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }),
  ]);
  if (productsResult.error) throw new Error(productsResult.error.message);
  if (purchasesResult.error) throw new Error(purchasesResult.error.message);
  if (movementsResult.error) throw new Error(movementsResult.error.message);

  const productsById = new Map(productsResult.data.map((product) => [product.id, product]));
  const movementByPurchaseId = new Map(
    movementsResult.data
      .filter((movement) => movement.type === "PURCHASE" && movement.reference_id)
      .map((movement) => [movement.reference_id!, movement]),
  );
  const averageByProduct = new Map<string, number>();
  const purchases = purchasesResult.data.map((purchase) => {
    const product = productsById.get(purchase.product_id);
    const movement = movementByPurchaseId.get(purchase.id);
    const currentStock = movement ? movement.stock_after - purchase.quantity : 0;
    const currentAvg = averageByProduct.get(purchase.product_id) ?? 0;
    const outcome = applyPurchase(
      { stock: currentStock, avgCost: currentAvg },
      { quantity: purchase.quantity, totalCost: purchase.total_cost },
    );
    averageByProduct.set(purchase.product_id, outcome.avgCost);
    return {
      ...purchase,
      productName: product?.name ?? "Producto eliminado",
      productEmoji: product?.emoji ?? "📦",
      avgCostAfter: outcome.avgCost,
    };
  }).reverse();
  const movements = movementsResult.data.map((movement) => {
    const product = productsById.get(movement.product_id);
    return {
      ...movement,
      productName: product?.name ?? "Producto eliminado",
      productEmoji: product?.emoji ?? "📦",
    };
  });
  return { products: productsResult.data, purchases, movements };
}
