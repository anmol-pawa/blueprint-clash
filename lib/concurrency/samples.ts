import type { Instr, Program } from "./types";

/** Small reference programs used by the explorer tests; C10 builds the real puzzles on the same IR. */

const incr = (locked: boolean): Instr[] => [
  ...(locked ? ([{ op: "lock", m: "m", cpp: "std::lock_guard<std::mutex> g(m);" }] as Instr[]) : []),
  { op: "load", reg: "r", var: "counter", cpp: "int r = counter;" },
  { op: "set", reg: "r", value: { reg: "r", add: 1 } },
  { op: "store", var: "counter", value: { reg: "r" }, cpp: "counter = r + 1;" },
  ...(locked ? ([{ op: "unlock", m: "m" }] as Instr[]) : []),
];

const twoIncrements = (id: string, code: Instr[]): Program => ({
  id,
  shared: { counter: 0 },
  threads: [
    { name: "T1", code },
    { name: "T2", code },
  ],
  final: (v) => (v.shared.counter === 2 ? null : `counter is ${v.shared.counter}, expected 2 (an increment was lost)`),
});

export const counterRacy = (): Program => twoIncrements("counter-racy", incr(false));
export const counterLocked = (): Program => twoIncrements("counter-locked", incr(true));
export const counterAtomic = (): Program =>
  twoIncrements("counter-atomic", [{ op: "atomicAdd", var: "counter", delta: 1, cpp: "++counter; // std::atomic<int>" }]);

const abba = (first: string, second: string): Instr[] => [
  { op: "lock", m: first },
  { op: "lock", m: second },
  { op: "unlock", m: second },
  { op: "unlock", m: first },
];
export const transferDeadlock = (): Program => ({
  id: "abba",
  shared: {},
  threads: [
    { name: "A->B", code: abba("a", "b") },
    { name: "B->A", code: abba("b", "a") },
  ],
});
export const transferOrdered = (): Program => ({
  id: "ordered",
  shared: {},
  threads: [
    { name: "A->B", code: abba("a", "b") },
    { name: "B->A", code: abba("a", "b") },
  ],
});

/** Consumer waits for `ready`; the producer sets it. `variant` selects the bug or the fix. */
export function handshake(variant: "unlocked-producer" | "if-wait" | "while-wait"): Program {
  const producer: Instr[] =
    variant === "unlocked-producer"
      ? [
          { op: "store", var: "ready", value: 1, cpp: "ready = true;" },
          { op: "notify", cv: "cv", cpp: "cv.notify_one();" },
        ]
      : [
          { op: "lock", m: "m" },
          { op: "store", var: "ready", value: 1, cpp: "ready = true;" },
          { op: "notify", cv: "cv", cpp: "cv.notify_one();" },
          { op: "unlock", m: "m" },
        ];
  const consumer: Instr[] =
    variant === "while-wait"
      ? [
          { op: "lock", m: "m" },
          { op: "load", reg: "r", var: "ready", cpp: "while (!ready)" },
          { op: "jmpIf", a: { reg: "r" }, cmp: "ne", b: 0, to: 4 },
          { op: "wait", cv: "cv", m: "m", cpp: "  cv.wait(lk);" },
          { op: "jmp", to: 1 },
          { op: "assert", a: { reg: "r" }, cmp: "eq", b: 1, msg: "consumed before ready" },
          { op: "unlock", m: "m" },
        ]
      : [
          { op: "lock", m: "m" },
          { op: "load", reg: "r", var: "ready", cpp: "if (!ready)" },
          { op: "jmpIf", a: { reg: "r" }, cmp: "ne", b: 0, to: 4 },
          { op: "wait", cv: "cv", m: "m", cpp: "  cv.wait(lk);" },
          { op: "load", reg: "r", var: "ready" },
          { op: "assert", a: { reg: "r" }, cmp: "eq", b: 1, msg: "consumed before ready" },
          { op: "unlock", m: "m" },
        ];
  return {
    id: `handshake-${variant}`,
    shared: { ready: 0 },
    threads: [
      { name: "Consumer", code: consumer },
      { name: "Producer", code: producer },
    ],
    spurious: variant !== "unlocked-producer",
    detectRaces: variant !== "unlocked-producer",
  };
}
