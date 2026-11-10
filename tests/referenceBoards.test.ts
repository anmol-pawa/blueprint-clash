import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { rubric } from "@/content/workshop/library-management/rubric";
import { godServiceBoard, referenceBoard } from "@/content/workshop/library-management/board";
import { boardToSkeleton, scoreBoard, validateBoard } from "@/lib/board";

describe("library-management reference board", () => {
  it("is valid and scores 1.0 against the rubric at every phase", () => {
    expect(validateBoard(referenceBoard).filter((i) => i.severity === "error")).toEqual([]);
    for (const phase of ["base", "storm1"] as const) {
      const s = scoreBoard(referenceBoard, rubric, phase);
      expect(s.score).toBe(1);
      expect(s.flags).toEqual([]);
    }
  });
  it("exports headers that compile", () => {
    const files = boardToSkeleton(referenceBoard);
    const dir = mkdtempSync(path.join(tmpdir(), "refboard-"));
    for (const f of files) writeFileSync(path.join(dir, f.path), f.content);
    const main = path.join(dir, "main.cpp");
    writeFileSync(main, files.map((f) => `#include "${f.path}"`).join("\n") + "\nint main() {}\n");
    expect(() => execFileSync("g++", ["-std=c++17", "-fsyntax-only", "-Wall", "-I", dir, main], { stdio: "pipe" })).not.toThrow();
  });
  it("rejects the god-service board with a god-class flag and a low score", () => {
    const s = scoreBoard(godServiceBoard, rubric);
    expect(s.flags.some((f) => f.kind === "god-class")).toBe(true);
    expect(s.score).toBeLessThan(0.5);
  });
});
