"use client";
import { useState } from "react";
import { judgeInBrowser } from "@/lib/judge/browser/client";
import type { BrowserJudgeResult } from "@/lib/judge/browser/protocol";

const API = `#pragma once
class Counter {
 public:
  virtual ~Counter() = default;
  virtual int next() = 0;
};
Counter* make_counter();
`;
const GOOD = `#include "api.h"
struct Impl : Counter {
  int n = 0;
  int next() override { return ++n; }
};
Counter* make_counter() { return new Impl; }
`;
const TESTS = `#define BP_TEST_MAIN
#include "bp_test.h"
#include "api.h"
#include <memory>
TEST(Counter, counts) {
  std::unique_ptr<Counter> c(make_counter());
  EXPECT_EQ(c->next(), 1);
  EXPECT_EQ(c->next(), 2);
}
TEST(Counter, independent) {
  std::unique_ptr<Counter> a(make_counter()), b(make_counter());
  a->next();
  EXPECT_EQ(b->next(), 1);
}
`;
const SAMPLES: Record<string, string> = {
  accepted: GOOD,
  "wrong behaviour": GOOD.replace("++n", "n++"),
  "compile error": GOOD.replace("return ++n;", "return ++n"),
  crash: GOOD.replace("return ++n;", "__builtin_trap(); return 0;"),
  "infinite loop": GOOD.replace("return ++n;", "for (;;) {} return 0;"),
};

export default function DevJudge() {
  const [impl, setImpl] = useState(GOOD);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<BrowserJudgeResult | null>(null);
  const [err, setErr] = useState("");

  async function go() {
    setBusy(true);
    setErr("");
    try {
      setRes(
        await judgeInBrowser(
          [
            { path: "api.h", content: API, readOnly: true },
            { path: "impl.cpp", content: impl },
            { path: "tests.cpp", content: TESTS, readOnly: true },
          ],
          3000,
        ),
      );
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4 text-sm">
      <h1 className="text-xl font-bold">/dev/judge</h1>
      <div className="flex flex-wrap gap-2">
        {Object.entries(SAMPLES).map(([k, v]) => (
          <button key={k} className="min-h-11 rounded border px-3" onClick={() => setImpl(v)}>
            {k}
          </button>
        ))}
      </div>
      <textarea aria-label="impl.cpp" className="h-48 w-full rounded border p-2 font-mono" value={impl} onChange={(e) => setImpl(e.target.value)} />
      <button id="run" disabled={busy} className="min-h-11 rounded bg-blue-700 px-4 text-white disabled:opacity-50" onClick={go}>
        {busy ? "Judging…" : "Run tests"}
      </button>
      {err && <p id="error" className="text-red-600">{err}</p>}
      {res && (
        <section id="result" className="space-y-1">
          <p>
            verdict: <b id="verdict">{res.verdict}</b> · compile {res.timings.compileMs} ms · run {res.timings.runMs} ms · {res.summary.passed}/{res.summary.tests.length} passed
          </p>
          <ul className="break-words font-mono">
            {res.diagnostics.map((d, i) => (
              <li key={i}>{`${d.file}:${d.line}:${d.col} ${d.severity}: ${d.message}`}</li>
            ))}
            {res.summary.tests.map((t) => (
              <li key={t.suite + t.name}>{`${t.status} ${t.suite}.${t.name} ${t.failures.map((f) => `${f.file}:${f.line} ${f.msg}`).join("; ")}`}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
