/**
 * Step-based IR for the Race Hunter explorer (ARCH §5).
 * Every instruction is one atomic scheduler step; a non-atomic C++ statement such as
 * `++counter` is deliberately authored as `load`, `set`, `store` so it can interleave.
 */
export type Operand = number | { reg: string; add?: number };
export type Cmp = "eq" | "ne" | "lt" | "le" | "gt" | "ge";

export type Instr = (
  | { op: "load"; reg: string; var: string; atomic?: boolean }
  | { op: "store"; var: string; value: Operand; atomic?: boolean }
  | { op: "set"; reg: string; value: Operand }
  | { op: "lock"; m: string }
  /** Never blocks: reg = 1 and the mutex is taken when free, otherwise reg = 0. */
  | { op: "trylock"; m: string; reg: string }
  | { op: "unlock"; m: string }
  /** Atomically releases `m` and sleeps on `cv`; on wake it must re-acquire `m` before continuing. */
  | { op: "wait"; cv: string; m: string }
  | { op: "notify"; cv: string }
  | { op: "notifyAll"; cv: string }
  /** reg = 1 and var = desired when var == expected, otherwise reg = 0. */
  | { op: "cas"; var: string; expected: Operand; desired: Operand; reg: string }
  /** var += delta atomically; reg (optional) receives the old value. */
  | { op: "atomicAdd"; var: string; delta: number; reg?: string }
  | { op: "jmpIf"; a: Operand; cmp: Cmp; b: Operand; to: number }
  | { op: "jmp"; to: number }
  | { op: "assert"; a: Operand; cmp: Cmp; b: Operand; msg: string }
) & {
  /** The C++ line this step stands for, so the UI can show the snippet and a test can keep them in sync. */
  cpp?: string;
};

export interface View {
  shared: Record<string, number>;
  regs: Record<string, number>[];
  done: boolean[];
}
/** Returns a message when the invariant is broken, otherwise null. */
export type Check = (view: View) => string | null;

export interface ThreadDef {
  name: string;
  code: Instr[];
  regs?: Record<string, number>;
}

export interface Program {
  id: string;
  shared: Record<string, number>;
  threads: ThreadDef[];
  /** Checked in every reachable state. */
  always?: Check;
  /** Checked when every thread has finished. */
  final?: Check;
  /** Allow a waiting thread to wake with no notify (spurious wake-up). */
  spurious?: boolean;
  /** Report unsynchronised conflicting accesses (default true). */
  detectRaces?: boolean;
}

export interface ThreadState {
  pc: number;
  regs: Record<string, number>;
  status: "ready" | "waiting" | "relock";
  cv?: string;
  m?: string;
}

export interface State {
  shared: Record<string, number>;
  /** mutex name -> owning thread index; absent when free. */
  owner: Record<string, number>;
  /** cv name -> FIFO list of waiting thread indexes. */
  waiters: Record<string, number[]>;
  threads: ThreadState[];
}

export type ViolationKind =
  | "assertion"
  | "invariant"
  | "data-race"
  | "deadlock"
  | "lost-wakeup"
  /** A cycle in which every unfinished thread keeps running but none can ever finish (fair schedule). */
  | "livelock"
  | "unlock-not-owned"
  | "wait-without-lock"
  | "lock-leak";

export interface Violation {
  kind: ViolationKind;
  message: string;
}

export interface Event {
  tid: number;
  text: string;
}
