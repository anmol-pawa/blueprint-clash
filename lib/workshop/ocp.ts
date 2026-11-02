import type { WorkshopFile } from "./types";

/**
 * Open/Closed proxy (GDD §5.3).
 *
 * OCP = added / (added + touched), measured across the files that existed before the storm:
 *  - added   = lines of brand-new files + lines inserted in existing files that do not replace a removed line
 *  - touched = pre-existing lines that were modified or deleted (a modified line is one delete + one insert,
 *              and counts once, as touched), including every line of a deleted file
 * Blank lines and indentation changes are ignored. The unit is the line, and a "unit" is the file, so the
 * score is an honest but coarse proxy: it cannot see that a rewritten method belongs to a new class.
 */
export interface OcpResult {
  added: number;
  touched: number;
  /** 1 when nothing changed at all (check `changed`). */
  score: number;
  changed: boolean;
  perFile: { path: string; added: number; touched: number; status: "new" | "deleted" | "edited" | "same" }[];
}

const normalise = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter((l) => l.length > 0);

/** Hunks of an LCS line diff: for every maximal run of changes, how many old lines were removed and new lines inserted. */
export function lineHunks(before: string[], after: string[]): { removed: number; inserted: number }[] {
  const n = before.length;
  const m = after.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = before[i] === after[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const hunks: { removed: number; inserted: number }[] = [];
  let removed = 0;
  let inserted = 0;
  const flush = () => {
    if (removed || inserted) hunks.push({ removed, inserted });
    removed = 0;
    inserted = 0;
  };
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && before[i] === after[j]) {
      flush();
      i++;
      j++;
    } else if (j < m && (i >= n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      inserted++;
      j++;
    } else {
      removed++;
      i++;
    }
  }
  flush();
  return hunks;
}

export function ocpScore(before: WorkshopFile[], after: WorkshopFile[]): OcpResult {
  const b = new Map(before.map((f) => [f.path, normalise(f.content)]));
  const a = new Map(after.map((f) => [f.path, normalise(f.content)]));
  const paths = [...new Set([...b.keys(), ...a.keys()])].sort();
  const perFile: OcpResult["perFile"] = [];
  let added = 0;
  let touched = 0;
  for (const path of paths) {
    const old = b.get(path);
    const now = a.get(path);
    if (!old && now) {
      added += now.length;
      perFile.push({ path, added: now.length, touched: 0, status: "new" });
    } else if (old && !now) {
      touched += old.length;
      perFile.push({ path, added: 0, touched: old.length, status: "deleted" });
    } else if (old && now) {
      let fa = 0;
      let ft = 0;
      for (const h of lineHunks(old, now)) {
        const replaced = Math.min(h.removed, h.inserted);
        ft += h.removed;
        fa += h.inserted - replaced;
      }
      added += fa;
      touched += ft;
      perFile.push({ path, added: fa, touched: ft, status: fa || ft ? "edited" : "same" });
    }
  }
  const total = added + touched;
  return { added, touched, score: total === 0 ? 1 : added / total, changed: total > 0, perFile };
}
