import type { Diagnostic, Severity } from "./types";

// clang/gcc: /work/src/store.cpp:12:5: error: message
const LINE_RE = /^(.+?):(\d+):(?:(\d+):)?\s*(fatal error|error|warning|note):\s*(.*)$/;

/**
 * Parses compiler stderr into diagnostics. Paths under `root` are made project-relative;
 * diagnostics in files outside the project (system headers) are kept with their raw path.
 * Continuation lines (source excerpts, carets) are dropped.
 */
export function parseDiagnostics(stderr: string, root = "/work/"): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const raw of stderr.split(/\r?\n/)) {
    const m = LINE_RE.exec(raw);
    if (!m) continue;
    const file = m[1].startsWith(root) ? m[1].slice(root.length) : m[1];
    const severity: Severity = m[4] === "fatal error" ? "error" : (m[4] as Severity);
    out.push({ file, line: Number(m[2]), col: m[3] ? Number(m[3]) : 1, severity, message: m[5] });
  }
  return out;
}

export function hasErrors(diags: Diagnostic[]): boolean {
  return diags.some((d) => d.severity === "error");
}

/** Only the diagnostics a player can act on: in user-editable files, notes folded into their error. */
export function playerFacing(diags: Diagnostic[], editable: Set<string>): Diagnostic[] {
  return diags.filter((d) => d.severity !== "note" && editable.has(d.file));
}
