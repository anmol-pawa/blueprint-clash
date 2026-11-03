import type { Board, BoardClass, BoardEdge } from "./model";
import { validateBoard } from "./model";

export interface SkeletonFile {
  path: string;
  content: string;
}

const MANY = (m: string | undefined) => m === "*" || m === "1..*" || m === "n" || (m !== undefined && /\.\.(\*|n)$/.test(m));

const STD_HEADERS: [RegExp, string][] = [
  [/std::string\b/, "string"],
  [/std::(map|multimap)\b/, "map"],
  [/std::(unordered_map)\b/, "unordered_map"],
  [/std::(set|multiset)\b/, "set"],
  [/std::unordered_set\b/, "unordered_set"],
  [/std::vector\b/, "vector"],
  [/std::(unique_ptr|shared_ptr|make_unique|make_shared)\b/, "memory"],
  [/std::optional\b/, "optional"],
  [/std::(function)\b/, "functional"],
  [/std::(chrono)\b/, "chrono"],
  [/std::(array)\b/, "array"],
  [/std::(deque)\b/, "deque"],
  [/std::(queue|priority_queue)\b/, "queue"],
  [/std::(mutex|lock_guard|unique_lock)\b/, "mutex"],
  [/\b(u?int(8|16|32|64)_t)\b/, "cstdint"],
];

/**
 * Exports the board as C++ headers with method stubs. Ownership follows the UML: composition owns
 * (`unique_ptr`, or a `vector` of them for many), aggregation and association observe (raw non-owning
 * pointer), dependency adds only a forward declaration. Throws when the board has structural errors.
 */
export function boardToSkeleton(board: Board): SkeletonFile[] {
  const errors = validateBoard(board).filter((i) => i.severity === "error");
  if (errors.length > 0) throw new Error(`Board has errors: ${errors.map((e) => e.message).join("; ")}`);
  const byId = new Map(board.classes.map((c) => [c.id, c]));
  return board.classes.map((c) => ({ path: `${c.name}.h`, content: renderHeader(c, board.edges, byId) }));
}

function renderHeader(c: BoardClass, edges: BoardEdge[], byId: Map<string, BoardClass>): string {
  if (c.kind === "enum") {
    const body = c.fields.map((f) => `    ${f.name},`).join("\n");
    return `#pragma once\n\nenum class ${c.name} {\n${body}\n};\n`;
  }
  const bases: string[] = [];
  const includes = new Set<string>();
  const forwards = new Set<string>();
  const members: string[] = [];
  let needsMemory = false;
  let needsVector = false;

  for (const e of edges.filter((x) => x.from === c.id)) {
    const to = byId.get(e.to)!;
    if (e.kind === "inherits" || e.kind === "implements") {
      bases.push(`public ${to.name}`);
      includes.add(to.name);
    } else if (e.kind === "composition") {
      const many = MANY(e.toMult);
      const field = e.label && /^[A-Za-z_]\w*$/.test(e.label) ? e.label : lowerFirst(to.name) + (many ? "s" : "");
      includes.add(to.name);
      needsMemory = true;
      if (many) {
        needsVector = true;
        members.push(`    std::vector<std::unique_ptr<${to.name}>> ${field}_;  // owns`);
      } else {
        members.push(`    std::unique_ptr<${to.name}> ${field}_;  // owns`);
      }
    } else if (e.kind === "aggregation" || e.kind === "association") {
      const many = MANY(e.toMult);
      const field = e.label && /^[A-Za-z_]\w*$/.test(e.label) ? e.label : lowerFirst(to.name) + (many ? "s" : "");
      forwards.add(to.name);
      if (many) {
        needsVector = true;
        members.push(`    std::vector<${to.name}*> ${field}_;  // does not own`);
      } else {
        members.push(`    ${to.name}* ${field}_ = nullptr;  // does not own`);
      }
    } else {
      forwards.add(to.name);
    }
  }
  for (const f of c.fields) members.push(`    ${f.type} ${f.name}_;`);

  const lines: string[] = ["#pragma once", ""];
  const stdHeaders = new Set<string>();
  if (needsMemory) stdHeaders.add("memory");
  if (needsVector) stdHeaders.add("vector");
  const text = [...c.fields.map((f) => f.type), ...c.methods.flatMap((m) => [m.returns, m.params])].join(" ");
  for (const [re, header] of STD_HEADERS) if (re.test(text)) stdHeaders.add(header);
  const std = [...stdHeaders].sort().map((h) => `#include <${h}>`);
  lines.push(...std);
  for (const inc of [...includes].sort()) lines.push(`#include "${inc}.h"`);
  if (std.length > 0 || includes.size > 0) lines.push("");
  const fwd = [...forwards].filter((n) => !includes.has(n) && n !== c.name).sort();
  for (const n of fwd) lines.push(`class ${n};`);
  if (fwd.length > 0) lines.push("");

  const head = `class ${c.name}${bases.length ? " : " + bases.join(", ") : ""} {`;
  lines.push(head, "public:");
  const isAbstractType = c.kind === "interface" || c.kind === "abstract";
  if (isAbstractType) lines.push(`    virtual ~${c.name}() = default;`);
  const overridden = new Set<string>();
  for (const e of edges.filter((x) => x.from === c.id && (x.kind === "inherits" || x.kind === "implements"))) {
    const base = byId.get(e.to)!;
    for (const bm of base.methods) if (base.kind === "interface" || bm.isAbstract) overridden.add(bm.name);
  }
  for (const m of c.methods) {
    const constQ = m.isConst ? " const" : "";
    if (c.kind === "interface" || m.isAbstract) {
      lines.push(`    virtual ${m.returns} ${m.name}(${m.params})${constQ} = 0;`);
    } else if (overridden.has(m.name)) {
      lines.push(`    ${m.returns} ${m.name}(${m.params})${constQ} override;`);
    } else {
      lines.push(`    ${m.returns} ${m.name}(${m.params})${constQ};`);
    }
  }
  if (members.length > 0) {
    lines.push("", "private:", ...members);
  }
  lines.push("};", "");
  return lines.join("\n");
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
