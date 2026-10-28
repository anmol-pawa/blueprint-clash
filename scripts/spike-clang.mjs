// A2b spike: measure @yowasp/clang (compile + link multi-file C++ project, run via WASI) in Node.
// Usage: node scripts/spike-clang.mjs
import { readFileSync } from "node:fs";
import { WASI } from "node:wasi";
import { commands } from "@yowasp/clang";

const bpTest = readFileSync(new URL("../lib/judge/cpp/bp_test.h", import.meta.url), "utf8");
const files = {
  "bp_test.h": bpTest,
  "shape.h": `#pragma once
#include <memory>
#include <string>
class Shape { public: virtual ~Shape() = default; virtual double area() const = 0; };
class Rect : public Shape { double w_, h_; public: Rect(double w, double h); double area() const override; };
std::unique_ptr<Shape> makeRect(double w, double h);`,
  "shape.cpp": `#include "shape.h"
Rect::Rect(double w, double h) : w_(w), h_(h) {}
double Rect::area() const { return w_ * h_; }
std::unique_ptr<Shape> makeRect(double w, double h) { return std::make_unique<Rect>(w, h); }`,
  "tests.cpp": `#include "bp_test.h"
#include "shape.h"
TEST(Shape, rect_area) { auto s = makeRect(3, 4); EXPECT_EQ(s->area(), 12.0); }
TEST(Shape, rect_wrong) { auto s = makeRect(3, 4); EXPECT_EQ(s->area(), 13.0); }`,
  "main.cpp": `#define BP_TEST_MAIN
#include "bp_test.h"`,
};

const t0 = performance.now();
const objs = {};
const flags = ["-std=c++20", "-O1", "-fno-exceptions"];
for (const src of ["shape.cpp", "tests.cpp", "main.cpp"]) {
  const t = performance.now();
  const out = await commands["clang++"](
    ["--target=wasm32-wasip1", ...flags, "-c", src, "-o", src.replace(".cpp", ".o")],
    files,
    { stderr: (b) => b && process.stderr.write(b) },
  );
  Object.assign(objs, { [src.replace(".cpp", ".o")]: out[src.replace(".cpp", ".o")] });
  console.log(`compile ${src}: ${(performance.now() - t).toFixed(0)} ms`);
}
const tl = performance.now();
const linked = await commands["clang++"](
  ["--target=wasm32-wasip1", "shape.o", "tests.o", "main.o", "-o", "a.wasm"],
  objs,
  { stderr: (b) => b && process.stderr.write(b) },
);
console.log(`link: ${(performance.now() - tl).toFixed(0)} ms, wasm ${linked["a.wasm"].length} bytes`);
console.log(`total build: ${(performance.now() - t0).toFixed(0)} ms`);

const tr = performance.now();
const wasi = new WASI({ version: "preview1", returnOnExit: true, args: ["tests.wasm"] });
const mod = await WebAssembly.compile(linked["a.wasm"]);
const inst = await WebAssembly.instantiate(mod, { wasi_snapshot_preview1: wasi.wasiImport });
const code = wasi.start(inst);
console.log(`run: ${(performance.now() - tr).toFixed(0)} ms, exit ${code}`);
