import type { Board, BoardClass, BoardEdge, ClassKind, EdgeKind } from "./model";

/** Draft persistence for the Design Board (pure; the component owns storage). Tolerant parse: anything malformed yields null. */
export const boardStorageKey = (problemId: string) => `blueprint-clash:board:${problemId}`;

const CLASS_KINDS: ClassKind[] = ["class", "abstract", "interface", "enum"];
const EDGE_KINDS: EdgeKind[] = ["inherits", "implements", "composition", "aggregation", "association", "dependency"];
const str = (v: unknown): v is string => typeof v === "string";
const optStr = (v: unknown) => (str(v) ? v : undefined);

export function serializeBoard(board: Board): string {
  return JSON.stringify({ v: 1, board });
}

export function parseBoard(raw: string | null | undefined): Board | null {
  if (!raw) return null;
  try {
    const b = (JSON.parse(raw) as { board?: { classes?: unknown; edges?: unknown } }).board;
    if (!b || !Array.isArray(b.classes) || !Array.isArray(b.edges)) return null;
    const classes: BoardClass[] = [];
    for (const c of b.classes as Record<string, unknown>[]) {
      if (!c || !str(c.id) || !str(c.name) || !CLASS_KINDS.includes(c.kind as ClassKind)) return null;
      if (!Array.isArray(c.fields) || !Array.isArray(c.methods) || !Array.isArray(c.responsibilities)) return null;
      const fields = (c.fields as Record<string, unknown>[]).filter((f) => f && str(f.name) && str(f.type)).map((f) => ({ name: f.name as string, type: f.type as string }));
      const methods = (c.methods as Record<string, unknown>[])
        .filter((m) => m && str(m.name) && str(m.returns) && str(m.params))
        .map((m) => ({ name: m.name as string, returns: m.returns as string, params: m.params as string, isConst: m.isConst === true, isAbstract: m.isAbstract === true }));
      classes.push({ id: c.id, name: c.name, kind: c.kind as ClassKind, fields, methods, responsibilities: (c.responsibilities as unknown[]).filter(str) });
    }
    const ids = new Set(classes.map((c) => c.id));
    const edges: BoardEdge[] = [];
    for (const e of b.edges as Record<string, unknown>[]) {
      if (!e || !str(e.id) || !str(e.from) || !str(e.to) || !EDGE_KINDS.includes(e.kind as EdgeKind)) return null;
      if (!ids.has(e.from) || !ids.has(e.to)) continue; // drop dangling edges rather than reject the whole draft
      edges.push({ id: e.id, from: e.from, to: e.to, kind: e.kind as EdgeKind, fromMult: optStr(e.fromMult), toMult: optStr(e.toMult), label: optStr(e.label) });
    }
    return { classes, edges };
  } catch {
    return null;
  }
}

/** All skeleton headers in one downloadable text (a browser download of many files needs a zip; one file avoids that dependency). */
export function joinSkeleton(files: { path: string; content: string }[]): string {
  return files.map((f) => `// ===== ${f.path} =====\n${f.content}`).join("\n");
}
