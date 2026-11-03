import { OLD_TOWN_MASTER } from "@/content/masters/old-town";
import { EXERCISE_META } from "@/content/exercises/registry";
import { EXERCISE_ROOT, loadExercise } from "@/lib/exercises/load";
import { toExerciseBundle } from "@/lib/exercises/bundle";
import { DRIVER } from "@/lib/judge/native";
import { MasterClient } from "./MasterClient";

export const metadata = { title: "Warden Hollis Vane: Blueprint Clash" };

export default async function MasterPage() {
  const exercise = toExerciseBundle(await loadExercise(OLD_TOWN_MASTER.exercise, EXERCISE_ROOT, EXERCISE_META[OLD_TOWN_MASTER.exercise]), DRIVER);
  return <MasterClient exercise={exercise} />;
}
