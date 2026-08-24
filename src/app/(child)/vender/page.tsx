import { PosApp } from "@/components/pos";
import { requireChild } from "@/lib/auth/guards";
import { getPosData } from "@/lib/data/pos";

export default async function ChildSellPage() {
  await requireChild();
  const data = await getPosData();
  return <PosApp {...data} homeHref="/" />;
}
