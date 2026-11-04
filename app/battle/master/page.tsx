import { MASTERS } from "@/content/masters";
import { EXERCISE_META } from "@/content/exercises/registry";
import { EXERCISE_ROOT, loadExercise } from "@/lib/exercises/load";
import { toExerciseBundle, type ExerciseBundle } from "@/lib/exercises/bundle";
import { DRIVER } from "@/lib/judge/native";
import { MasterClient } from "./MasterClient";

export const metadata = { title: "District master: Blueprint Clash" };

export default async function MasterPage() {
  // Every master's phase-2 exercises, keyed by master id (the client picks one from `?master=`).
  const exercises: Record<string, ExerciseBundle[]> = {};
  for (const [id, m] of Object.entries(MASTERS)) {
    exercises[id] = await Promise.all(m.profile.exercises.map(async (e) => toExerciseBundle(await loadExercise(e, EXERCISE_ROOT, EXERCISE_META[e]), DRIVER)));
  }
  return <MasterClient exercises={exercises} />;
}
