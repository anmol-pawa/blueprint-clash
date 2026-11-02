import { notFound } from "next/navigation";
import { WORKSHOP_REGISTRY } from "@/content/workshop/registry";
import { DRIVER } from "@/lib/judge/native";
import { toBundle } from "@/lib/workshop/bundle";
import { loadPackageWith } from "@/lib/workshop/load";
import { WorkshopClient } from "./WorkshopClient";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(WORKSHOP_REGISTRY).map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${WORKSHOP_REGISTRY[id]?.meta.title ?? "Workshop"}: Blueprint Clash` };
}

export default async function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mods = WORKSHOP_REGISTRY[id];
  if (!mods) notFound();
  const pkg = await loadPackageWith(id, mods);
  return <WorkshopClient bundle={toBundle(pkg, DRIVER)} />;
}
