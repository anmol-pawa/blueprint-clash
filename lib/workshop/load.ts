// Node-only loader for Workshop packages on disk. Never imported by the app bundle.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { PHASE_ORDER, type ClarifyQuestion, type FollowUp, type PhaseId, type Responsibility, type WorkshopFile, type WorkshopMeta, type WorkshopPackage } from "./types";

export const WORKSHOP_ROOT = join(process.cwd(), "content", "workshop");

async function readDir(dir: string): Promise<WorkshopFile[]> {
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => /\.(h|hpp|cpp|cc)$/.test(n)).sort();
  } catch {
    return [];
  }
  return Promise.all(names.map(async (n) => ({ path: n, content: await readFile(join(dir, n), "utf8") })));
}

async function importTs<T>(file: string): Promise<T> {
  return import(/* @vite-ignore */ pathToFileURL(file).href) as Promise<T>;
}

export async function listProblems(root = WORKSHOP_ROOT): Promise<string[]> {
  const ents = await readdir(root, { withFileTypes: true });
  return ents.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

export async function loadPackage(id: string, root = WORKSHOP_ROOT): Promise<WorkshopPackage> {
  const dir = join(root, id);
  const meta = (await importTs<{ meta: WorkshopMeta }>(join(dir, "meta.ts"))).meta;
  const clarify = (await importTs<{ clarify: ClarifyQuestion[] }>(join(dir, "clarify.ts"))).clarify;
  const rubric = (await importTs<{ rubric: Responsibility[] }>(join(dir, "rubric.ts"))).rubric;
  const followups = (await importTs<{ followups: FollowUp[] }>(join(dir, "followups.ts"))).followups;
  const tests: Partial<Record<PhaseId, WorkshopFile[]>> = {};
  for (const p of PHASE_ORDER) {
    const files = await readDir(join(dir, "tests", p));
    if (files.length) tests[p] = files;
  }
  const bad: Record<string, WorkshopFile[]> = {};
  for (const b of meta.bad) bad[b.dir] = await readDir(join(dir, "bad", b.dir));
  return {
    meta,
    brief: await readFile(join(dir, "brief.md"), "utf8"),
    editorial: await readFile(join(dir, "editorial.md"), "utf8"),
    clarify,
    rubric,
    followups,
    apiHeader: await readFile(join(dir, "api.h"), "utf8"),
    reference: await readDir(join(dir, "reference")),
    tests,
    bad,
  };
}
