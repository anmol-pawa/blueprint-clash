/// <reference lib="webworker" />
// Runs one compiled test binary. A fresh worker per run, so the client can terminate it on timeout.
import { createWasi, ProcExit } from "./wasi";
import type { RunResponse } from "./protocol";

self.onmessage = async (e: MessageEvent<Uint8Array<ArrayBuffer>>) => {
  const wasi = createWasi();
  const t0 = performance.now();
  const res: RunResponse = { exitCode: 0, stdout: "", stderr: "", runMs: 0 };
  try {
    const module = await WebAssembly.compile(e.data);
    // Any WASI call we do not implement answers ENOSYS instead of failing to link.
    const imports: Record<string, unknown> = { ...wasi.imports };
    for (const i of WebAssembly.Module.imports(module)) if (i.module === "wasi_snapshot_preview1" && !(i.name in imports)) imports[i.name] = () => 52;
    const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: imports as WebAssembly.ModuleImports });
    wasi.bind(instance.exports.memory as WebAssembly.Memory);
    (instance.exports._start as () => void)();
  } catch (err) {
    if (err instanceof ProcExit) res.exitCode = err.code;
    else {
      res.exitCode = null;
      res.trap = String(err);
    }
  }
  res.stdout = wasi.stdout();
  res.stderr = wasi.stderr();
  res.runMs = Math.round(performance.now() - t0);
  (self as unknown as Worker).postMessage(res);
};
