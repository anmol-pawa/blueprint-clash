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

/** Check-then-act: two threads lazily initialise a resource; it must be created exactly once. */
export function lazyInit(locked: boolean): Program {
  const code: Instr[] = [
    ...(locked ? ([{ op: "lock", m: "m" }] as Instr[]) : []),
    { op: "load", reg: "r", var: "inited", cpp: "if (!inited) {" },
    { op: "jmpIf", a: { reg: "r" }, cmp: "ne", b: 0, to: locked ? 5 : 4 },
    { op: "atomicAdd", var: "created", delta: 1, cpp: "  create();  // expensive, must run once" },
    { op: "store", var: "inited", value: 1, cpp: "  inited = true; }" },
    ...(locked ? ([{ op: "unlock", m: "m" }] as Instr[]) : []),
  ];
  return {
    id: locked ? "lazy-init-locked" : "lazy-init-racy",
    shared: { inited: 0, created: 0 },
    threads: [
      { name: "T1", code },
      { name: "T2", code },
    ],
    detectRaces: locked,
    final: (v) => (v.shared.created === 1 ? null : `create() ran ${v.shared.created} times, expected 1`),
  };
}

/** Moving 10 between two accounts: the total must never be observed changed. */
export function twoVariableInvariant(variant: "atomics" | "mutex"): Program {
  const mover: Instr[] =
    variant === "mutex"
      ? [
          { op: "lock", m: "m" },
          { op: "atomicAdd", var: "a", delta: -10, cpp: "a -= 10;" },
          { op: "atomicAdd", var: "b", delta: 10, cpp: "b += 10;" },
          { op: "unlock", m: "m" },
        ]
      : [
          { op: "atomicAdd", var: "a", delta: -10, cpp: "a -= 10;  // std::atomic" },
          { op: "atomicAdd", var: "b", delta: 10, cpp: "b += 10;  // std::atomic" },
        ];
  const auditor: Instr[] = [
    ...(variant === "mutex" ? ([{ op: "lock", m: "m" }] as Instr[]) : []),
    { op: "load", reg: "x", var: "a", cpp: "int x = a;" },
    { op: "load", reg: "y", var: "b", cpp: "int y = b;" },
    { op: "set", reg: "t", value: { reg: "x" } },
    ...(variant === "mutex" ? ([{ op: "unlock", m: "m" }] as Instr[]) : []),
  ];
  return {
    id: `total-${variant}`,
    shared: { a: 100, b: 0 },
    threads: [
      { name: "Mover", code: mover },
      { name: "Auditor", code: auditor, regs: { x: 0, y: 0, t: 0 } },
    ],
    detectRaces: false,
    final: (v) => (v.regs[1].x + v.regs[1].y === 100 ? null : `auditor saw a=${v.regs[1].x}, b=${v.regs[1].y}: total ${v.regs[1].x + v.regs[1].y}, expected 100`),
  };
}

/** Claiming a slot: read-then-write races, a CAS retry loop does not. */
export function claimSlot(variant: "check-then-set" | "cas"): Program {
  const code: Instr[] =
    variant === "cas"
      ? [{ op: "cas", var: "owner", expected: 0, desired: { reg: "id" }, reg: "won", cpp: "bool won = owner.compare_exchange_strong(zero, id);" },
         { op: "jmpIf", a: { reg: "won" }, cmp: "eq", b: 0, to: 3 },
         { op: "atomicAdd", var: "winners", delta: 1, cpp: "if (won) ++winners;" }]
      : [{ op: "load", reg: "o", var: "owner", atomic: true, cpp: "if (owner.load() == 0) {" },
         { op: "jmpIf", a: { reg: "o" }, cmp: "ne", b: 0, to: 4 },
         { op: "store", var: "owner", value: { reg: "id" }, atomic: true, cpp: "  owner.store(id);" },
         { op: "atomicAdd", var: "winners", delta: 1, cpp: "  ++winners; }" }];
  return {
    id: `claim-${variant}`,
    shared: { owner: 0, winners: 0 },
    threads: [
      { name: "T1", code, regs: { id: 1, won: 0, o: 0, w: 0 } },
      { name: "T2", code, regs: { id: 2, won: 0, o: 0, w: 0 } },
    ],
    detectRaces: false,
    final: (v) => (v.shared.winners === 1 ? null : `${v.shared.winners} threads think they own the slot, expected 1`),
  };
}
