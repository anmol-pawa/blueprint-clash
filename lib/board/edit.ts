/** Immutable edit operations for the Design Board UI. Pure, so every interaction is unit-tested without a DOM. */
import type { Board, BoardClass, BoardEdge, BoardField, BoardMethod, ClassKind, EdgeKind } from "./model";

export interface Pos {
  x: number;
  y: number;
}
export type Layout = Record<string, Pos>;

export const CLASS_W = 190;
export const ROW_H = 16;
export const HEAD_H = 34;

let counter = 0;
export const nextId = (prefix: string): string => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

const KIND_NAME: Record<ClassKind, string> = { class: "NewClass", abstract: "NewBase", interface: "INewThing", enum: "NewEnum" };

/** A name not used by any class yet: `Thing`, `Thing2`, `Thing3`... */
export function uniqueName(board: Board, base: string): string {
  const used = new Set(board.classes.map((c) => c.name));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}

export function addClass(board: Board, kind: ClassKind, id: string, name?: string): Board {
  const c: BoardClass = { id, name: uniqueName(board, name ?? KIND_NAME[kind]), kind, fields: [], methods: [], responsibilities: [] };
  return { ...board, classes: [...board.classes, c] };
}

export function updateClass(board: Board, id: string, patch: Partial<Omit<BoardClass, "id">>): Board {
  return { ...board, classes: board.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
}

/** Changing kind keeps members, but an interface's methods become pure virtual. */
export function setKind(board: Board, id: string, kind: ClassKind): Board {
  return {
    ...board,
    classes: board.classes.map((c) =>
      c.id !== id ? c : { ...c, kind, methods: kind === "interface" ? c.methods.map((m) => ({ ...m, isAbstract: true })) : c.methods },
    ),
  };
}

export function removeClass(board: Board, id: string): Board {
  return { classes: board.classes.filter((c) => c.id !== id), edges: board.edges.filter((e) => e.from !== id && e.to !== id) };
}

export function addField(board: Board, id: string, field: BoardField): Board {
  return updateClass(board, id, { fields: [...(board.classes.find((c) => c.id === id)?.fields ?? []), field] });
}
export function removeField(board: Board, id: string, index: number): Board {
  const c = board.classes.find((x) => x.id === id);
  return c ? updateClass(board, id, { fields: c.fields.filter((_, i) => i !== index) }) : board;
}
export function addMethod(board: Board, id: string, method: BoardMethod): Board {
  const c = board.classes.find((x) => x.id === id);
  if (!c) return board;
  const m = c.kind === "interface" ? { ...method, isAbstract: true } : method;
  return updateClass(board, id, { methods: [...c.methods, m] });
}
export function removeMethod(board: Board, id: string, index: number): Board {
  const c = board.classes.find((x) => x.id === id);
  return c ? updateClass(board, id, { methods: c.methods.filter((_, i) => i !== index) }) : board;
}

/** Toggles a rubric responsibility tag on a class. */
export function toggleResponsibility(board: Board, id: string, resId: string): Board {
  const c = board.classes.find((x) => x.id === id);
  if (!c) return board;
  const has = c.responsibilities.includes(resId);
  return updateClass(board, id, { responsibilities: has ? c.responsibilities.filter((r) => r !== resId) : [...c.responsibilities, resId] });
}

/** Adds a relationship unless an identical one (same ends and kind) exists. Sensible default multiplicities for ownership. */
export function addEdge(board: Board, from: string, to: string, kind: EdgeKind, id: string): Board {
  if (!board.classes.some((c) => c.id === from) || !board.classes.some((c) => c.id === to)) return board;
  if (board.edges.some((e) => e.from === from && e.to === to && e.kind === kind)) return board;
  const owns = kind === "composition" || kind === "aggregation" || kind === "association";
  const edge: BoardEdge = { id, from, to, kind, ...(owns ? { fromMult: "1", toMult: "*" } : {}) };
  return { ...board, edges: [...board.edges, edge] };
}
export function updateEdge(board: Board, id: string, patch: Partial<Omit<BoardEdge, "id">>): Board {
  return { ...board, edges: board.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
}
export function removeEdge(board: Board, id: string): Board {
  return { ...board, edges: board.edges.filter((e) => e.id !== id) };
}

export function classHeight(c: BoardClass): number {
  return HEAD_H + Math.max(1, c.fields.length) * ROW_H + Math.max(1, c.methods.length) * ROW_H + 8;
}

/** Positions for classes that have none yet: a left-to-right grid that wraps, never overlapping. */
export function ensureLayout(board: Board, layout: Layout, width = 900): Layout {
  const out: Layout = { ...layout };
  const gap = 30;
  let x = 20;
  let y = 20;
  let rowH = 0;
  for (const c of board.classes) {
    if (out[c.id]) continue;
    if (x + CLASS_W > width) {
      x = 20;
      y += rowH + gap;
      rowH = 0;
    }
    out[c.id] = { x, y };
    x += CLASS_W + gap;
    rowH = Math.max(rowH, classHeight(c));
  }
  return out;
}

export const clampPos = (p: Pos, width: number, height: number): Pos => ({
  x: Math.min(Math.max(0, p.x), width - CLASS_W),
  y: Math.min(Math.max(0, p.y), height - 60),
});

/** One-line UML text for a member. */
export const fieldText = (f: BoardField): string => `- ${f.name}: ${f.type}`;
export const methodText = (m: BoardMethod): string => `+ ${m.name}(${m.params})${m.returns ? `: ${m.returns}` : ""}${m.isConst ? " const" : ""}${m.isAbstract ? " = 0" : ""}`;

/** Point where the segment from the centre of `box` toward `target` leaves the box. */
export function edgeAnchor(pos: Pos, h: number, target: Pos, targetH: number): Pos {
  const cx = pos.x + CLASS_W / 2;
  const cy = pos.y + h / 2;
  const tx = target.x + CLASS_W / 2;
  const ty = target.y + targetH / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: pos.y };
  const sx = dx === 0 ? Infinity : CLASS_W / 2 / Math.abs(dx);
  const sy = dy === 0 ? Infinity : h / 2 / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}
