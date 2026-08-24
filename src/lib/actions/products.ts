"use server";

import { revalidatePath } from "next/cache";

import { requireParent } from "@/lib/auth/guards";
import { categorySchema, productSchema } from "@/lib/schemas/product";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type CatalogActionState = { status: "idle" | "success" | "error"; message?: string };

function fieldValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function isChecked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function dbMessage(error: { code?: string; message?: string } | null, fallback: string) {
  if (error?.code === "23505") return "Ya existe un registro con ese nombre.";
  if (error?.code === "23503") return "No se puede eliminar porque ya tiene movimientos relacionados.";
  return error?.message ?? fallback;
}

function revalidateCatalog() {
  revalidatePath("/admin/productos");
  revalidatePath("/inventario");
}

export async function saveCategory(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireParent();
  const parsed = categorySchema.safeParse({
    id: fieldValue(formData, "id") || undefined,
    name: fieldValue(formData, "name"),
    emoji: fieldValue(formData, "emoji"),
    sortOrder: fieldValue(formData, "sortOrder"),
    active: isChecked(formData, "active"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };

  const { id, ...values } = parsed.data;
  const admin = createAdminSupabaseClient();
  const { error } = id
    ? await admin.from("categories").update({ name: values.name, emoji: values.emoji, sort_order: values.sortOrder, active: values.active }).eq("id", id)
    : await admin.from("categories").insert({ name: values.name, emoji: values.emoji, sort_order: values.sortOrder, active: values.active });
  if (error) return { status: "error", message: dbMessage(error, "No fue posible guardar la categoría.") };
  revalidateCatalog();
  return { status: "success", message: id ? "Categoría actualizada." : "Categoría creada." };
}

export async function deleteCategory(id: string): Promise<CatalogActionState> {
  await requireParent();
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("categories").delete().eq("id", id);
  if (error) return { status: "error", message: dbMessage(error, "No fue posible eliminar la categoría.") };
  revalidateCatalog();
  return { status: "success", message: "Categoría eliminada." };
}

export async function saveProduct(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  await requireParent();
  const parsed = productSchema.safeParse({
    id: fieldValue(formData, "id") || undefined,
    categoryId: fieldValue(formData, "categoryId") || null,
    name: fieldValue(formData, "name"),
    description: fieldValue(formData, "description"),
    emoji: fieldValue(formData, "emoji"),
    imageUrl: fieldValue(formData, "imageUrl"),
    price: fieldValue(formData, "price"),
    cost: fieldValue(formData, "cost"),
    stock: fieldValue(formData, "stock"),
    minStock: fieldValue(formData, "minStock"),
    active: isChecked(formData, "active"),
    sortOrder: fieldValue(formData, "sortOrder"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };

  const { id, categoryId, imageUrl, minStock, sortOrder, ...values } = parsed.data;
  const payload = {
    category_id: categoryId,
    image_url: imageUrl,
    min_stock: minStock,
    sort_order: sortOrder,
    ...values,
    updated_at: new Date().toISOString(),
  };
  const admin = createAdminSupabaseClient();
  const { error } = id
    ? await admin.from("products").update(payload).eq("id", id)
    : await admin.from("products").insert(payload);
  if (error) return { status: "error", message: dbMessage(error, "No fue posible guardar el producto.") };
  revalidateCatalog();
  return { status: "success", message: id ? "Producto actualizado." : "Producto creado." };
}

export async function deleteProduct(id: string): Promise<CatalogActionState> {
  await requireParent();
  const admin = createAdminSupabaseClient();
  const { data: saleItem, error: usageError } = await admin.from("sale_items").select("id").eq("product_id", id).limit(1).maybeSingle();
  if (usageError) return { status: "error", message: "No fue posible comprobar el historial del producto." };
  if (saleItem) {
    return { status: "error", message: "Este producto ya tiene ventas. No se puede borrar; desactívalo para conservar el historial." };
  }
  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) return { status: "error", message: dbMessage(error, "No fue posible eliminar el producto.") };
  revalidateCatalog();
  return { status: "success", message: "Producto eliminado." };
}
