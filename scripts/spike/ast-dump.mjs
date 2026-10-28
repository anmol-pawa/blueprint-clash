// A2b spike: time clang++ -fsyntax-only -ast-dump=json (Senior Review input) and measure the JSON size.
import { runClang } from "@yowasp/clang";
const files = {
  "shape.h": `#pragma once
#include <memory>
#include <vector>
#include <string>
class Shape { public: virtual ~Shape() = default; virtual double area() const = 0; };
class Square final : public Shape { public: explicit Square(double s) : s_(s) {} double area() const override { return s_ * s_; } private: double s_; };
`,
  "main.cpp": `#include "shape.h"\nint main() { std::vector<std::unique_ptr<Shape>> v; v.push_back(std::make_unique<Square>(2)); return (int)v[0]->area(); }`,
};
for (const [label, extra] of [["filter=Square", ["-Xclang", "-ast-dump-filter=Square"]]]) {
  let out = "";
  const t = performance.now();
  try {
    await runClang(["clang++", "--target=wasm32-wasip1", "-std=c++17", "-fno-exceptions", "-fsyntax-only", "-Xclang", "-ast-dump=json", ...extra, "main.cpp"], files,
      { stdout: (b) => { out += typeof b === "string" ? b : new TextDecoder().decode(b ?? new Uint8Array()); }, stderr: () => {} });
  } catch (e) { console.log("failed", e.message); }
  console.log(`${label}: ${(performance.now() - t).toFixed(0)} ms, ${(out.length / 1e6).toFixed(2)} MB JSON`);
}
