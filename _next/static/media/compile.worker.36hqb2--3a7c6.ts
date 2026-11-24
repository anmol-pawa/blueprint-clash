/// <reference lib="webworker" />
// Compiles + links a project with clang→WASM. Persistent so the ~100 MB toolchain loads once per page.
import { hasErrors, parseDiagnostics } from "../diagnostics";
import { translationUnits } from "../project";
import type { CompileRequest } from "./protocol";

type RunClang = (args: string[], files: Record<string, string>, opts: { stderr?: (b: Uint8Array | null) => void }) => Promise<Record<string, Uint8Array | string>>;

let clang: Promise<RunClang> | null = null;
const loadClang = (base: string) =>
  (clang ??= import(/* webpackIgnore: true */ /* @vite-ignore */ `${base}/clang/bundle.js`).then((m) => m.runClang as RunClang));

const dec = new TextDecoder();

self.onmessage = async (e: MessageEvent<{ base: string; req: CompileRequest }>) => {
  const { base, req } = e.data;
  const t0 = performance.now();
  let stderr = "";
  const done = (r: { ok: boolean; wasm?: Uint8Array<ArrayBuffer>; diagnostics: unknown[]; stderr?: string; fatal?: string }) =>
    (self as unknown as Worker).postMessage({ ...r, compileMs: Math.round(performance.now() - t0) }, r.wasm ? [r.wasm.buffer] : []);
  try {
    const runClang = await loadClang(base);
    const files: Record<string, string> = { "bp_test.h": req.header };
    for (const f of req.files) files[f.path] = f.content;
    const tree = await runClang(
      ["clang++", `-std=${req.std ?? "c++20"}`, "-O1", "-fno-exceptions", "-Wall", "-Wextra", ...translationUnits(req.files), "-o", "a.wasm"],
      files,
      { stderr: (b) => void (b && (stderr += dec.decode(b))) },
    );
    const diagnostics = parseDiagnostics(stderr, "/work/");
    const wasm = tree["a.wasm"];
    if (!(wasm instanceof Uint8Array)) throw new Error("no a.wasm produced");
    done({ ok: true, wasm: wasm.slice() as Uint8Array<ArrayBuffer>, diagnostics });
  } catch (err) {
    const diagnostics = parseDiagnostics(stderr, "/work/");
    // clang exits non-zero by throwing; real compile errors carry diagnostics, anything else is a toolchain failure.
    if (hasErrors(diagnostics)) done({ ok: false, diagnostics, stderr });
    else done({ ok: false, fatal: String(err), diagnostics, stderr });
  }
};
