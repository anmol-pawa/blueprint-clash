import type { ProjectFile } from "./types";

const PATH_RE = /^(?:[A-Za-z0-9_-]+\/)?[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_]+)?$/;
const SOURCE_EXT = /\.(cpp|cc|cxx)$/;
const HEADER_EXT = /\.(h|hpp|hh)$/;

/** Returns an error message, or null when the path is acceptable for a user file. */
export function validatePath(path: string): string | null {
  if (path.includes("..") || path.startsWith("/")) return "Paths cannot escape the project.";
  if (!PATH_RE.test(path)) return "Use letters, digits, _ and - (one folder deep at most).";
  if (!SOURCE_EXT.test(path) && !HEADER_EXT.test(path)) return "Only .h, .hpp, .cpp and .cc files are allowed.";
  return null;
}

export function isSource(path: string): boolean {
  return SOURCE_EXT.test(path);
}

export function isHeader(path: string): boolean {
  return HEADER_EXT.test(path);
}

/** Merges the player's files over the problem's, refusing to let the player replace read-only files. */
export function mergeProject(provided: ProjectFile[], user: ProjectFile[]): ProjectFile[] {
  const locked = new Set(provided.filter((f) => f.readOnly).map((f) => f.path));
  const out = new Map<string, ProjectFile>();
  for (const f of provided) out.set(f.path, f);
  for (const f of user) {
    const err = validatePath(f.path);
    if (err) throw new Error(`${f.path}: ${err}`);
    if (locked.has(f.path)) throw new Error(`${f.path} is read-only.`);
    out.set(f.path, { ...f, readOnly: false });
  }
  return [...out.values()];
}

/** The translation units to compile and link, in a stable order. */
export function translationUnits(files: ProjectFile[]): string[] {
  return files.filter((f) => isSource(f.path)).map((f) => f.path).sort();
}
