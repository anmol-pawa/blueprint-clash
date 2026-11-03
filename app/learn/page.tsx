import { ALL_LESSONS } from "@/content/lessons/registry";
import { LearnIndex } from "./LearnIndex";

export const metadata = { title: "Lessons: Blueprint Clash" };

export default function LearnPage() {
  return <LearnIndex lessons={ALL_LESSONS.map((l) => ({ id: l.id, level: l.level, title: l.title, oneLiner: l.oneLiner }))} />;
}
