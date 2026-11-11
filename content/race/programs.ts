import type { Instr, Program } from "@/lib/concurrency";

/**
 * Programs for the Race Hunter puzzles beyond the first two. Each statement that is not one
 * atomic hardware step is authored as separate steps so the explorer can interleave it.
 */

// --- Check-then-act: two withdrawals of 80 from a balance of 100 ---------------------------

const WITHDRAW = 80;
const withdrawProgram = (id: string, code: Instr[]): Program => ({
  id,
  shared: { balance: 100 },
  threads: [
    { name: "ATM 1", code },
    { name: "ATM 2", code },
  ],
  always: (v) => (v.shared.balance < 0 ? `balance is ${v.shared.balance}: the account was overdrawn` : null),
  final: (v) => (v.shared.balance === 100 - WITHDRAW ? null : `balance is ${v.shared.balance}, expected exactly one withdrawal to succeed`),
});

/** Every access is atomic, so there is no data race, yet the check and the update can be separated. */
export const withdrawAtomicSteps = (): Program =>
  withdrawProgram("withdraw-atomic-steps", [
    { op: "load", reg: "r", var: "balance", atomic: true, cpp: "int r = balance.load();" },
    { op: "jmpIf", a: { reg: "r" }, cmp: "lt", b: WITHDRAW, to: 3, cpp: "if (r < 80) return false;" },
    { op: "atomicAdd", var: "balance", delta: -WITHDRAW, cpp: "balance -= 80; // atomic, but the check above is stale" },
  ]);

export const withdrawLocked = (): Program =>
  withdrawProgram("withdraw-locked", [
    { op: "lock", m: "m", cpp: "std::lock_guard<std::mutex> g(m);" },
    { op: "load", reg: "r", var: "balance", cpp: "int r = balance;" },
    { op: "jmpIf", a: { reg: "r" }, cmp: "lt", b: WITHDRAW, to: 5, cpp: "if (r < 80) return false;" },
    { op: "set", reg: "n", value: { reg: "r", add: -WITHDRAW } },
    { op: "store", var: "balance", value: { reg: "n" }, cpp: "balance = r - 80;" },
    { op: "unlock", m: "m" },
  ]);

export const withdrawCas = (): Program =>
  withdrawProgram("withdraw-cas", [
    { op: "load", reg: "r", var: "balance", atomic: true, cpp: "int r = balance.load();" },
    { op: "jmpIf", a: { reg: "r" }, cmp: "lt", b: WITHDRAW, to: 5, cpp: "if (r < 80) return false;" },
    { op: "set", reg: "n", value: { reg: "r", add: -WITHDRAW } },
    { op: "cas", var: "balance", expected: { reg: "r" }, desired: { reg: "n" }, reg: "ok", cpp: "bool ok = balance.compare_exchange_strong(r, r - 80);" },
    { op: "jmpIf", a: { reg: "ok" }, cmp: "eq", b: 0, to: 0, cpp: "if (!ok) retry;" },
  ]);

// --- Early return that skips a manual unlock -----------------------------------------------

const claimProgram = (id: string, code: Instr[]): Program => ({
  id,
  shared: { claimed: 0 },
  threads: [
    { name: "Worker 1", code },
    { name: "Worker 2", code },
  ],
});

/** `claim()` returns early when the job is already taken. With manual unlock the early return keeps the mutex. */
export const claimManualUnlock = (): Program =>
  claimProgram("claim-manual", [
    { op: "lock", m: "m", cpp: "m.lock();" },
    { op: "load", reg: "r", var: "claimed", cpp: "int r = claimed;" },
    { op: "jmpIf", a: { reg: "r" }, cmp: "ne", b: 0, to: 5, cpp: "if (r != 0) return false; // forgot m.unlock()" },
    { op: "store", var: "claimed", value: 1, cpp: "claimed = 1;" },
    { op: "unlock", m: "m", cpp: "m.unlock();" },
  ]);

/** RAII: every exit path, including the early return, runs the guard's destructor. */
export const claimLockGuard = (): Program =>
  claimProgram("claim-guard", [
    { op: "lock", m: "m", cpp: "std::lock_guard<std::mutex> g(m);" },
    { op: "load", reg: "r", var: "claimed", cpp: "int r = claimed;" },
    { op: "jmpIf", a: { reg: "r" }, cmp: "ne", b: 0, to: 4, cpp: "if (r != 0) return false; // ~lock_guard unlocks" },
    { op: "store", var: "claimed", value: 1, cpp: "claimed = 1;" },
    { op: "unlock", m: "m", cpp: "// ~lock_guard unlocks here" },
  ]);

// --- Lazy initialisation: double-checked locking ------------------------------------------

const lazyInit = (id: string, atomicFlag: boolean): Program => {
  const code: Instr[] = [
    { op: "load", reg: "r", var: "ready", atomic: atomicFlag, cpp: atomicFlag ? "if (!ready.load()) {" : "if (!ready) {" },
    { op: "jmpIf", a: { reg: "r" }, cmp: "ne", b: 0, to: 8, cpp: "  // already loaded: skip the lock" },
    { op: "lock", m: "m", cpp: "  std::lock_guard<std::mutex> g(m);" },
    { op: "load", reg: "r", var: "ready", cpp: "  if (!ready) {" },
    { op: "jmpIf", a: { reg: "r" }, cmp: "ne", b: 0, to: 7, cpp: "  // somebody else loaded it while we waited" },
    { op: "store", var: "config", value: 42, cpp: "    config = load_config();" },
    { op: "store", var: "ready", value: 1, atomic: atomicFlag, cpp: atomicFlag ? "    ready.store(true);" : "    ready = true;" },
    { op: "unlock", m: "m", cpp: "} // g unlocks" },
    { op: "load", reg: "c", var: "config", cpp: "use(config);" },
    { op: "assert", a: { reg: "c" }, cmp: "eq", b: 42, msg: "used config before it was initialised" },
  ];
  return {
    id,
    shared: { config: 0, ready: 0 },
    threads: [
      { name: "Request 1", code },
      { name: "Request 2", code },
    ],
  };
};

/** The cheap first check reads a plain bool without the lock while the initialiser writes it. */
export const lazyPlainFlag = (): Program => lazyInit("lazy-plain", false);
/** The first check is an atomic load, the store that publishes the config is atomic. */
export const lazyAtomicFlag = (): Program => lazyInit("lazy-atomic", true);
