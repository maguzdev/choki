import { PosApp } from "@/components/pos";
import { requireParent } from "@/lib/auth/guards";
import { getPosData } from "@/lib/data/pos";

export default async function AdminSellPage() {
  await requireParent();
  const data = await getPosData();
  return <PosApp {...data} homeHref="/admin" />;
}
