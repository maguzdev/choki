import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type PublicProduct = Database["public"]["Views"]["products_public"]["Row"];

export async function getAdminCatalog(): Promise<{ categories: Category[]; products: Product[] }> {
  const supabase = await createServerSupabaseClient();
  const [categoriesResult, productsResult] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order").order("name"),
    supabase.from("products").select("*").order("sort_order").order("name"),
  ]);
  if (categoriesResult.error) throw new Error(categoriesResult.error.message);
  if (productsResult.error) throw new Error(productsResult.error.message);
  return { categories: categoriesResult.data, products: productsResult.data };
}

export async function getChildInventory(): Promise<PublicProduct[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products_public")
    .select("id, category_id, name, description, emoji, image_url, price, stock, min_stock, active, sort_order")
    .eq("active", true)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);
  return data;
}
