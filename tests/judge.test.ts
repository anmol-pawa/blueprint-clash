import { describe, expect, it } from "vitest";
import { parseDiagnostics, playerFacing } from "@/lib/judge/diagnostics";
import { mergeProject, translationUnits, validatePath } from "@/lib/judge/project";
import { parseTestOutput, verdictOf } from "@/lib/judge/results";
import { DRIVER, judgeNative } from "@/lib/judge/native";
import type { ProjectFile } from "@/lib/judge/types";

describe("project", () => {
  it("validates paths", () => {
    expect(validatePath("store.cpp")).toBeNull();
    expect(validatePath("src/store.h")).toBeNull();
    expect(validatePath("../x.cpp")).not.toBeNull();
    expect(validatePath("/etc/x.cpp")).not.toBeNull();
    expect(validatePath("a/b/c.cpp")).not.toBeNull();
    expect(validatePath("notes.txt")).not.toBeNull();
  });
  it("refuses to overwrite read-only files", () => {
    const provided: ProjectFile[] = [{ path: "api.h", content: "//", readOnly: true }];
    expect(() => mergeProject(provided, [{ path: "api.h", content: "x" }])).toThrow(/read-only/);
    const merged = mergeProject(provided, [{ path: "lib.cpp", content: "int x;" }]);
    expect(translationUnits(merged)).toEqual(["lib.cpp"]);
  });
});

describe("diagnostics", () => {
  const stderr = [
    "/work/src/store.cpp:12:5: error: use of undeclared identifier 'foo'",
    "   12 |     foo();",
    "      |     ^",
    "/work/api.h:3:1: note: declared here",
    "/usr/include/c++/13/vector:5:2: warning: something",
    "/work/main.cpp:1:10: fatal error: 'nope.h' file not found",
  ].join("\n");
  it("maps files and severities", () => {
    const d = parseDiagnostics(stderr);
    expect(d).toHaveLength(4);
    expect(d[0]).toEqual({ file: "src/store.cpp", line: 12, col: 5, severity: "error", message: "use of undeclared identifier 'foo'" });
    expect(d[3].severity).toBe("error");
  });
  it("keeps only editable, non-note diagnostics for players", () => {
    const d = playerFacing(parseDiagnostics(stderr), new Set(["src/store.cpp"]));
    expect(d.map((x) => x.file)).toEqual(["src/store.cpp"]);
  });
});

describe("results", () => {
  it("ignores user output and attributes crashes", () => {
    const out = [
      "hello from user cout",
      '{"t":"begin","suite":"A","name":"ok"}',
      '{"t":"result","suite":"A","name":"ok","status":"pass","ms":1,"failures":[]}',
      '{"t":"begin","suite":"A","name":"boom"}',
    ].join("\n");
    const s = parseTestOutput(out);
    expect(s.crashed).toBe("A.boom");
    expect(s.passed).toBe(1);
    expect(verdictOf({ compileOk: true, timedOut: false, exitCode: null, summary: s })).toBe("runtime_error");
  });
  it("maps verdicts", () => {
    const empty = parseTestOutput("");
    expect(verdictOf({ compileOk: false, timedOut: false, exitCode: null, summary: empty })).toBe("compile_error");
    expect(verdictOf({ compileOk: true, timedOut: true, exitCode: null, summary: empty })).toBe("time_limit");
  });
});

const TESTS = `#include "bp_test.h"
#include "api.h"
#include <stdexcept>
TEST(Counter, starts_at_zero) { Counter c; EXPECT_EQ(c.value(), 0); }
TEST(Counter, increments) { Counter c; c.inc(); c.inc(); EXPECT_EQ(c.value(), 2); }
TEST(Counter, throws_on_underflow) { Counter c; EXPECT_THROWS(c.dec(), std::underflow_error); }
`;
const API = `#pragma once
class Counter { public: int value() const; void inc(); void dec(); private: int n_ = 0; };\n`;
const GOOD = `#include "api.h"
#include <stdexcept>
int Counter::value() const { return n_; }
void Counter::inc() { ++n_; }
void Counter::dec() { if (n_ == 0) throw std::underflow_error("x"); --n_; }
`;

function project(impl: string): ProjectFile[] {
  return [
    DRIVER,
    { path: "api.h", content: API, readOnly: true },
    { path: "tests.cpp", content: TESTS, readOnly: true },
    { path: "impl.cpp", content: impl },
  ];
}

describe("native judge", () => {
  it("accepts a correct implementation", async () => {
    const r = await judgeNative(project(GOOD));
    expect(r.summary.tests.map((t) => t.name)).toEqual(["starts_at_zero", "increments", "throws_on_underflow"]);
    expect(r.verdict).toBe("accepted");
  });
  it("reports failures with file, line and values", async () => {
    const r = await judgeNative(project(GOOD.replace("++n_", "n_ += 2")));
    expect(r.verdict).toBe("wrong_behaviour");
    const f = r.summary.tests.find((t) => t.name === "increments")!;
    expect(f.status).toBe("fail");
    expect(f.failures[0]).toMatchObject({ file: "tests.cpp", line: 5 });
    expect(f.failures[0].msg).toBe("expected c.value() == 2 but got 4 vs 2");
  });
  it("maps compile errors to the player's file", async () => {
    const r = await judgeNative(project(GOOD.replace("++n_", "++nope")));
    expect(r.verdict).toBe("compile_error");
    expect(r.diagnostics.find((d) => d.severity === "error")?.file).toBe("impl.cpp");
  });
  it("attributes a crash to the running test", async () => {
    const r = await judgeNative(project(GOOD.replace("++n_;", "*(volatile int*)0 = 1;")));
    expect(r.verdict).toBe("runtime_error");
    expect(r.summary.crashed).toBe("Counter.increments");
    expect(r.summary.tests[0].status).toBe("pass");
  });
  it("kills an infinite loop", async () => {
    const r = await judgeNative(project(GOOD.replace("++n_;", "for(;;){}")), { timeoutMs: 1500 });
    expect(r.verdict).toBe("time_limit");
  });
  it("is not confused by user stdout", async () => {
    const r = await judgeNative(project(GOOD.replace("++n_;", 'std::puts("noise"); ++n_;').replace("#include <stdexcept>", "#include <stdexcept>\n#include <cstdio>")));
    expect(r.verdict).toBe("accepted");
  });
});

describe("exception-free mode (browser toolchain, ADR 0001)", () => {
  const NOEX_TESTS = `#include "bp_test.h"
#include "api.h"
TEST(Counter, a_passes) { Counter c; c.inc(); EXPECT_EQ(c.value(), 1); }
TEST(Counter, b_asserts) { Counter c; ASSERT_EQ(c.value(), 5); EXPECT_EQ(1, 2); }
TEST(Counter, c_passes) { Counter c; EXPECT_EQ(c.value(), 0); }
`;
  const IMPL = `#include "api.h"
int Counter::value() const { return n_; }
void Counter::inc() { ++n_; }
void Counter::dec() { --n_; }
`;
  const files = (): ProjectFile[] => [
    DRIVER,
    { path: "api.h", content: API, readOnly: true },
    { path: "tests.cpp", content: NOEX_TESTS, readOnly: true },
    { path: "impl.cpp", content: IMPL },
  ];
  it("ASSERT_ fails the test, emits its result and stops the process", async () => {
    const r = await judgeNative(files(), { flags: ["-fno-exceptions"] });
    expect(r.summary.tests.map((t) => `${t.name}:${t.status}`)).toEqual(["a_passes:pass", "b_asserts:fail"]);
    expect(r.summary.crashed).toBeUndefined();
    expect(r.verdict).toBe("wrong_behaviour");
  });
  it("--only runs a single test and --list names them", async () => {
    const only = await judgeNative(files(), { flags: ["-fno-exceptions"], runArgs: ["--only", "Counter.c_passes"] });
    expect(only.summary.tests.map((t) => t.name)).toEqual(["c_passes"]);
    expect(only.verdict).toBe("accepted");
    const list = await judgeNative(files(), { runArgs: ["--list"] });
    expect(list.stdout.trim().split("\n")).toEqual(["Counter.a_passes", "Counter.b_asserts", "Counter.c_passes"]);
  });
  it("rejects EXPECT_THROWS when exceptions are off", async () => {
    const withThrows = files().map((f) => (f.path === "tests.cpp" ? { ...f, content: f.content + "TEST(Counter, t) { Counter c; EXPECT_THROWS(c.dec(), int); }\n" } : f));
    const r = await judgeNative(withThrows, { flags: ["-fno-exceptions"] });
    expect(r.verdict).toBe("compile_error");
  });
});
