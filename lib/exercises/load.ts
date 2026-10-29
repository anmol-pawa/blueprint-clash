// Node-only loader for judged class exercises on disk. Never imported by the app bundle.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { WorkshopFile } from "@/lib/workshop/types";
import type { ExerciseMeta, ExercisePackage } from "./types";

export const EXERCISE_ROOT = join(process.cwd(), "content", "exercises");

async function readDir(dir: string): Promise<WorkshopFile[]> {
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => /\.(h|hpp|cpp|cc)$/.test(n)).sort();
  } catch {
    return [];
  }
  return Promise.all(names.map(async (n) => ({ path: n, content: await readFile(join(dir, n), "utf8") })));
}

export async function listExercises(root = EXERCISE_ROOT): Promise<string[]> {
  const ents = await readdir(root, { withFileTypes: true });
  return ents.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

export async function loadExercise(id: string, root = EXERCISE_ROOT): Promise<ExercisePackage> {
  const dir = join(root, id);
  const { meta } = (await import(/* @vite-ignore */ pathToFileURL(join(dir, "meta.ts")).href)) as { meta: ExerciseMeta };
  const api = await readFile(join(dir, "api.h"), "utf8").catch(() => undefined);
  const wrong: Record<string, WorkshopFile[]> = {};
  for (const w of meta.wrong) wrong[w.dir] = await readDir(join(dir, "wrong", w.dir));
  return {
    meta,
    prompt: await readFile(join(dir, "prompt.md"), "utf8"),
    api,
    starter: await readDir(join(dir, "starter")),
    reference: await readDir(join(dir, "reference")),
    tests: await readDir(join(dir, "tests")),
    wrong,
  };
}
