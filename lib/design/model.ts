// The Design Board model (GDD §5.3 step 2): UML classes, members, relationships, responsibility tags.
// Pure and immutable: every operation returns a new board or an error, so the UI can undo/redo by keeping snapshots.

export type ClassKind = "class" | "abstract" | "interface" | "enum";
export type Visibility = "public" | "protected" | "private";
export type RelationKind = "inherits" | "implements" | "composition" | "aggregation" | "association" | "dependency";

export interface Member {
  name: string;
  /** Field type, or return type for methods. */
  type: string;
  visibility: Visibility;
  /** Methods only: the parameter list as written, e.g. `const Vehicle& v`. */
  params?: string;
  isConst?: boolean;
  isStatic?: boolean;
}

export interface DesignClass {
  id: string;
  name: string;
  kind: ClassKind;
  fields: Member[];
  methods: Member[];
}

export interface Relation {
  id: string;
  kind: RelationKind;
  /** The owner / subclass / client side. */
  from: string;
  /** The owned / base / supplier side. */
  to: string;
  /** Multiplicity at the `to` end, e.g. `1`, `0..1`, `*`, `1..*`. Only meaningful for ownership-like kinds. */
  multiplicity: string;
  label: string;
}

export interface Board {
  classes: DesignClass[];
  relations: Relation[];
  /** Responsibility id -> ids of the classes the player tagged with it. Exactly one is the goal. */
  tags: Record<string, string[]>;
  nextId: number;
}

export type Result<T> = { ok: true; board: Board; value: T } | { ok: false; error: string };

const KEYWORDS = new Set([
  "alignas", "alignof", "and", "auto", "bool", "break", "case", "catch", "char", "class", "const", "constexpr", "continue",
  "decltype", "default", "delete", "do", "double", "else", "enum", "explicit", "export", "extern", "false", "float", "for",
  "friend", "goto", "if", "inline", "int", "long", "mutable", "namespace", "new", "noexcept", "not", "nullptr", "operator",
  "or", "private", "protected", "public", "register", "return", "short", "signed", "sizeof", "static", "struct", "switch",
  "template", "this", "throw", "true", "try", "typedef", "typeid", "typename", "union", "unsigned", "using", "virtual",
  "void", "volatile", "while",
]);

export function isIdentifier(s: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s) && !KEYWORDS.has(s);
}

/** A conservative C++ type spelling: names, `::`, templates, `*`, `&`, `const`. */
export function isTypeSpelling(s: string): boolean {
  const t = s.trim();
  if (!t || t.length > 80 || !/^[A-Za-z_][\w:<>,\s*&]*$/.test(t)) return false;
  let depth = 0;
  for (const c of t) {
    if (c === "<") depth++;
    if (c === ">") depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

export function isMultiplicity(s: string): boolean {
  return /^(\d+|\*)(\.\.(\d+|\*))?$/.test(s);
}

export function emptyBoard(): Board {
  return { classes: [], relations: [], tags: {}, nextId: 1 };
}

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export function findClass(board: Board, id: string): DesignClass | undefined {
  return board.classes.find((c) => c.id === id);
}

function replaceClass(board: Board, cls: DesignClass): Board {
  return { ...board, classes: board.classes.map((c) => (c.id === cls.id ? cls : c)) };
}

export function addClass(board: Board, name: string, kind: ClassKind = "class"): Result<string> {
  if (!isIdentifier(name)) return fail(`"${name}" is not a valid C++ class name`);
  if (board.classes.some((c) => c.name === name)) return fail(`A type named ${name} already exists`);
  const id = `c${board.nextId}`;
  const cls: DesignClass = { id, name, kind, fields: [], methods: [] };
  return { ok: true, board: { ...board, classes: [...board.classes, cls], nextId: board.nextId + 1 }, value: id };
}

export function renameClass(board: Board, id: string, name: string): Result<string> {
  const cls = findClass(board, id);
  if (!cls) return fail("No such class");
  if (!isIdentifier(name)) return fail(`"${name}" is not a valid C++ class name`);
  if (board.classes.some((c) => c.name === name && c.id !== id)) return fail(`A type named ${name} already exists`);
  return { ok: true, board: replaceClass(board, { ...cls, name }), value: id };
}

export function setKind(board: Board, id: string, kind: ClassKind): Result<string> {
  const cls = findClass(board, id);
  if (!cls) return fail("No such class");
  if (kind === "enum" && board.relations.some((r) => r.from === id && r.kind !== "dependency")) {
    return fail("An enum cannot own, inherit from or implement anything");
  }
  return { ok: true, board: replaceClass(board, { ...cls, kind }), value: id };
}

export function removeClass(board: Board, id: string): Result<string> {
  if (!findClass(board, id)) return fail("No such class");
  const tags: Record<string, string[]> = {};
  for (const [res, ids] of Object.entries(board.tags)) {
    const kept = ids.filter((x) => x !== id);
    if (kept.length) tags[res] = kept;
  }
  return {
    ok: true,
    board: {
      ...board,
      classes: board.classes.filter((c) => c.id !== id),
      relations: board.relations.filter((r) => r.from !== id && r.to !== id),
      tags,
    },
    value: id,
  };
}

export function addMember(board: Board, classId: string, which: "field" | "method", member: Member): Result<string> {
  const cls = findClass(board, classId);
  if (!cls) return fail("No such class");
  if (!isIdentifier(member.name)) return fail(`"${member.name}" is not a valid member name`);
  if (!isTypeSpelling(member.type)) return fail(`"${member.type}" is not a valid type`);
  if (which === "field" && cls.kind === "interface") return fail("An interface has no fields");
  if (cls.kind === "enum" && which === "method") return fail("An enum has values, not methods");
  const list = which === "field" ? cls.fields : cls.methods;
  if (which === "field" && list.some((m) => m.name === member.name)) return fail(`${cls.name} already has a field ${member.name}`);
  const params = which === "method" ? (member.params ?? "").trim() : undefined;
  if (params && !/^[\w:<>,\s*&=]+$/.test(params)) return fail("Parameter list contains unsupported characters");
  if (which === "method" && list.some((m) => m.name === member.name && (m.params ?? "") === params)) {
    return fail(`${cls.name} already has ${member.name}(${params})`);
  }
  const next = { ...member, params };
  const updated = which === "field" ? { ...cls, fields: [...cls.fields, next] } : { ...cls, methods: [...cls.methods, next] };
  return { ok: true, board: replaceClass(board, updated), value: member.name };
}

export function removeMember(board: Board, classId: string, which: "field" | "method", index: number): Result<string> {
  const cls = findClass(board, classId);
  if (!cls) return fail("No such class");
  const list = which === "field" ? cls.fields : cls.methods;
  if (index < 0 || index >= list.length) return fail("No such member");
  const kept = list.filter((_, i) => i !== index);
  const updated = which === "field" ? { ...cls, fields: kept } : { ...cls, methods: kept };
  return { ok: true, board: replaceClass(board, updated), value: list[index].name };
}

const OWNERSHIP: RelationKind[] = ["composition", "aggregation", "association"];

/** True if following `inherits`/`implements` edges from `start` reaches `target`. */
function reachesBySuper(board: Board, start: string, target: string): boolean {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop() as string;
    if (cur === target) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const r of board.relations) if (r.from === cur && (r.kind === "inherits" || r.kind === "implements")) stack.push(r.to);
  }
  return false;
}

export function addRelation(
  board: Board,
  kind: RelationKind,
  from: string,
  to: string,
  opts: { multiplicity?: string; label?: string } = {},
): Result<string> {
  const a = findClass(board, from);
  const b = findClass(board, to);
  if (!a || !b) return fail("Both ends of a relationship must be classes on the board");
  const multiplicity = opts.multiplicity ?? (OWNERSHIP.includes(kind) ? "1" : "");
  if (multiplicity && !isMultiplicity(multiplicity)) return fail(`"${multiplicity}" is not a multiplicity like 1, 0..1, * or 1..*`);
  if (a.kind === "enum" && kind !== "dependency") return fail("An enum cannot own, inherit from or implement anything");
  if (from === to && (kind === "inherits" || kind === "implements" || kind === "composition")) {
    return fail(`A class cannot ${kind === "composition" ? "contain itself by value" : "extend itself"}`);
  }
  if (kind === "implements" && b.kind !== "interface") return fail("`implements` must point at an interface");
  if (kind === "inherits") {
    if (b.kind === "interface") return fail("Use `implements` for an interface");
    if (b.kind === "enum") return fail("Nothing inherits from an enum");
    if (reachesBySuper(board, to, from)) return fail("That would make an inheritance cycle");
  }
  if (kind === "implements" && reachesBySuper(board, to, from)) return fail("That would make an inheritance cycle");
  if (board.relations.some((r) => r.kind === kind && r.from === from && r.to === to)) return fail("That relationship already exists");
  const id = `r${board.nextId}`;
  const rel: Relation = { id, kind, from, to, multiplicity, label: opts.label ?? "" };
  return { ok: true, board: { ...board, relations: [...board.relations, rel], nextId: board.nextId + 1 }, value: id };
}

export function removeRelation(board: Board, id: string): Result<string> {
  if (!board.relations.some((r) => r.id === id)) return fail("No such relationship");
  return { ok: true, board: { ...board, relations: board.relations.filter((r) => r.id !== id) }, value: id };
}

/** Toggles a responsibility tag on a class. Tagging a second class is allowed (it is flagged as a duplicate by the scorer). */
export function toggleTag(board: Board, responsibilityId: string, classId: string): Result<boolean> {
  if (!findClass(board, classId)) return fail("No such class");
  const cur = board.tags[responsibilityId] ?? [];
  const has = cur.includes(classId);
  const next = has ? cur.filter((x) => x !== classId) : [...cur, classId];
  const tags = { ...board.tags };
  if (next.length) tags[responsibilityId] = next;
  else delete tags[responsibilityId];
  return { ok: true, board: { ...board, tags }, value: !has };
}

export interface BoardIssue {
  severity: "error" | "warning";
  message: string;
}

/** Structural checks that do not depend on a rubric. */
export function validateBoard(board: Board): BoardIssue[] {
  const issues: BoardIssue[] = [];
  const ids = new Set(board.classes.map((c) => c.id));
  for (const r of board.relations) {
    if (!ids.has(r.from) || !ids.has(r.to)) issues.push({ severity: "error", message: `Relationship ${r.id} points at a missing class` });
  }
  for (const [res, tagged] of Object.entries(board.tags)) {
    for (const t of tagged) if (!ids.has(t)) issues.push({ severity: "error", message: `Tag ${res} points at a missing class` });
  }
  for (const c of board.classes) {
    if (c.kind === "interface" && c.methods.length === 0) issues.push({ severity: "warning", message: `Interface ${c.name} has no methods` });
    if (c.kind === "class" && c.methods.length === 0 && c.fields.length === 0) {
      issues.push({ severity: "warning", message: `${c.name} is empty: what does it know or do?` });
    }
    if (c.methods.length > 12) issues.push({ severity: "warning", message: `${c.name} has ${c.methods.length} methods: a god class?` });
  }
  return issues;
}
