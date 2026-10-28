// A2b spike: compile + link a multi-file C++17 project with @yowasp/clang, run it via WASI.
// Usage: node scripts/spike/clang-wasm.mjs   (prints timings; see docs/adr/0001-cpp-toolchain.md)
import { runClang } from "@yowasp/clang";
import { WASI } from "node:wasi";
import { readFileSync } from "node:fs";

const header = readFileSync(new URL("../../lib/judge/cpp/bp_test.h", import.meta.url), "utf8");
const files = {
  "bp_test.h": header,
  "shape.h": `#pragma once
#include <memory>
#include <string>
struct Shape { virtual ~Shape() = default; virtual double area() const = 0; };
std::unique_ptr<Shape> makeSquare(double side);`,
  "shape.cpp": `#include "shape.h"
struct Square : Shape { double s; explicit Square(double s) : s(s) {} double area() const override { return s * s; } };
std::unique_ptr<Shape> makeSquare(double side) { return std::make_unique<Square>(side); }`,
  "tests.cpp": `#define BP_TEST_MAIN
#include "bp_test.h"
#include "shape.h"
TEST(Shape, square_area) { EXPECT_EQ(makeSquare(3)->area(), 9.0); }
TEST(Shape, square_wrong) { EXPECT_EQ(makeSquare(2)->area(), 5.0); }
`,
};

const t0 = performance.now();
let out = "";
const flags = ["clang++", "--target=wasm32-wasip1", "-std=c++17", "-O1", "-fno-exceptions", "shape.cpp", "tests.cpp", "-o", "a.wasm"];
let res;
try {
  res = await runClang(flags, files, { stderr: (b) => { out += typeof b === "string" ? b : new TextDecoder().decode(b ?? new Uint8Array()); } });
} catch (e) { console.error("compile failed:", e.message, "\n" + out); process.exit(1); }
const t1 = performance.now();
if (!res["a.wasm"]) { console.error("compile failed\n", out); process.exit(1); }
console.log(`compile+link: ${(t1 - t0).toFixed(0)} ms, wasm ${(res["a.wasm"].length / 1024).toFixed(0)} KiB`);

const second = performance.now();
await runClang(flags, files, { stderr: () => {} });
console.log(`second compile (warm): ${(performance.now() - second).toFixed(0)} ms`);

async function runWasm(args) {
  let stdout = "";
  const { mkdtempSync, readFileSync: rf, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(tmpdir() + "/bpw-");
  const outPath = dir + "/out.txt";
  const fd = (await import("node:fs")).openSync(outPath, "w");
  const wasi = new WASI({ version: "preview1", returnOnExit: true, args: ["a.wasm", ...args], stdout: fd });
  const inst = await WebAssembly.instantiate(await WebAssembly.compile(res["a.wasm"]), { wasi_snapshot_preview1: wasi.wasiImport });
  const t = performance.now();
  const code = wasi.start(inst);
  const ms = performance.now() - t;
  stdout = rf(outPath, "utf8");
  rmSync(dir, { recursive: true });
  return { code, ms, stdout };
}
const all = await runWasm([]);
console.log(`run all: ${all.ms.toFixed(1)} ms exit=${all.code}\n${all.stdout}`);
const list = (await runWasm(["--list"])).stdout.trim().split("\n");
for (const name of list) {
  const r = await runWasm(["--only", name]);
  console.log(`--only ${name}: ${r.ms.toFixed(1)} ms exit=${r.code}`);
}
