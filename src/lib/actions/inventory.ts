"use server";

import { revalidatePath } from "next/cache";

import { requireParent } from "@/lib/auth/guards";
import { toLocalDate } from "@/lib/domain/dates";
import { applyPurchase, canApplyStockAdjustment } from "@/lib/domain/inventory";
import { purchaseSchema, stockAdjustmentSchema } from "@/lib/schemas/inventory";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type InventoryActionState = { status: "idle" | "success" | "error"; message?: string };

function fieldValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function revalidateInventory() {
  revalidatePath("/admin/compras");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/productos");
  revalidatePath("/inventario");
}

async function writeDateContext() {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("app_settings").select("timezone").eq("id", 1).maybeSingle();
  const now = new Date();
  return { admin, now: now.toISOString(), localDate: toLocalDate(now, data?.timezone ?? "America/Bogota") };
}

export async function registerPurchase(
  _previousState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parent = await requireParent();
  const parsed = purchaseSchema.safeParse({
    productId: fieldValue(formData, "productId"),
    quantity: fieldValue(formData, "quantity"),
    totalCost: fieldValue(formData, "totalCost"),
    note: fieldValue(formData, "note"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };

  const { admin, now, localDate } = await writeDateContext();
  const { data: product, error: productError } = await admin
    .from("products")
    .select("id, stock, avg_cost")
    .eq("id", parsed.data.productId)
    .maybeSingle();
  if (productError || !product) return { status: "error", message: "El producto ya no está disponible." };

  const outcome = applyPurchase(
    { stock: product.stock, avgCost: product.avg_cost },
    { quantity: parsed.data.quantity, totalCost: parsed.data.totalCost },
  );
  const purchaseId = crypto.randomUUID();
  const movementId = crypto.randomUUID();
  const payload = {
    purchase: [{
      id: purchaseId, product_id: product.id, quantity: parsed.data.quantity,
      total_cost: parsed.data.totalCost, unit_cost: outcome.unitCost,
      purchased_at: now, local_date: localDate, note: parsed.data.note,
      created_by: parent.id, created_at: now,
    }],
    inventory: [{
      id: movementId, product_id: product.id, type: "PURCHASE", quantity_delta: parsed.data.quantity,
      reason: null, reference_type: "PURCHASE", reference_id: purchaseId,
      stock_after: outcome.stock, note: parsed.data.note, created_by: parent.id,
      created_at: now, local_date: localDate,
    }],
    product_id: product.id,
    new_stock: outcome.stock,
    new_avg_cost: outcome.avgCost,
  } satisfies Json;
  const { error } = await admin.rpc("purchase_commit", { p: payload });
  if (error) return { status: "error", message: "No fue posible registrar la compra. Intenta de nuevo." };
  revalidateInventory();
  return { status: "success", message: `Compra registrada. Nuevo promedio: $${outcome.avgCost}.` };
}

export async function adjustStock(
  _previousState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parent = await requireParent();
  const parsed = stockAdjustmentSchema.safeParse({
    productId: fieldValue(formData, "productId"),
    quantityDelta: fieldValue(formData, "quantityDelta"),
    reason: fieldValue(formData, "reason"),
    note: fieldValue(formData, "note"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };

  const { admin, now, localDate } = await writeDateContext();
  const { data: product, error: productError } = await admin
    .from("products")
    .select("id, stock")
    .eq("id", parsed.data.productId)
    .maybeSingle();
  if (productError || !product) return { status: "error", message: "El producto ya no está disponible." };
  if (!canApplyStockAdjustment(product.stock, parsed.data.quantityDelta)) {
    return {
      status: "error",
      message: `No es posible restar ${Math.abs(parsed.data.quantityDelta)} unidades: el stock actual es ${product.stock}.`,
    };
  }
  const stockAfter = product.stock + parsed.data.quantityDelta;
  const { error: updateError } = await admin
    .from("products")
    .update({ stock: stockAfter, updated_at: now })
    .eq("id", product.id);
  if (updateError) return { status: "error", message: "No fue posible actualizar el stock." };
  const { error: movementError } = await admin.from("inventory_movements").insert({
    id: crypto.randomUUID(), product_id: product.id, type: "ADJUSTMENT",
    quantity_delta: parsed.data.quantityDelta, reason: parsed.data.reason,
    reference_type: null, reference_id: null, stock_after: stockAfter,
    note: parsed.data.note, created_by: parent.id, created_at: now, local_date: localDate,
  });
  if (movementError) {
    await admin.from("products").update({ stock: product.stock, updated_at: now }).eq("id", product.id);
    return { status: "error", message: "No fue posible guardar el movimiento; el stock se restauró sin cambios." };
  }
  revalidateInventory();
  return { status: "success", message: "Ajuste de inventario registrado." };
}
