// Real @yowasp/clang, run in Node. Slow (each translation unit is a few seconds), so few, broad tests.
import { WASI } from "node:wasi";
import { describe, expect, it } from "vitest";
import { commands } from "@yowasp/clang";
import { buildProject, type ClangCommand } from "@/lib/judge/toolchain";
import { DRIVER, readHeader } from "@/lib/judge/native";
import { parseTestOutput, verdictOf } from "@/lib/judge/results";
import type { ProjectFile } from "@/lib/judge/types";

const clang = commands["clang++"] as unknown as ClangCommand;

async function runWasm(wasm: Uint8Array) {
  const dir = await import("node:fs/promises").then((fs) => fs.mkdtemp("/tmp/bp-wasi-"));
  const path = `${dir}/out.txt`;
  const fs = await import("node:fs");
  const fd = fs.openSync(path, "w");
  // argv must be non-empty: wasi-libc exits 71 on argc == 0.
  const wasi = new WASI({ version: "preview1", returnOnExit: true, args: ["a.wasm"], stdout: fd });
  const inst = await WebAssembly.instantiate(await WebAssembly.compile(wasm as BufferSource), {
    wasi_snapshot_preview1: wasi.wasiImport,
  });
  const exitCode = wasi.start(inst);
  fs.closeSync(fd);
  return { exitCode, stdout: fs.readFileSync(path, "utf8") };
}

const shapeH = '#pragma once\n#include <memory>\nclass Shape { public: virtual ~Shape() = default; virtual double area() const = 0; };\nstd::unique_ptr<Shape> makeSquare(double s);\n';
const shapeCpp = (body: string): ProjectFile => ({
  path: "src/shape.cpp",
  content: `#include "../shape.h"\nnamespace { struct Sq : Shape { double s; explicit Sq(double v) : s(v) {} double area() const override { return ${body}; } }; }\nstd::unique_ptr<Shape> makeSquare(double s) { return std::make_unique<Sq>(s); }\n`,
});
const tests: ProjectFile = {
  path: "tests.cpp",
  content: '#include "bp_test.h"\n#include "shape.h"\nTEST(Shape, square_area) { EXPECT_EQ(makeSquare(3)->area(), 9.0); }\n',
  readOnly: true,
};

describe("browser toolchain (@yowasp/clang)", () => {
  it("builds a multi-file project, links it and judges behaviour", async () => {
    const header = { path: "bp_test.h", content: await readHeader(), readOnly: true };
    const base = [header, { path: "shape.h", content: shapeH }, tests, DRIVER];

    const good = await buildProject(clang, [...base, shapeCpp("s * s")]);
    expect(good.ok).toBe(true);
    const ran = await runWasm(good.wasm!);
    expect(verdictOf({ compileOk: true, timedOut: false, exitCode: ran.exitCode, summary: parseTestOutput(ran.stdout) })).toBe("accepted");

    const bad = await buildProject(clang, [...base, shapeCpp("s + s")]);
    expect(bad.ok).toBe(true);
    const ranBad = await runWasm(bad.wasm!);
    const summary = parseTestOutput(ranBad.stdout);
    expect(verdictOf({ compileOk: true, timedOut: false, exitCode: ranBad.exitCode, summary })).toBe("wrong_behaviour");
    expect(summary.tests[0].failures[0]).toMatchObject({ file: "tests.cpp", line: 3 });
  });

  it("maps compile errors to the player's file and line, and reports link errors", async () => {
    const header = { path: "bp_test.h", content: await readHeader(), readOnly: true };
    const base = [header, { path: "shape.h", content: shapeH }, tests, DRIVER];

    const broken = await buildProject(clang, [...base, { path: "src/shape.cpp", content: '#include "../shape.h"\nint x = ;\n' }]);
    expect(broken.ok).toBe(false);
    expect(broken.diagnostics.find((d) => d.severity === "error")).toMatchObject({ file: "src/shape.cpp", line: 2 });

    const missing = await buildProject(clang, [...base, { path: "src/shape.cpp", content: "// forgot makeSquare\n" }]);
    expect(missing.ok).toBe(false);
    expect(missing.stderr).toContain("undefined symbol: makeSquare");
  });

  it("rejects throw in the browser toolchain with a clear compiler error", async () => {
    const r = await buildProject(clang, [{ path: "a.cpp", content: "void f() { throw 1; }\n" }]);
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0].message).toMatch(/exceptions/);
  });
});
