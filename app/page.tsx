import HomeClient from "./HomeClient";
import { readStock } from "@/lib/stock-store-server";
import { BUILTIN_PRESETS } from "@/lib/frame";

export const dynamic = "force-dynamic";

export default async function Page() {
  const stored = await readStock();
  const initialStock = stored && stored.length > 0 ? stored : BUILTIN_PRESETS;
  return <HomeClient initialStock={initialStock} />;
}
