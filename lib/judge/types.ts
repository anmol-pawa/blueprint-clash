/** A virtual file in a judged project. Paths are flat or one directory deep, e.g. `api.h`, `src/store.cpp`. */
export interface ProjectFile {
  path: string;
  content: string;
  /** Provided by the problem (api.h, the hidden driver): the player cannot edit or delete it. */
  readOnly?: boolean;
}

export type Severity = "error" | "warning" | "note";

export interface Diagnostic {
  file: string;
  line: number;
  col: number;
  severity: Severity;
  message: string;
}

export interface TestFailure {
  file: string;
  line: number;
  msg: string;
}

export type TestStatus = "pass" | "fail" | "crash";

export interface TestResult {
  suite: string;
  name: string;
  status: TestStatus;
  ms: number;
  failures: TestFailure[];
}

export interface RunSummary {
  tests: TestResult[];
  passed: number;
  failed: number;
  /** The test that was running when the process died, if any. */
  crashed?: string;
}

export type Verdict = "accepted" | "wrong_behaviour" | "compile_error" | "runtime_error" | "time_limit";
