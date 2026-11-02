import type { ProjectFile } from "../judge/types";
import type { Finding, Severity } from "./model";
import { parseFile } from "./parse";
import { RULES, buildModel } from "./rules";

export type { Finding, Severity } from "./model";
export { GOD_CLASS_LINES, GOD_CLASS_METHODS } from "./rules";

const ORDER: Record<Severity, number> = { blocker: 0, major: 1, minor: 2 };

export interface ReviewResult {
  findings: Finding[];
  counts: Record<Severity, number>;
  /** Stars need no blocker or major finding (GDD §5.3). */
  clean: boolean;
}

/** Reviews the player's own source files (pass the files they wrote, not the provided API or the hidden driver). */
export function reviewFiles(files: ProjectFile[]): ReviewResult {
  const model = buildModel(files.filter((f) => /\.(h|hpp|cpp|cc)$/.test(f.path)).map((f) => parseFile(f.path, f.content)));
  const findings = RULES.flatMap((r) => r(model)).sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.file.localeCompare(b.file) || a.line - b.line);
  const counts: Record<Severity, number> = { blocker: 0, major: 0, minor: 0 };
  for (const f of findings) counts[f.severity]++;
  return { findings, counts, clean: counts.blocker + counts.major === 0 };
}
