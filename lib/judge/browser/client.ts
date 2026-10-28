// Main-thread orchestration: compile in a persistent worker, run in a disposable one with a timeout.
import { parseTestOutput, verdictOf } from "../results";
import type { ProjectFile } from "../types";
import type { BrowserJudgeResult, CompileResponse, RunResponse } from "./protocol";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
let compiler: Worker | null = null;
let header: Promise<string> | null = null;

const getHeader = () =>
  (header ??= fetch(`${BASE}/clang/bp_test.h`).then((r) => {
    if (!r.ok) throw new Error(`bp_test.h: HTTP ${r.status}`);
    return r.text();
  }));

function compile(files: ProjectFile[], hdr: string): Promise<CompileResponse> {
  compiler ??= new Worker(new URL("./compile.worker.ts", import.meta.url));
  const w = compiler;
  return new Promise((resolve, reject) => {
    w.onmessage = (e: MessageEvent<CompileResponse>) => resolve(e.data);
    w.onerror = (e) => {
      compiler = null; // a crashed toolchain is rebuilt on the next submit
      reject(new Error(e.message || "compiler worker crashed"));
    };
    w.postMessage({ base: location.origin + BASE, req: { files, header: hdr } });
  });
}

function run(wasm: Uint8Array<ArrayBuffer>, timeoutMs: number): Promise<RunResponse | "timeout"> {
  const w = new Worker(new URL("./run.worker.ts", import.meta.url));
  return new Promise((resolve) => {
    const timer = setTimeout(() => (w.terminate(), resolve("timeout")), timeoutMs);
    w.onmessage = (e: MessageEvent<RunResponse>) => (clearTimeout(timer), w.terminate(), resolve(e.data));
    w.onerror = () => (clearTimeout(timer), w.terminate(), resolve({ exitCode: null, stdout: "", stderr: "", runMs: 0, trap: "worker error" }));
    w.postMessage(wasm, [wasm.buffer]);
  });
}

export async function judgeInBrowser(files: ProjectFile[], timeoutMs = 10000): Promise<BrowserJudgeResult> {
  const c = await compile(files, await getHeader());
  const empty = parseTestOutput("");
  if (!c.ok) {
    if ("fatal" in c) throw new Error(`Toolchain failure: ${c.fatal}`);
    return { verdict: "compile_error", diagnostics: c.diagnostics, summary: empty, stdout: "", timings: { compileMs: c.compileMs, runMs: 0 } };
  }
  const r = await run(c.wasm, timeoutMs);
  const timedOut = r === "timeout";
  const stdout = timedOut ? "" : r.stdout;
  const summary = parseTestOutput(stdout);
  const exitCode = timedOut ? null : r.exitCode;
  return {
    verdict: verdictOf({ compileOk: true, timedOut, exitCode, summary }),
    diagnostics: c.diagnostics,
    summary,
    stdout,
    timings: { compileMs: c.compileMs, runMs: timedOut ? timeoutMs : r.runMs },
  };
}
