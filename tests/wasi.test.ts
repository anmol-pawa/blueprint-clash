import { describe, expect, it } from "vitest";
import { createWasi, ProcExit } from "@/lib/judge/browser/wasi";

describe("createWasi", () => {
  it("captures fd_write output and reports args", () => {
    const wasi = createWasi(["a.wasm"]);
    const mem = new WebAssembly.Memory({ initial: 1 });
    wasi.bind(mem);
    const bytes = new Uint8Array(mem.buffer);
    const v = new DataView(mem.buffer);
    bytes.set(new TextEncoder().encode("hello"), 100);
    v.setUint32(0, 100, true);
    v.setUint32(4, 5, true);
    expect(wasi.imports.fd_write(1, 0, 1, 16)).toBe(0);
    expect(v.getUint32(16, true)).toBe(5);
    expect(wasi.stdout()).toBe("hello");
    expect(wasi.imports.fd_write(7, 0, 1, 16)).not.toBe(0);
    wasi.imports.args_sizes_get(32, 36);
    expect([v.getUint32(32, true), v.getUint32(36, true)]).toEqual([1, 7]);
  });

  it("proc_exit throws ProcExit with the code", () => {
    expect(() => createWasi().imports.proc_exit(3)).toThrow(ProcExit);
  });
});
