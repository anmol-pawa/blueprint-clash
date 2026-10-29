// Node only (spawns g++): proves every predict card's recorded output by compiling and running it.
import { compileAndRun } from "@/lib/judge/native";
import type { Card } from "./cards";

export async function verifyPredictCards(cards: readonly Card[]): Promise<string[]> {
  const errs: string[] = [];
  for (const c of cards) {
    if (c.kind !== "predict") continue;
    const r = await compileAndRun(c.code);
    if (!r.ok) errs.push(`${c.id}: does not compile: ${r.stderr.split("\n")[0]}`);
    else if (r.stdout.trimEnd() !== c.output) errs.push(`${c.id}: prints ${JSON.stringify(r.stdout.trimEnd())}, card says ${JSON.stringify(c.output)}`);
  }
  return errs;
}
