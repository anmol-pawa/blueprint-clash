import type { Cmp, Event, Instr, Operand, Program, State, ThreadState, View, Violation } from "./types";

function cloneState(s: State): State {
  const waiters: Record<string, number[]> = {};
  for (const k of Object.keys(s.waiters)) waiters[k] = s.waiters[k].slice();
  return {
    shared: { ...s.shared },
    owner: { ...s.owner },
    waiters,
    threads: s.threads.map((t) => ({ ...t, regs: { ...t.regs } })),
  };
}

export function initialState(p: Program): State {
  return {
    shared: { ...p.shared },
    owner: {},
    waiters: {},
    threads: p.threads.map((t) => ({ pc: 0, regs: { ...(t.regs ?? {}) }, status: "ready" as const })),
  };
}

export function isDone(p: Program, s: State, tid: number): boolean {
  return s.threads[tid].status === "ready" && s.threads[tid].pc >= p.threads[tid].code.length;
}

function val(op: Operand, t: ThreadState): number {
  if (typeof op === "number") return op;
  return (t.regs[op.reg] ?? 0) + (op.add ?? 0);
}

function cmp(a: number, c: Cmp, b: number): boolean {
  switch (c) {
    case "eq": return a === b;
    case "ne": return a !== b;
    case "lt": return a < b;
    case "le": return a <= b;
    case "gt": return a > b;
    case "ge": return a >= b;
  }
}

function nextInstr(p: Program, s: State, tid: number): Instr | undefined {
  const t = s.threads[tid];
  return t.status === "ready" ? p.threads[tid].code[t.pc] : undefined;
}

/** Thread indexes that can take a step in this state. */
export function enabledThreads(p: Program, s: State): number[] {
  const out: number[] = [];
  s.threads.forEach((t, tid) => {
    if (t.status === "waiting") {
      if (p.spurious) out.push(tid);
    } else if (t.status === "relock") {
      if (s.owner[t.m as string] === undefined) out.push(tid);
    } else {
      const ins = p.threads[tid].code[t.pc];
      if (!ins) return;
      if (ins.op === "lock" && s.owner[ins.m] !== undefined) return;
      out.push(tid);
    }
  });
  return out;
}

export function isFinished(p: Program, s: State): boolean {
  return s.threads.every((_, tid) => isDone(p, s, tid));
}

export function view(p: Program, s: State): View {
  return { shared: s.shared, regs: s.threads.map((t) => t.regs), done: s.threads.map((_, i) => isDone(p, s, i)) };
}

export interface StepResult {
  state: State;
  event: Event;
  violation?: Violation;
}

/** Executes one step of thread `tid`. The input state is never mutated. */
export function step(p: Program, prev: State, tid: number): StepResult {
  const s = cloneState(prev);
  const t = s.threads[tid];
  const name = p.threads[tid].name;
  const ev = (text: string): Event => ({ tid, text: `${name}: ${text}` });

  if (t.status === "waiting") {
    // Spurious wake-up: leave the queue and go re-acquire the mutex.
    const q = s.waiters[t.cv as string] ?? [];
    s.waiters[t.cv as string] = q.filter((x) => x !== tid);
    t.status = "relock";
    return { state: s, event: ev(`wakes spuriously from ${t.cv}`) };
  }
  if (t.status === "relock") {
    const m = t.m as string;
    s.owner[m] = tid;
    t.status = "ready";
    t.pc += 1;
    return { state: s, event: ev(`wakes and re-acquires ${m}`) };
  }

  const ins = p.threads[tid].code[t.pc];
  const fail = (kind: Violation["kind"], message: string, text: string): StepResult => ({
    state: s,
    event: ev(text),
    violation: { kind, message },
  });
  let jumped = false;
  let text = "";
  switch (ins.op) {
    case "load":
      t.regs[ins.reg] = s.shared[ins.var] ?? 0;
      text = `${ins.reg} = ${ins.var} (${t.regs[ins.reg]})`;
      break;
    case "store":
      s.shared[ins.var] = val(ins.value, t);
      text = `${ins.var} = ${s.shared[ins.var]}`;
      break;
    case "set":
      t.regs[ins.reg] = val(ins.value, t);
      text = `${ins.reg} = ${t.regs[ins.reg]}`;
      break;
    case "lock":
      s.owner[ins.m] = tid;
      text = `locks ${ins.m}`;
      break;
    case "trylock": {
      const free = s.owner[ins.m] === undefined;
      if (free) s.owner[ins.m] = tid;
      t.regs[ins.reg] = free ? 1 : 0;
      text = free ? `try_lock ${ins.m} succeeds` : `try_lock ${ins.m} fails (held by ${p.threads[s.owner[ins.m]].name})`;
      break;
    }
    case "unlock":
      if (s.owner[ins.m] !== tid) {
        return fail("unlock-not-owned", `${name} unlocks ${ins.m} without holding it (undefined behaviour in C++).`, `unlocks ${ins.m} (not held)`);
      }
      delete s.owner[ins.m];
      text = `unlocks ${ins.m}`;
      break;
    case "wait":
      if (s.owner[ins.m] !== tid) {
        return fail("wait-without-lock", `${name} waits on ${ins.cv} without holding ${ins.m}.`, `waits on ${ins.cv} (mutex not held)`);
      }
      delete s.owner[ins.m];
      t.status = "waiting";
      t.cv = ins.cv;
      t.m = ins.m;
      (s.waiters[ins.cv] ??= []).push(tid);
      return { state: s, event: ev(`waits on ${ins.cv}, releasing ${ins.m}`) };
    case "notify": {
      const q = s.waiters[ins.cv] ?? [];
      const w = q.shift();
      if (w === undefined) text = `notifies ${ins.cv} (nobody waiting, wake-up lost)`;
      else {
        s.threads[w].status = "relock";
        text = `notifies ${ins.cv}, waking ${p.threads[w].name}`;
      }
      break;
    }
    case "notifyAll": {
      const q = s.waiters[ins.cv] ?? [];
      for (const w of q) s.threads[w].status = "relock";
      s.waiters[ins.cv] = [];
      text = `notifies all on ${ins.cv} (${q.length} woken)`;
      break;
    }
    case "cas": {
      const ok = (s.shared[ins.var] ?? 0) === val(ins.expected, t);
      if (ok) s.shared[ins.var] = val(ins.desired, t);
      t.regs[ins.reg] = ok ? 1 : 0;
      text = `CAS ${ins.var} ${ok ? "succeeds" : "fails"}`;
      break;
    }
    case "atomicAdd": {
      const old = s.shared[ins.var] ?? 0;
      s.shared[ins.var] = old + ins.delta;
      if (ins.reg) t.regs[ins.reg] = old;
      text = `${ins.var} += ${ins.delta} atomically (${old} -> ${s.shared[ins.var]})`;
      break;
    }
    case "jmpIf":
      if (cmp(val(ins.a, t), ins.cmp, val(ins.b, t))) {
        t.pc = ins.to;
        jumped = true;
        text = "branch taken";
      } else text = "branch not taken";
      break;
    case "jmp":
      t.pc = ins.to;
      jumped = true;
      text = "jump";
      break;
    case "assert":
      if (!cmp(val(ins.a, t), ins.cmp, val(ins.b, t))) {
        return fail("assertion", `${name}: ${ins.msg}`, `assertion failed (${ins.msg})`);
      }
      text = "assertion holds";
      break;
  }
  if (!jumped) t.pc += 1;

  // A thread that finishes while still holding a mutex leaks it.
  if (t.status === "ready" && t.pc >= p.threads[tid].code.length) {
    const held = Object.keys(s.owner).filter((m) => s.owner[m] === tid);
    if (held.length > 0) {
      return fail("lock-leak", `${name} finished while still holding ${held.join(", ")}.`, `${text}; exits holding ${held.join(", ")}`);
    }
  }
  return { state: s, event: ev(text) };
}

function heldLocks(s: State, tid: number): string[] {
  return Object.keys(s.owner).filter((m) => s.owner[m] === tid);
}

/** State-level checks: invariants and unsynchronised conflicting accesses. */
export function checkState(p: Program, s: State): Violation | null {
  const v = view(p, s);
  const bad = p.always?.(v);
  if (bad) return { kind: "invariant", message: bad };
  if (p.detectRaces !== false) {
    for (let i = 0; i < s.threads.length; i++) {
      const a = nextInstr(p, s, i);
      if (!a || (a.op !== "load" && a.op !== "store") || a.atomic) continue;
      for (let j = i + 1; j < s.threads.length; j++) {
        const b = nextInstr(p, s, j);
        if (!b || (b.op !== "load" && b.op !== "store") || b.atomic || a.var !== b.var) continue;
        if (a.op === "load" && b.op === "load") continue;
        const common = heldLocks(s, i).filter((m) => heldLocks(s, j).includes(m));
        if (common.length === 0) {
          return {
            kind: "data-race",
            message: `${p.threads[i].name} and ${p.threads[j].name} can access '${a.var}' at the same time with no common lock and at least one write.`,
          };
        }
      }
    }
  }
  return null;
}

/** Called when no thread is enabled. Returns the terminal outcome. */
export function checkStuck(p: Program, s: State): Violation | null {
  if (isFinished(p, s)) {
    const bad = p.final?.(view(p, s));
    return bad ? { kind: "invariant", message: bad } : null;
  }
  const waiting = s.threads
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.status === "waiting")
    .map(({ t, i }) => `${p.threads[i].name} (on ${t.cv})`);
  const blocked = s.threads
    .map((t, i) => ({ t, i }))
    .filter(({ t, i }) => !isDone(p, s, i) && t.status !== "waiting")
    .map(({ t, i }) => {
      const m = t.status === "relock" ? t.m : (p.threads[i].code[t.pc] as { m?: string }).m;
      return `${p.threads[i].name} (needs ${m})`;
    });
  if (waiting.length > 0) {
    return {
      kind: "lost-wakeup",
      message: `Stuck: ${waiting.join(", ")} sleep on a condition variable that nobody will notify${blocked.length ? `; also blocked: ${blocked.join(", ")}` : ""}.`,
    };
  }
  return { kind: "deadlock", message: `Deadlock: ${blocked.join(", ")}.` };
}

export function stateKey(s: State): string {
  const sorted = (o: Record<string, number>) => Object.keys(o).sort().map((k) => [k, o[k]]);
  return JSON.stringify([
    sorted(s.shared),
    sorted(s.owner),
    Object.keys(s.waiters).sort().filter((k) => s.waiters[k].length).map((k) => [k, s.waiters[k]]),
    s.threads.map((t) => [t.pc, t.status, t.cv ?? "", t.m ?? "", sorted(t.regs)]),
  ]);
}

export interface RunResult {
  state: State;
  trace: Event[];
  violation?: Violation;
}

/**
 * Manual scheduler: run exactly the listed thread choices. Stops at the first violation;
 * a choice that is not enabled is ignored. After the schedule, a stuck state is classified.
 */
export function runSchedule(p: Program, schedule: number[]): RunResult {
  let state = initialState(p);
  const trace: Event[] = [];
  for (const tid of schedule) {
    const pre = checkState(p, state);
    if (pre) return { state, trace, violation: pre };
    if (!enabledThreads(p, state).includes(tid)) continue;
    const r = step(p, state, tid);
    trace.push(r.event);
    state = r.state;
    if (r.violation) return { state, trace, violation: r.violation };
  }
  const pre = checkState(p, state);
  if (pre) return { state, trace, violation: pre };
  if (enabledThreads(p, state).length === 0) {
    const stuck = checkStuck(p, state);
    if (stuck) return { state, trace, violation: stuck };
  }
  return { state, trace };
}
