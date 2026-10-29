import type { Card, PredictCard, PredictSource } from "./types";

/** Builds predict cards from sources and the outputs produced by running them natively.
 *  Throws if an output is missing, so a stale generated file can never ship a wrong answer. */
export function buildPredictCards(sources: readonly PredictSource[], outputs: Readonly<Record<string, string>>): PredictCard[] {
  return sources.map((s) => {
    const out = outputs[s.id];
    if (out === undefined) throw new Error(`no generated output for predict card ${s.id}`);
    const correct = out.trimEnd();
    return { id: s.id, kind: "predict", topic: s.topic, code: s.code, options: [correct, ...s.distractors], answer: 0, explain: s.explain };
  });
}

/** Structural problems with a deck: empty prompts, bad indices, duplicate options or ids. */
export function validateDeck(cards: readonly Card[]): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const c of cards) {
    const at = `card ${c.id}`;
    if (ids.has(c.id)) errs.push(`${at}: duplicate id`);
    ids.add(c.id);
    if (!c.explain.trim()) errs.push(`${at}: empty explanation`);
    if (c.options.length < 3 || c.options.length > 5) errs.push(`${at}: needs 3-5 options`);
    if (new Set(c.options.map((o) => o.trim())).size !== c.options.length) errs.push(`${at}: duplicate options`);
    const indices = c.kind === "multi" ? c.answers : [c.answer];
    if (indices.length === 0 || indices.some((i) => !Number.isInteger(i) || i < 0 || i >= c.options.length)) errs.push(`${at}: answer index out of range`);
    if (c.kind === "multi" && (new Set(c.answers).size !== c.answers.length || c.answers.length >= c.options.length)) errs.push(`${at}: bad multi answer set`);
  }
  return errs;
}
