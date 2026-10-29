import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { buildPredictCards, validateDeck } from "@/lib/battle/deck";
import { OLD_TOWN_CARDS } from "../cards/cards";
import { PREDICT_SOURCES } from "../cards/predict-sources";

const run = promisify(execFile);
const GENERATED = join(process.cwd(), "content/cards/predict.generated.json");

async function runNative(code: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bp-predict-"));
  try {
    await writeFile(join(dir, "main.cpp"), code);
    await run("g++", ["-std=c++20", "-Wall", "-Wextra", "-fsanitize=address,undefined", "-fno-sanitize-recover=all", join(dir, "main.cpp"), "-o", join(dir, "a.out")]);
    const { stdout } = await run(join(dir, "a.out"), [], { timeout: 10000 });
    return stdout;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("predict-behaviour cards", () => {
  it("every recorded answer equals what the program really prints (sanitizer-clean)", async () => {
    const actual: Record<string, string> = {};
    for (const s of PREDICT_SOURCES) actual[s.id] = (await runNative(s.code)).trimEnd();
    if (process.env.GEN_PREDICT === "1") await writeFile(GENERATED, JSON.stringify(actual, null, 2) + "\n");
    const recorded = JSON.parse(await readFile(GENERATED, "utf8")) as Record<string, string>;
    expect(recorded).toEqual(actual);
  });

  it("distractors never equal the real output, and the deck is well formed", async () => {
    const recorded = JSON.parse(await readFile(GENERATED, "utf8")) as Record<string, string>;
    for (const s of PREDICT_SOURCES) expect(s.distractors.map((d) => d.trimEnd())).not.toContain(recorded[s.id].trimEnd());
    expect(validateDeck([...OLD_TOWN_CARDS, ...buildPredictCards(PREDICT_SOURCES, recorded)])).toEqual([]);
  });
});
