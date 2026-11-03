import type { Severity } from "./model";
import type { ReviewResult } from "./index";

/** Points a finding costs out of 1.0. Three blockers or five majors empty the bar; minors only nibble. */
export const SEVERITY_COST: Record<Severity, number> = { blocker: 0.34, major: 0.2, minor: 0.05 };

/** 0..1 Senior Review score (the 15 % review weight in `workshopScore`). */
export function reviewScore(counts: ReviewResult["counts"]): number {
  const cost = (Object.keys(SEVERITY_COST) as Severity[]).reduce((s, k) => s + SEVERITY_COST[k] * counts[k], 0);
  return Math.max(0, 1 - cost);
}

/** Provided API headers (`api.h`, `api_storm1.h`) belong to the problem, not the player. */
export const isProvidedHeader = (path: string): boolean => /^api(_[\w-]+)?\.h$/.test(path.split("/").pop() ?? path);
