/** Design Board model (GDD §5.3 step 2): a small UML class diagram. Pure data, no DOM. */

export type ClassKind = "class" | "abstract" | "interface" | "enum";
export type EdgeKind = "inherits" | "implements" | "composition" | "aggregation" | "association" | "dependency";

export interface BoardField {
  name: string;
  type: string;
}

export interface BoardMethod {
  name: string;
  returns: string;
  /** Parameter list as written in C++, e.g. `const Vehicle& v, int hours`. */
  params: string;
  isConst: boolean;
  /** Pure virtual in an abstract class; always true for interface methods. */
  isAbstract: boolean;
}

export interface BoardClass {
  id: string;
  name: string;
  kind: ClassKind;
  fields: BoardField[];
  methods: BoardMethod[];
  /** Rubric responsibility ids the player tagged on this class. */
  responsibilities: string[];
}

export interface BoardEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  /** Multiplicity at each end: "1", "0..1", "*", "1..*" or "n". Empty means unspecified. */
  fromMult?: string;
  toMult?: string;
  label?: string;
}

export interface Board {
  classes: BoardClass[];
  edges: BoardEdge[];
}

export const EMPTY_BOARD: Board = { classes: [], edges: [] };

const MULT = /^(\d+|\*|n)(\.\.(\d+|\*|n))?$/;
export function isValidMultiplicity(m: string | undefined): boolean {
  return m === undefined || m === "" || MULT.test(m);
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
export function isValidIdentifier(name: string): boolean {
  return IDENT.test(name);
}

export interface BoardIssue {
  severity: "error" | "warning";
  message: string;
  target?: string;
}

/** Structural checks that do not depend on a rubric. Errors block skeleton export. */
export function validateBoard(board: Board): BoardIssue[] {
  const issues: BoardIssue[] = [];
  const byId = new Map(board.classes.map((c) => [c.id, c]));
  const seenNames = new Set<string>();
  for (const c of board.classes) {
    if (!isValidIdentifier(c.name)) issues.push({ severity: "error", message: `"${c.name}" is not a valid C++ name`, target: c.id });
    if (seenNames.has(c.name)) issues.push({ severity: "error", message: `Two classes are called ${c.name}`, target: c.id });
    seenNames.add(c.name);
    if (c.kind === "interface" && c.fields.length > 0) {
      issues.push({ severity: "warning", message: `Interface ${c.name} has fields; interfaces usually carry behaviour only`, target: c.id });
    }
    if (c.kind === "interface" && c.methods.some((m) => !m.isAbstract)) {
      issues.push({ severity: "error", message: `Interface ${c.name} has a method that is not pure virtual`, target: c.id });
    }
  }
  for (const e of board.edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) {
      issues.push({ severity: "error", message: "A relationship points at a class that no longer exists", target: e.id });
      continue;
    }
    if (a === b && (e.kind === "inherits" || e.kind === "implements" || e.kind === "composition")) {
      issues.push({ severity: "error", message: `${a.name} cannot ${e.kind} itself`, target: e.id });
    }
    if (e.kind === "implements" && b.kind !== "interface" && b.kind !== "abstract") {
      issues.push({ severity: "error", message: `${a.name} implements ${b.name}, which is neither an interface nor abstract`, target: e.id });
    }
    if (e.kind === "inherits" && (b.kind === "enum" || a.kind === "enum")) {
      issues.push({ severity: "error", message: "Enums cannot take part in inheritance", target: e.id });
    }
    if (!isValidMultiplicity(e.fromMult) || !isValidMultiplicity(e.toMult)) {
      issues.push({ severity: "error", message: `Bad multiplicity on ${a.name} -> ${b.name} (use 1, 0..1, *, 1..*)`, target: e.id });
    }
  }
  const cycle = findInheritanceCycle(board);
  if (cycle) issues.push({ severity: "error", message: `Inheritance cycle: ${cycle.join(" -> ")}` });
  return issues;
}

/** Returns class names along one inheritance cycle, or null. */
export function findInheritanceCycle(board: Board): string[] | null {
  const names = new Map(board.classes.map((c) => [c.id, c.name]));
  const next = new Map<string, string[]>();
  for (const e of board.edges) {
    if (e.kind !== "inherits" && e.kind !== "implements") continue;
    if (!names.has(e.from) || !names.has(e.to)) continue;
    next.set(e.from, [...(next.get(e.from) ?? []), e.to]);
  }
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    state.set(id, 1);
    stack.push(id);
    for (const n of next.get(id) ?? []) {
      if (state.get(n) === 1) return [...stack.slice(stack.indexOf(n)), n].map((x) => names.get(x)!);
      if (!state.has(n)) {
        const r = visit(n);
        if (r) return r;
      }
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const c of board.classes) {
    if (!state.has(c.id)) {
      const r = visit(c.id);
      if (r) return r;
    }
  }
  return null;
}
