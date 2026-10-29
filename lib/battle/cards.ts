// Card model for concept battles (GDD 5.1). Pure data + validation; no DOM, no Pixi.

export type CardKind = "mcq" | "pattern" | "smell" | "predict";

export interface CardBase {
  id: string;
  kind: CardKind;
  /** CURRICULUM topic tag, e.g. "L1.raii". */
  topic: string;
  /** 1 = fundamentals, 2 = SDE II, 3 = Senior. */
  level: 1 | 2 | 3;
  prompt: string;
  options: string[];
  /** Indices into `options`. More than one means multi-select (all must be chosen, none extra). */
  answer: number[];
  /** Shown after every answer. Says why the right answer is right and why the tempting one is not. */
  explain: string;
}

export interface McqCard extends CardBase {
  kind: "mcq";
}

/** A scenario to be matched with a Patternling; options are pattern names. */
export interface PatternCard extends CardBase {
  kind: "pattern";
}

/** A C++ snippet; options name the smell and the SOLID principle it breaks. */
export interface SmellCard extends CardBase {
  kind: "smell";
  code: string;
}

/**
 * Predict the output. `code` is a complete program; `output` is what it really prints.
 * The test suite compiles and runs `code` natively and requires stdout === output === options[answer[0]].
 */
export interface PredictCard extends CardBase {
  kind: "predict";
  code: string;
  output: string;
}

export type Card = McqCard | PatternCard | SmellCard | PredictCard;

/** Returns human-readable problems; an empty list means the deck is well-formed. */
export function validateCards(cards: readonly Card[]): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const c of cards) {
    const at = `card ${c.id || "(no id)"}`;
    if (!c.id) errs.push(`${at}: missing id`);
    if (seen.has(c.id)) errs.push(`${at}: duplicate id`);
    seen.add(c.id);
    if (!c.prompt.trim()) errs.push(`${at}: empty prompt`);
    if (!c.explain.trim()) errs.push(`${at}: empty explanation`);
    if (c.options.length < 2) errs.push(`${at}: needs at least 2 options`);
    if (new Set(c.options).size !== c.options.length) errs.push(`${at}: duplicate options`);
    if (c.answer.length === 0) errs.push(`${at}: no answer`);
    if (new Set(c.answer).size !== c.answer.length) errs.push(`${at}: repeated answer index`);
    for (const a of c.answer) if (!Number.isInteger(a) || a < 0 || a >= c.options.length) errs.push(`${at}: answer ${a} out of range`);
    if (c.kind === "smell" && !c.code.trim()) errs.push(`${at}: smell card needs code`);
    if (c.kind === "predict") {
      if (!c.code.trim()) errs.push(`${at}: predict card needs code`);
      if (c.answer.length !== 1) errs.push(`${at}: predict card has exactly one answer`);
      else if (c.options[c.answer[0]] !== c.output) errs.push(`${at}: answer option must equal the recorded output`);
    }
  }
  return errs;
}

/** Order-insensitive exact match of a selection against the answer set. */
export function isCorrect(card: Card, selected: readonly number[]): boolean {
  if (new Set(selected).size !== selected.length) return false;
  return selected.length === card.answer.length && card.answer.every((a) => selected.includes(a));
}
