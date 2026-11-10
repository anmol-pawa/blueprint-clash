import { describe, expect, it } from "vitest";
import {
  counterAtomic,
  counterLocked,
  counterRacy,
  explore,
  handshake,
  renderCpp,
  runSchedule,
  transferDeadlock,
  transferOrdered,
  type Program,
} from "@/lib/concurrency";

const kinds = (p: Program, collectAll = true) => explore(p, { collectAll }).findings.map((f) => f.violation.kind).sort();

describe("race explorer", () => {
  it("finds the lost update and the data race in an unsynchronised counter", () => {
    expect(kinds(counterRacy())).toEqual(["data-race", "invariant"]);
  });

  it("proves the mutex and atomic fixes for every interleaving", () => {
    for (const p of [counterLocked(), counterAtomic()]) {
      const r = explore(p);
      expect(r.findings).toEqual([]);
      expect(r.proved).toBe(true);
      expect(r.statesExplored).toBeGreaterThan(3);
    }
  });

  it("reports the lost update with a replayable shortest schedule", () => {
    const p = { ...counterRacy(), detectRaces: false };
    const r = explore(p);
    const f = r.findings[0];
    expect(f.violation.kind).toBe("invariant");
    // Both loads happen before either store: 6 steps is the minimum for two threads of 3.
    expect(f.schedule).toHaveLength(6);
    const replay = runSchedule(p, f.schedule);
    expect(replay.violation?.message).toContain("counter is 1");
    expect(replay.trace).toHaveLength(6);
  });

  it("finds the AB-BA deadlock and proves lock ordering", () => {
    const bad = explore(transferDeadlock());
    expect(bad.findings[0].violation.kind).toBe("deadlock");
    expect(bad.findings[0].schedule).toHaveLength(2);
    expect(explore(transferOrdered()).proved).toBe(true);
  });

  it("finds a lost wake-up when the producer skips the lock, and proves the while-loop fix", () => {
    const bad = explore(handshake("unlocked-producer"));
    expect(bad.findings[0].violation.kind).toBe("lost-wakeup");
    expect(explore(handshake("while-wait")).proved).toBe(true);
  });

  it("breaks an if-wait only when spurious wake-ups are allowed", () => {
    const withSpurious = explore(handshake("if-wait"));
    expect(withSpurious.findings[0].violation.kind).toBe("assertion");
    const strict = explore({ ...handshake("if-wait"), spurious: false });
    expect(strict.proved).toBe(true);
  });

  it("flags unlock of a mutex that is not held and a thread that exits holding a lock", () => {
    const unlock: Program = { id: "u", shared: {}, threads: [{ name: "T", code: [{ op: "unlock", m: "m" }] }] };
    expect(explore(unlock).findings[0].violation.kind).toBe("unlock-not-owned");
    const leak: Program = { id: "l", shared: {}, threads: [{ name: "T", code: [{ op: "lock", m: "m" }] }] };
    expect(explore(leak).findings[0].violation.kind).toBe("lock-leak");
  });

  it("supports CAS retry loops: only one CAS wins per round and the total is exact", () => {
    const casLoop = [
      { op: "load", reg: "r", var: "n", atomic: true },
      { op: "cas", var: "n", expected: { reg: "r" }, desired: { reg: "r", add: 1 }, reg: "ok" },
      { op: "jmpIf", a: { reg: "ok" }, cmp: "eq", b: 0, to: 0 },
    ] as const;
    const p: Program = {
      id: "cas",
      shared: { n: 0 },
      threads: [
        { name: "A", code: [...casLoop] },
        { name: "B", code: [...casLoop] },
      ],
      final: (v) => (v.shared.n === 2 ? null : `n=${v.shared.n}`),
    };
    expect(explore(p).proved).toBe(true);
  });

  it("notifyAll wakes every waiter", () => {
    const waiter = (): Program["threads"][number] => ({
      name: "W",
      code: [
        { op: "lock", m: "m" },
        { op: "wait", cv: "cv", m: "m" },
        { op: "unlock", m: "m" },
      ],
    });
    const p: Program = {
      id: "all",
      shared: {},
      threads: [
        waiter(),
        waiter(),
        {
          name: "N",
          code: [
            { op: "lock", m: "m" },
            { op: "unlock", m: "m" },
            { op: "notifyAll", cv: "cv" },
          ],
        },
      ],
    };
    // The notifier can run before the waiters sleep, so the explorer must find the lost wake-up too.
    expect(explore(p).findings[0].violation.kind).toBe("lost-wakeup");
    // Both waiters sleep first, then one notifyAll wakes both and both finish.
    const ok = runSchedule(p, [0, 0, 1, 1, 2, 2, 2, 0, 0, 1, 1]);
    expect(ok.violation).toBeUndefined();
    expect(ok.state.threads.map((t) => t.pc)).toEqual([3, 3, 3]);
  });

  it("stops at the state bound without claiming a proof", () => {
    const r = explore(counterLocked(), { maxStates: 4 });
    expect(r.complete).toBe(false);
    expect(r.proved).toBe(false);
  });

  it("is deterministic and keeps C++ snippets attached to the steps", () => {
    expect(explore(counterRacy(), { collectAll: true })).toEqual(explore(counterRacy(), { collectAll: true }));
    expect(renderCpp(counterLocked(), 0)).toEqual([
      "std::lock_guard<std::mutex> g(m);",
      "int r = counter;",
      "counter = r + 1;",
    ]);
  });
});
