import type { RunSummary, TestResult, TestFailure, Verdict } from "./types";

interface Begin {
  t: "begin";
  suite: string;
  name: string;
}
interface Result {
  t: "result";
  suite: string;
  name: string;
  status: "pass" | "fail";
  ms: number;
  failures: TestFailure[];
}

/**
 * Parses the JSON-lines stream written by bp_test.h. Lines that are not JSON (user `cout` output)
 * are ignored, so a chatty solution cannot corrupt the verdict. A `begin` with no `result`
 * means that test crashed or was killed.
 */
export function parseTestOutput(stdout: string): RunSummary {
  const tests: TestResult[] = [];
  let open: Begin | null = null;
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.startsWith('{"t":"')) continue;
    let msg: Begin | Result | { t: "summary" };
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.t === "begin") open = msg;
    else if (msg.t === "result") {
      tests.push({ suite: msg.suite, name: msg.name, status: msg.status, ms: msg.ms, failures: msg.failures });
      open = null;
    }
  }
  let crashed: string | undefined;
  if (open) {
    crashed = `${open.suite}.${open.name}`;
    tests.push({ suite: open.suite, name: open.name, status: "crash", ms: 0, failures: [] });
  }
  const passed = tests.filter((t) => t.status === "pass").length;
  return { tests, passed, failed: tests.length - passed, crashed };
}

export interface RunOutcome {
  compileOk: boolean;
  timedOut: boolean;
  exitCode: number | null;
  summary: RunSummary;
}

export function verdictOf(o: RunOutcome): Verdict {
  if (!o.compileOk) return "compile_error";
  if (o.timedOut) return "time_limit";
  if (o.summary.crashed || (o.summary.tests.length === 0 && o.exitCode !== 0)) return "runtime_error";
  return o.summary.failed === 0 && o.summary.tests.length > 0 ? "accepted" : "wrong_behaviour";
}
