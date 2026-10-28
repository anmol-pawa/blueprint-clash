// A2b spike: measure @yowasp/clang compiling a multi-file project that uses bp_test.h, then run it via WASI.
import { readFileSync } from "node:fs";
import { WASI } from "node:wasi";

const t0 = performance.now();
const { runClang } = await import("@yowasp/clang");
const header = readFileSync("lib/judge/cpp/bp_test.h", "utf8");
const files = {
  "bp_test.h": header,
  "api.h": "#pragma once\nclass Counter { public: virtual ~Counter() = default; virtual int next() = 0; };\nCounter* make();\n",
  "impl.cpp": `#include "api.h"\n#include <memory>\nstruct C : Counter { int n=0; int next() override { return ++n; } };\nCounter* make(){ return new C; }\n`,
  "tests.cpp": `#define BP_TEST_MAIN\n#include "bp_test.h"\n#include "api.h"\n#include <memory>\nTEST(Counter, counts){ std::unique_ptr<Counter> c(make()); EXPECT_EQ(c->next(),1); EXPECT_EQ(c->next(),2); }\n`,
};
const tImport = performance.now();
let err = "";
const dec = new TextDecoder();
const run = async (label) => {
  const s = performance.now();
  const tree = await runClang(["clang++", "-std=c++17", "-O1", "-fno-exceptions", "impl.cpp", "tests.cpp", "-o", "a.wasm"], files, {
    stderr: (b) => { if (b) err += dec.decode(b); },
  });
  console.log(label, "compile+link ms", Math.round(performance.now() - s));
  return tree["a.wasm"];
};
let wasmBytes; try { wasmBytes = await run("cold"); } catch { console.log("FAIL", err); process.exit(1); }
console.log("import ms", Math.round(tImport - t0), "wasm bytes", wasmBytes?.length, err.slice(0, 600));
await run("warm");
const mod = await WebAssembly.compile(wasmBytes);
const wasi = new WASI({ version: "preview1", returnOnExit: true, args: ["a.wasm"] });
const inst = await WebAssembly.instantiate(mod, { wasi_snapshot_preview1: wasi.wasiImport });
const s = performance.now();
console.log("exit", wasi.start(inst), "run ms", Math.round(performance.now() - s));
