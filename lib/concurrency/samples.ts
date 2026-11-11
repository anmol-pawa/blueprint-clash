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
          { op: "jmpIf", a: { reg: "r" }, cmp: "ne", b: 0, to: 5 },
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

/**
 * Lock-free stack pop and the ABA problem. Stack is A -> B -> C (node ids 1, 2, 3; 0 = empty).
 * T1 pops A with a CAS loop. T2 pops A, pops B (and frees it), then pushes A back, so `top` is A again
 * although the stack underneath changed. A bare pointer CAS then installs the freed node B.
 * `tagged` packs a version counter into the head word, so the re-pushed A is a different value (11).
 */
export function abaStack(tagged: boolean): Program {
  const victim: Instr[] = [
    { op: "load", reg: "old", var: "top", atomic: true, cpp: "Node* old = top.load();" },
    { op: "jmpIf", a: { reg: "old" }, cmp: "ne", b: 1, to: 4 },
    { op: "load", reg: "nx", var: "nextA", atomic: true, cpp: "Node* next = old->next;   // B" },
    { op: "cas", var: "top", expected: { reg: "old" }, desired: { reg: "nx" }, reg: "ok", cpp: "top.compare_exchange_strong(old, next);  // pop A" },
  ];
  const interloper: Instr[] = [
    { op: "cas", var: "top", expected: 1, desired: 2, reg: "ok", cpp: "pop();       // takes A" },
    { op: "jmpIf", a: { reg: "ok" }, cmp: "eq", b: 0, to: 7 },
    { op: "cas", var: "top", expected: 2, desired: 3, reg: "ok", cpp: "pop();       // takes B" },
    { op: "jmpIf", a: { reg: "ok" }, cmp: "eq", b: 0, to: 7 },
    { op: "store", var: "freedB", value: 1, atomic: true, cpp: "delete b;    // B's memory is released" },
    { op: "store", var: "nextA", value: 3, atomic: true, cpp: "a->next = c;  // reuse A" },
    { op: "store", var: "top", value: tagged ? 11 : 1, atomic: true, cpp: tagged ? "top = {a, version + 1};  // push A back" : "top = a;      // push A back" },
  ];
  // Jump targets past the end finish the thread.
  return {
    id: tagged ? "aba-tagged" : "aba-bare",
    shared: { top: 1, nextA: 2, freedB: 0 },
    threads: [
      { name: "Popper", code: victim, regs: { old: 0, nx: 0, ok: 0 } },
      { name: "Recycler", code: interloper, regs: { ok: 0 } },
    ],
    detectRaces: false,
    always: (v) => (v.shared.top === 2 && v.shared.freedB === 1 ? "top points at node B, which Recycler already freed (use after free)" : null),
  };
}

type QueueVariant = "one-cv-notify-one" | "one-cv-notify-all" | "two-cvs";

/** Bounded buffer of capacity 1 guarded by one mutex. One producer pushes twice; two consumers pop once each. */
export function boundedQueue(variant: QueueVariant): Program {
  const notFull = variant === "two-cvs" ? "notFull" : "cv";
  const notEmpty = variant === "two-cvs" ? "notEmpty" : "cv";
  const wake = (cv: string): Instr =>
    variant === "one-cv-notify-all"
      ? { op: "notifyAll", cv, cpp: `${cv}.notify_all();` }
      : { op: "notify", cv, cpp: `${cv}.notify_one();` };
  const push = (b: number): Instr[] => [
    { op: "lock", m: "m", cpp: "std::unique_lock<std::mutex> lk(m);" },
    { op: "load", reg: "c", var: "count", cpp: "while (count == kCap)" },
    { op: "jmpIf", a: { reg: "c" }, cmp: "lt", b: 1, to: b + 5 },
    { op: "wait", cv: notFull, m: "m", cpp: `  ${notFull}.wait(lk);` },
    { op: "jmp", to: b + 1 },
    { op: "store", var: "count", value: { reg: "c", add: 1 }, cpp: "++count;  // push" },
    wake(notEmpty),
    { op: "unlock", m: "m", cpp: "// lk released at end of scope" },
  ];
  const pop = (b: number): Instr[] => [
    { op: "lock", m: "m", cpp: "std::unique_lock<std::mutex> lk(m);" },
    { op: "load", reg: "c", var: "count", cpp: "while (count == 0)" },
    { op: "jmpIf", a: { reg: "c" }, cmp: "gt", b: 0, to: b + 5 },
    { op: "wait", cv: notEmpty, m: "m", cpp: `  ${notEmpty}.wait(lk);` },
    { op: "jmp", to: b + 1 },
    { op: "store", var: "count", value: { reg: "c", add: -1 }, cpp: "--count;  // pop" },
    { op: "atomicAdd", var: "consumed", delta: 1, cpp: "use(item);" },
    wake(notFull),
    { op: "unlock", m: "m", cpp: "// lk released at end of scope" },
  ];
  return {
    id: `queue-${variant}`,
    shared: { count: 0, consumed: 0 },
    threads: [
      { name: "Producer", code: [...push(0), ...push(8)], regs: { c: 0 } },
      { name: "Consumer 1", code: pop(0), regs: { c: 0 } },
      { name: "Consumer 2", code: pop(0), regs: { c: 0 } },
    ],
    final: (v) => (v.shared.consumed === 2 && v.shared.count === 0 ? null : `consumed ${v.shared.consumed} of 2 items, ${v.shared.count} left in the buffer`),
  };
}

type RwVariant = "reader-skips-lock" | "split-sections" | "one-section";

/** A writer moves a pair from (0,0) to (1,1); a reader must never see (0,1) or (1,0). */
export function pairReadWrite(variant: RwVariant): Program {
  const lockedReader = variant !== "reader-skips-lock";
  const writer: Instr[] =
    variant === "split-sections"
      ? [
          { op: "lock", m: "m", cpp: "{ std::lock_guard<std::mutex> g(m);" },
          { op: "store", var: "a", value: 1, cpp: "  a = 1; }" },
          { op: "unlock", m: "m" },
          { op: "lock", m: "m", cpp: "{ std::lock_guard<std::mutex> g(m);" },
          { op: "store", var: "b", value: 1, cpp: "  b = 1; }" },
          { op: "unlock", m: "m" },
        ]
      : [
          { op: "lock", m: "m", cpp: "std::lock_guard<std::mutex> g(m);" },
          { op: "store", var: "a", value: 1, cpp: "a = 1;" },
          { op: "store", var: "b", value: 1, cpp: "b = 1;" },
          { op: "unlock", m: "m" },
        ];
  const reader: Instr[] = [
    ...(lockedReader ? ([{ op: "lock", m: "m", cpp: "std::lock_guard<std::mutex> g(m);" }] as Instr[]) : []),
    { op: "load", reg: "x", var: "a", cpp: "int x = a;" },
    { op: "load", reg: "y", var: "b", cpp: "int y = b;" },
    ...(lockedReader ? ([{ op: "unlock", m: "m" }] as Instr[]) : []),
  ];
  return {
    id: `pair-${variant}`,
    shared: { a: 0, b: 0 },
    threads: [
      { name: "Writer", code: writer },
      { name: "Reader", code: reader, regs: { x: 0, y: 0 } },
    ],
    final: (v) => (v.regs[1].x === v.regs[1].y ? null : `reader saw a=${v.regs[1].x}, b=${v.regs[1].y}: a half-finished update`),
  };
}

type PublishVariant = "plain-pointer" | "relaxed-reordered" | "release-acquire";

/**
 * Double-checked locking for a singleton. The engine is sequentially consistent, so it cannot reorder by itself:
 * `relaxed-reordered` is written in the order a relaxed store may become visible (pointer before fields).
 * `built` stands for the object's fields; a reader that sees the pointer must also see `built == 1`.
 */
export function doubleCheckedLocking(variant: PublishVariant): Program {
  const plain = variant === "plain-pointer";
  const reordered = variant === "relaxed-reordered";
  const at = { atomic: !plain };
  const construct: Instr[] = [
    { op: "atomicAdd", var: "made", delta: 1, cpp: "auto* s = new Singleton;  // allocate + construct" },
    ...(reordered
      ? ([
          { op: "store", var: "ptr", value: 1, atomic: true, cpp: "inst.store(s, std::memory_order_relaxed);" },
          { op: "store", var: "built", value: 1, atomic: true, cpp: "// (constructor's field writes become visible here)" },
        ] as Instr[])
      : ([
          { op: "store", var: "built", value: 1, atomic: true, cpp: "// (constructor's field writes)" },
          plain
            ? { op: "store", var: "ptr", value: 1, cpp: "inst = s;  // plain pointer" }
            : { op: "store", var: "ptr", value: 1, atomic: true, cpp: "inst.store(s, std::memory_order_release);" },
        ] as Instr[])),
  ];
  const code: Instr[] = [
    { op: "load", reg: "p", var: "ptr", ...at, cpp: plain ? "if (inst == nullptr) {" : `if (inst.load(std::memory_order_${reordered ? "relaxed" : "acquire"}) == nullptr) {` },
    { op: "jmpIf", a: { reg: "p" }, cmp: "ne", b: 0, to: 9 },
    { op: "lock", m: "m", cpp: "  std::lock_guard<std::mutex> g(m);" },
    { op: "load", reg: "p", var: "ptr", ...at, cpp: "  if (inst == nullptr) {  // second check, under the lock" },
    { op: "jmpIf", a: { reg: "p" }, cmp: "ne", b: 0, to: 8 },
    ...construct,
    { op: "unlock", m: "m", cpp: "} }" },
    { op: "load", reg: "b", var: "built", atomic: true, cpp: "return inst->value();  // use the object" },
    { op: "assert", a: { reg: "b" }, cmp: "eq", b: 1, msg: "used a Singleton whose fields were not written yet" },
  ];
  return {
    id: `dcl-${variant}`,
    shared: { ptr: 0, built: 0, made: 0 },
    threads: [
      { name: "T1", code, regs: { p: 0, b: 0 } },
      { name: "T2", code, regs: { p: 0, b: 0 } },
    ],
    final: (v) => (v.shared.made === 1 ? null : `Singleton was constructed ${v.shared.made} times, expected 1`),
  };
}

type FlagVariant = "plain-flag" | "relaxed-reordered" | "release-acquire";

/** Message passing: write `data`, then raise `ready`; the consumer spins on `ready` and then reads `data`. */
export function flagPublication(variant: FlagVariant): Program {
  const plain = variant === "plain-flag";
  const reordered = variant === "relaxed-reordered";
  const producer: Instr[] = reordered
    ? [
        { op: "store", var: "ready", value: 1, cpp: "ready.store(true, std::memory_order_relaxed);" },
        { op: "store", var: "data", value: 42, cpp: "// (the write to data becomes visible here)" },
      ]
    : [
        { op: "store", var: "data", value: 42, cpp: "data = 42;" },
        plain
          ? { op: "store", var: "ready", value: 1, cpp: "ready = true;  // plain bool" }
          : { op: "store", var: "ready", value: 1, atomic: true, cpp: "ready.store(true, std::memory_order_release);" },
      ];
  const consumer: Instr[] = [
    plain
      ? { op: "load", reg: "r", var: "ready", cpp: "while (!ready) { /* spin */ }" }
      : { op: "load", reg: "r", var: "ready", cpp: `while (!ready.load(std::memory_order_${reordered ? "relaxed" : "acquire"})) { /* spin */ }` },
    { op: "jmpIf", a: { reg: "r" }, cmp: "eq", b: 0, to: 0 },
    { op: "load", reg: "d", var: "data", cpp: "int d = data;" },
    { op: "assert", a: { reg: "d" }, cmp: "eq", b: 42, msg: "read data before it was written" },
  ];
  return {
    id: `flag-${variant}`,
    shared: { data: 0, ready: 0 },
    threads: [
      { name: "Producer", code: producer },
      { name: "Consumer", code: consumer, regs: { r: 0, d: 0 } },
    ],
    // Only the plain-bool version is meant to be caught by the lockset detector; the others are judged by the assert.
    detectRaces: plain,
  };
}

type PoliteVariant = "retry-immediately" | "global-order" | "one-side-insists";

/** Two workers need both locks. The "polite" one back-offs on try_lock failure and retries at once. */
export function politeLocking(variant: PoliteVariant): Program {
  const polite = (first: string, second: string): Instr[] => [
    { op: "lock", m: first, cpp: `${first}.lock();` },
    { op: "trylock", m: second, reg: "got", cpp: `if (${second}.try_lock()) {` },
    { op: "jmpIf", a: { reg: "got" }, cmp: "ne", b: 0, to: 5 },
    { op: "unlock", m: first, cpp: `} else { ${first}.unlock();  // be polite, back off` },
    { op: "jmp", to: 0, cpp: "}  // ...and retry at once" },
    { op: "atomicAdd", var: "done", delta: 1, cpp: "work();  // needs both" },
    { op: "unlock", m: second },
    { op: "unlock", m: first },
  ];
  const blocking = (first: string, second: string): Instr[] => [
    { op: "lock", m: first, cpp: `${first}.lock();` },
    { op: "lock", m: second, cpp: `${second}.lock();  // wait for it` },
    { op: "atomicAdd", var: "done", delta: 1, cpp: "work();  // needs both" },
    { op: "unlock", m: second },
    { op: "unlock", m: first },
  ];
  const t1 = variant === "global-order" ? blocking("a", "b") : variant === "one-side-insists" ? blocking("a", "b") : polite("a", "b");
  const t2 = variant === "global-order" ? blocking("a", "b") : polite("b", "a");
  return {
    id: `polite-${variant}`,
    shared: { done: 0 },
    threads: [
      { name: "Worker 1", code: t1, regs: { got: 0 } },
      { name: "Worker 2", code: t2, regs: { got: 0 } },
    ],
    final: (v) => (v.shared.done === 2 ? null : `only ${v.shared.done} of 2 workers finished`),
  };
}
