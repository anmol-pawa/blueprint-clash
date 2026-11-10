import { notFound } from "next/navigation";
import { BOARD_DRILLS, DRILL_BY_ID } from "@/content/drills";
import { DrillClient } from "./DrillClient";

export const dynamicParams = false;

export function generateStaticParams() {
  return BOARD_DRILLS.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${DRILL_BY_ID[id]?.title ?? "Drill"}: Design Board: Blueprint Clash` };
}

export default async function DrillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const drill = DRILL_BY_ID[id];
  if (!drill) notFound();
  return <DrillClient drill={drill} />;
}
