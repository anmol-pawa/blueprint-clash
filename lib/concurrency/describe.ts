import type { Instr, Operand } from "./types";

const operand = (o: Operand): string => (typeof o === "number" ? String(o) : o.add ? `${o.reg} ${o.add > 0 ? "+" : "-"} ${Math.abs(o.add)}` : o.reg);
const CMP = { eq: "==", ne: "!=", lt: "<", le: "<=", gt: ">", ge: ">=" } as const;

/** One display line per step: the authored C++ when present, otherwise a plain description of the atomic step. */
export function describeInstr(i: Instr): string {
  if (i.cpp) return i.cpp;
  switch (i.op) {
    case "load": return `${i.reg} = ${i.var};${i.atomic ? " // atomic" : ""}`;
    case "store": return `${i.var} = ${operand(i.value)};${i.atomic ? " // atomic" : ""}`;
    case "set": return `${i.reg} = ${operand(i.value)};`;
    case "lock": return `${i.m}.lock();`;
    case "trylock": return `${i.reg} = ${i.m}.try_lock();`;
    case "unlock": return `${i.m}.unlock();`;
    case "wait": return `${i.cv}.wait(${i.m});`;
    case "notify": return `${i.cv}.notify_one();`;
    case "notifyAll": return `${i.cv}.notify_all();`;
    case "cas": return `${i.reg} = compare_exchange(${i.var}, ${operand(i.expected)}, ${operand(i.desired)});`;
    case "atomicAdd": return `${i.reg ? `${i.reg} = ` : ""}${i.var}.fetch_add(${i.delta});`;
    case "jmpIf": return `if (${operand(i.a)} ${CMP[i.cmp]} ${operand(i.b)}) goto ${i.to};`;
    case "jmp": return `goto ${i.to};`;
    case "assert": return `assert(${operand(i.a)} ${CMP[i.cmp]} ${operand(i.b)}); // ${i.msg}`;
  }
}
