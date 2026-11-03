/** A lesson: a short, original, principal-accurate explanation with a C++ before/after pair. Pure data, no DOM. */
export interface Lesson {
  id: string;
  /** Curriculum level, e.g. "L2". */
  level: string;
  title: string;
  /** One sentence the player can say aloud in an interview. */
  oneLiner: string;
  /** Markdown (inline code, bold, lists, headings only). */
  intro: string;
  /** What it looks like when the principle is broken. */
  smell: string;
  /** Compilable, runnable program showing the smell. */
  before: string;
  /** Compilable, runnable program after the refactor. Must pass Senior Review with no blocker or major. */
  after: string;
  /** What changed and why, including the trade-off. */
  refactorNotes: string;
  /** How to spot it, and say it, in a design round. */
  interviewSignal: string;
  /** The cost of applying it too eagerly. */
  overApplication: string;
  /** Card topic prefix to drill afterwards, e.g. "L2.srp". */
  cardTopic: string;
  /** Exact stdout of `before` and `after` (proved by content:verify). */
  beforeOutput: string;
  afterOutput: string;
}

export function validateLessons(lessons: readonly Lesson[]): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const l of lessons) {
    if (seen.has(l.id)) errs.push(`${l.id}: duplicate id`);
    seen.add(l.id);
    for (const k of ["title", "oneLiner", "intro", "smell", "before", "after", "refactorNotes", "interviewSignal", "overApplication", "cardTopic"] as const) {
      if (l[k].trim() === "") errs.push(`${l.id}: empty ${k}`);
    }
    if (l.before.trim() === l.after.trim()) errs.push(`${l.id}: before and after are identical`);
    if (!/\bmain\s*\(/.test(l.before) || !/\bmain\s*\(/.test(l.after)) errs.push(`${l.id}: before/after must be runnable programs`);
    if (l.overApplication.length < 80) errs.push(`${l.id}: over-application cost is too thin`);
  }
  return errs;
}
