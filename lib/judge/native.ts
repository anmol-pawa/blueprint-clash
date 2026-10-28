// Native (g++) runner for content verification and tests. Node only: never imported by the app bundle.
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { parseDiagnostics, hasErrors } from "./diagnostics";
import { translationUnits } from "./project";
import { parseTestOutput, verdictOf, type RunOutcome } from "./results";
import type { Diagnostic, ProjectFile, Verdict, RunSummary } from "./types";

const run = promisify(execFile);
const HEADER_DIR = join(dirname(fileURLToPath(import.meta.url)), "cpp");

export interface NativeResult {
  verdict: Verdict;
  diagnostics: Diagnostic[];
  summary: RunSummary;
  stdout: string;
}

export interface NativeOptions {
  std?: string;
  timeoutMs?: number;
}

/** Compiles every .cpp in `files` together with bp_test.h on the include path, then runs the binary. */
export async function judgeNative(files: ProjectFile[], opts: NativeOptions = {}): Promise<NativeResult> {
  const dir = await mkdtemp(join(tmpdir(), "bp-judge-"));
  try {
    for (const f of files) {
      const full = join(dir, f.path);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, f.content);
    }
    const bin = join(dir, "a.out");
    const args = [`-std=${opts.std ?? "c++20"}`, "-O1", "-Wall", "-Wextra", `-I${dir}`, `-I${HEADER_DIR}`, ...translationUnits(files), "-o", bin];
    let compileErr = "";
    try {
      await run("g++", args, { cwd: dir, maxBuffer: 16 << 20 });
    } catch (e) {
      compileErr = (e as { stderr?: string }).stderr ?? String(e);
    }
    const diagnostics = parseDiagnostics(compileErr, dir + "/");
    if (compileErr && hasErrors(diagnostics)) {
      const summary = parseTestOutput("");
      return { verdict: verdictOf({ compileOk: false, timedOut: false, exitCode: null, summary }), diagnostics, summary, stdout: "" };
    }
    let stdout = "";
    let exitCode: number | null = 0;
    let timedOut = false;
    try {
      ({ stdout } = await run(bin, [], { timeout: opts.timeoutMs ?? 10000, maxBuffer: 16 << 20 }));
    } catch (e) {
      const err = e as { stdout?: string; code?: number | string; killed?: boolean; signal?: string };
      stdout = err.stdout ?? "";
      timedOut = !!err.killed && err.signal === "SIGTERM";
      exitCode = typeof err.code === "number" ? err.code : null;
    }
    const summary = parseTestOutput(stdout);
    const outcome: RunOutcome = { compileOk: true, timedOut, exitCode, summary };
    return { verdict: verdictOf(outcome), diagnostics, summary, stdout };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function readHeader(): Promise<string> {
  return readFile(join(HEADER_DIR, "bp_test.h"), "utf8");
}

/** The standard hidden driver: the single translation unit that owns main(). */
export const DRIVER: ProjectFile = {
  path: "driver.cpp",
  content: '#define BP_TEST_MAIN\n#include "bp_test.h"\n',
  readOnly: true,
};
