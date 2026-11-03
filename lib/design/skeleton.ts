import type { WorkshopFile } from "@/lib/workshop/types";
import type { Board, DesignClass, Member, Relation } from "./model";

const STD_INCLUDES: [RegExp, string][] = [
  [/\bstd::string\b/, "<string>"],
  [/\bstd::vector\b/, "<vector>"],
  [/\bstd::unique_ptr\b|\bstd::shared_ptr\b/, "<memory>"],
  [/\bstd::optional\b/, "<optional>"],
  [/\bstd::map\b/, "<map>"],
  [/\bstd::unordered_map\b/, "<unordered_map>"],
  [/\bstd::function\b/, "<functional>"],
  [/\bstd::(int|uint)\d+_t\b/, "<cstdint>"],
];

export const snake = (name: string): string =>
  name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").toLowerCase();

const many = (m: string): boolean => m === "*" || m.endsWith("..*") || /^\d+\.\.\d+$/.test(m) || (/^\d+$/.test(m) && Number(m) > 1);
const optional = (m: string): boolean => m === "0..1";

/** The C++ type of the field a relationship implies, following the ownership rules in the lessons. */
function fieldFor(rel: Relation, target: DesignClass): { type: string; name: string } {
  const base = target.name;
  const stem = base.charAt(0).toLowerCase() + base.slice(1);
  const polymorphic = target.kind === "interface" || target.kind === "abstract";
  if (rel.kind === "composition") {
    if (many(rel.multiplicity)) return { type: `std::vector<std::unique_ptr<${base}>>`, name: `${stem}s_` };
    if (optional(rel.multiplicity) || polymorphic) return { type: `std::unique_ptr<${base}>`, name: `${stem}_` };
    return { type: base, name: `${stem}_` };
  }
  // Aggregation and association do not own: non-owning pointers.
  if (many(rel.multiplicity)) return { type: `std::vector<${base}*>`, name: `${stem}s_` };
  return { type: `${base}*`, name: `${stem}_` };
}

function methodLine(m: Member, pure: boolean, override: boolean): string {
  const stat = m.isStatic ? "static " : "";
  const virt = pure ? "virtual " : "";
  const cnst = m.isConst ? " const" : "";
  const tail = pure ? " = 0" : override ? " override" : "";
  return `${stat}${virt}${m.type} ${m.name}(${m.params ?? ""})${cnst}${tail};`;
}

function ancestors(board: Board, cls: DesignClass): DesignClass[] {
  const out: DesignClass[] = [];
  const seen = new Set<string>();
  const stack = [cls.id];
  while (stack.length) {
    const cur = stack.pop() as string;
    for (const r of board.relations) {
      if (r.from === cur && (r.kind === "inherits" || r.kind === "implements") && !seen.has(r.to)) {
        seen.add(r.to);
        const t = board.classes.find((c) => c.id === r.to);
        if (t) {
          out.push(t);
          stack.push(t.id);
        }
      }
    }
  }
  return out;
}

function renderClass(board: Board, cls: DesignClass): string {
  if (cls.kind === "enum") {
    const values = cls.fields.map((f) => `  ${f.name},`).join("\n");
    return `enum class ${cls.name} {\n${values || "  // TODO: values"}\n};\n`;
  }
  const bases = board.relations.filter((r) => r.from === cls.id && (r.kind === "inherits" || r.kind === "implements"));
  const baseNames = bases.map((r) => `public ${board.classes.find((c) => c.id === r.to)?.name}`);
  const isBase = board.relations.some((r) => r.to === cls.id && (r.kind === "inherits" || r.kind === "implements"));
  const inheritedNames = new Set(ancestors(board, cls).flatMap((a) => a.methods.map((m) => `${m.name}(${m.params ?? ""})`)));
  const lines: string[] = [];
  const head = `class ${cls.name}${baseNames.length ? " : " + baseNames.join(", ") : ""} {`;
  lines.push(head, " public:");
  if (cls.kind === "interface" || cls.kind === "abstract" || isBase) {
    lines.push(`  virtual ~${cls.name}() = default;`);
  }
  for (const m of cls.methods) {
    const pure = cls.kind === "interface";
    const override = inheritedNames.has(`${m.name}(${m.params ?? ""})`);
    lines.push("  " + methodLine(m, pure, override));
  }
  const fields: string[] = cls.fields.map((f) => `${f.isStatic ? "static " : ""}${f.type} ${f.name.endsWith("_") ? f.name : f.name + "_"};`);
  for (const r of board.relations) {
    if (r.from !== cls.id) continue;
    if (r.kind !== "composition" && r.kind !== "aggregation" && r.kind !== "association") continue;
    const target = board.classes.find((c) => c.id === r.to);
    if (target) {
      const f = fieldFor(r, target);
      fields.push(`${f.type} ${r.label && /^[A-Za-z_]\w*$/.test(r.label) ? r.label + "_" : f.name};`);
    }
  }
  if (fields.length) {
    lines.push("", " private:");
    for (const f of fields) lines.push("  " + f);
  }
  lines.push("};", "");
  return lines.join("\n");
}

/** Exports one header per type: forward declarations, the type itself, and `// TODO` where the player must decide. */
export function exportSkeleton(board: Board): WorkshopFile[] {
  return board.classes.map((cls) => {
    const body = renderClass(board, cls);
    const needed = new Set<string>();
    const forward: string[] = [];
    const hard: string[] = []; // types that must be fully defined (bases, by-value composition)
    for (const r of board.relations) {
      if (r.from !== cls.id) continue;
      const t = board.classes.find((c) => c.id === r.to);
      if (!t) continue;
      const byValue = r.kind === "inherits" || r.kind === "implements" || (r.kind === "composition" && !many(r.multiplicity) && !optional(r.multiplicity) && t.kind !== "interface" && t.kind !== "abstract");
      if (byValue || t.kind === "enum") hard.push(t.name);
      else if (t.name !== cls.name) forward.push(t.name);
    }
    // Types the player named in member signatures: defined (by-value fields) or declared (everything else).
    const fwd = new Set(forward);
    for (const other of board.classes) {
      if (other.id === cls.id) continue;
      const word = new RegExp(`\\b${other.name}\\b`);
      const inField = cls.fields.some((f) => word.test(f.type) && !/[*&]|unique_ptr|shared_ptr/.test(f.type));
      const inSignature = cls.methods.some((m) => word.test(m.type) || word.test(m.params ?? "")) || cls.fields.some((f) => word.test(f.type));
      if (inField) hard.push(other.name);
      else if (inSignature && !hard.includes(other.name)) fwd.add(other.name);
    }
    forward.length = 0;
    for (const n of fwd) if (!hard.includes(n)) forward.push(n);
    for (const [re, inc] of STD_INCLUDES) if (re.test(body)) needed.add(inc);
    const out = ["#pragma once"];
    for (const inc of [...needed].sort()) out.push(`#include ${inc}`);
    for (const h of [...new Set(hard)].sort()) out.push(`#include "${snake(h)}.h"`);
    if (forward.length) out.push("", ...[...new Set(forward)].sort().map((n) => (board.classes.find((c) => c.name === n)?.kind === "enum" ? `enum class ${n};` : `class ${n};`)));
    out.push("", body);
    return { path: `${snake(cls.name)}.h`, content: out.join("\n") };
  });
}
