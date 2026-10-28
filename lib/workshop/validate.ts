import { PHASE_ORDER, type PhaseId, type WorkshopPackage } from "./types";

export const EDITORIAL_SECTIONS = ["Requirements", "Reference design", "Alternatives", "Trade-offs", "What breaks at 10x", "Level signals"];

/** Phases present in the package (those with requirements), in play order. */
export function activePhases(pkg: WorkshopPackage): PhaseId[] {
  const used = new Set(pkg.meta.requirements.map((r) => r.phase));
  return PHASE_ORDER.filter((p) => p === "base" || used.has(p));
}

const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);

/** Structural checks that need no compiler. Returns human-readable problems (empty when valid). */
export function validatePackage(pkg: WorkshopPackage): string[] {
  const errs: string[] = [];
  const { meta } = pkg;
  const phases = activePhases(pkg);
  const reqIds = meta.requirements.map((r) => r.id);

  if (!pkg.brief.trim()) errs.push("brief.md is empty");
  if (!pkg.apiHeader.includes("#pragma once")) errs.push("api.h must start with #pragma once");
  if (pkg.reference.length === 0) errs.push("reference/ has no files");
  for (const d of dupes(reqIds)) errs.push(`duplicate requirement id ${d}`);
  if (!meta.requirements.some((r) => r.phase === "base")) errs.push("no base-phase requirements");

  for (const p of phases) {
    const files = pkg.tests[p] ?? [];
    if (files.length === 0) errs.push(`tests/${p} has no test files`);
  }

  // Clarification menu: ids unique, references valid, every hidden requirement revealable.
  for (const d of dupes(pkg.clarify.map((q) => q.id))) errs.push(`duplicate clarify id ${d}`);
  for (const q of pkg.clarify) {
    for (const r of q.reveals) if (!reqIds.includes(r)) errs.push(`clarify ${q.id} reveals unknown requirement ${r}`);
    if (q.quality === "noise" && q.reveals.length > 0) errs.push(`clarify ${q.id} is noise but reveals requirements`);
    if (q.quality === "essential" && q.reveals.length === 0) errs.push(`clarify ${q.id} is essential but reveals nothing`);
    if (!q.answer.trim()) errs.push(`clarify ${q.id} has no answer`);
  }
  const revealed = new Set(pkg.clarify.flatMap((q) => q.reveals));
  for (const r of meta.requirements) {
    if (r.hidden && !revealed.has(r.id)) errs.push(`hidden requirement ${r.id} is not revealable by any clarifying question`);
  }
  if (pkg.clarify.filter((q) => q.quality === "noise").length < 2) errs.push("clarify menu needs at least 2 noise questions (distractors)");

  // Rubric: every responsibility is owned by a class the reference declares; every phase is covered.
  for (const d of dupes(pkg.rubric.map((r) => r.id))) errs.push(`duplicate rubric id ${d}`);
  const refText = pkg.reference.map((f) => f.content).join("\n");
  for (const r of pkg.rubric) {
    if (r.owners.length === 0) errs.push(`rubric ${r.id} has no acceptable owners`);
    else if (!r.owners.some((o) => new RegExp(`\\b(class|struct)\\s+${o}\\b`).test(refText))) {
      errs.push(`rubric ${r.id}: reference declares none of ${r.owners.join(", ")}`);
    }
  }
  for (const p of phases) if (!pkg.rubric.some((r) => r.phase === p)) errs.push(`rubric has no responsibility for phase ${p}`);

  // Bad designs: documented, present, and aimed at a real phase.
  for (const b of meta.bad) {
    if (!phases.includes(b.failsPhase)) errs.push(`bad/${b.dir} targets missing phase ${b.failsPhase}`);
    if (!pkg.bad[b.dir] || pkg.bad[b.dir].length === 0) errs.push(`bad/${b.dir} has no files`);
    if (b.failingTests.length === 0) errs.push(`bad/${b.dir} documents no failing test`);
    if (!b.reason.trim()) errs.push(`bad/${b.dir} has no reason`);
  }
  for (const p of phases) {
    if (p !== "base" && !meta.bad.some((b) => b.failsPhase === p)) errs.push(`no bad design documented for ${p}`);
  }
  if (meta.bad.length < 2) errs.push("need at least 2 bad designs");

  for (const s of EDITORIAL_SECTIONS) {
    if (!new RegExp(`^##\\s+${s}\\b`, "mi").test(pkg.editorial)) errs.push(`editorial is missing a "## ${s}" section`);
  }
  if (pkg.followups.length < 3) errs.push("need at least 3 follow-up questions");
  return errs;
}
