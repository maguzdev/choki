import "server-only";

import { getCurrentProfile } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PosSeller = { id: string; name: string; type: "CHILD" | "PARENT"; avatarEmoji: string };
export type PosCategory = { id: string; name: string; emoji: string };
export type PosProduct = {
  id: string;
  categoryId: string | null;
  name: string;
  emoji: string;
  price: number;
  stock: number;
  minStock: number;
};

export type PosData = {
  seller: PosSeller;
  categories: PosCategory[];
  products: PosProduct[];
  celebrations: boolean;
};

export async function getPosData(): Promise<PosData> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No hay una sesión activa.");
  const supabase = await createServerSupabaseClient();
  const [categoriesResult, settingsResult, productsResult] = await Promise.all([
    supabase.from("categories").select("id, name, emoji").eq("active", true).order("sort_order").order("name"),
    supabase.from("app_settings").select("celebrations").eq("id", 1).maybeSingle(),
    profile.type === "CHILD"
      ? supabase.from("products_public").select("id, category_id, name, emoji, price, stock, min_stock, active, sort_order").eq("active", true).order("sort_order").order("name")
      : supabase.from("products").select("id, category_id, name, emoji, price, stock, min_stock, active, sort_order").eq("active", true).order("sort_order").order("name"),
  ]);
  if (categoriesResult.error || settingsResult.error || productsResult.error) {
    throw new Error("No fue posible cargar los datos para vender.");
  }

  const products: PosProduct[] = productsResult.data.flatMap((product) => {
    if (!product.id || !product.name || product.price == null || product.stock == null || product.min_stock == null) return [];
    return [{
      id: product.id,
      categoryId: product.category_id,
      name: product.name,
      emoji: product.emoji ?? "🍪",
      price: product.price,
      stock: product.stock,
      minStock: product.min_stock,
    }];
  });

  return {
    seller: { id: profile.id, name: profile.name, type: profile.type === "PARENT" ? "PARENT" : "CHILD", avatarEmoji: profile.avatar_emoji },
    categories: categoriesResult.data,
    products,
    celebrations: settingsResult.data?.celebrations ?? true,
  };
}
