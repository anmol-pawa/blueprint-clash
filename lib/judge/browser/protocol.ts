import type { Diagnostic, ProjectFile, RunSummary, Verdict } from "../types";

export interface CompileRequest {
  files: ProjectFile[];
  header: string;
  std?: string;
}

export type CompileResponse =
  | { ok: true; wasm: Uint8Array<ArrayBuffer>; diagnostics: Diagnostic[]; compileMs: number }
  | { ok: false; diagnostics: Diagnostic[]; stderr: string; compileMs: number }
  | { ok: false; fatal: string; diagnostics: Diagnostic[]; stderr: string; compileMs: number };

export interface RunResponse {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  runMs: number;
  /** Set when the program trapped (unreachable, out-of-bounds, stack overflow). */
  trap?: string;
}

export interface BrowserJudgeResult {
  verdict: Verdict;
  diagnostics: Diagnostic[];
  summary: RunSummary;
  stdout: string;
  timings: { compileMs: number; runMs: number };
}
