"use client";
import { WorkspaceEditor } from "@/components/WorkspaceEditor";
import { judgeInBrowser } from "@/lib/judge/browser/client";

const API = `#pragma once
class Counter {
 public:
  virtual ~Counter() = default;
  virtual int next() = 0;
};
Counter* make_counter();
`;
const STARTER = `#include "api.h"

// Implement Counter and make_counter() here. Add more files with the + button.
Counter* make_counter() { return nullptr; }
`;
const TESTS = `#define BP_TEST_MAIN
#include "bp_test.h"
#include "api.h"
#include <memory>
TEST(Counter, counts) {
  std::unique_ptr<Counter> c(make_counter());
  ASSERT_TRUE(c != nullptr);
  EXPECT_EQ(c->next(), 1);
  EXPECT_EQ(c->next(), 2);
}
TEST(Counter, independent) {
  std::unique_ptr<Counter> a(make_counter()), b(make_counter());
  ASSERT_TRUE(a != nullptr && b != nullptr);
  a->next();
  EXPECT_EQ(b->next(), 1);
}
`;

export default function DevEditor() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl space-y-3 p-4">
      <h1 className="text-xl font-bold">/dev/editor</h1>
      <WorkspaceEditor
        id="dev-editor-counter"
        provided={[{ path: "api.h", content: API, readOnly: true }]}
        starter={[{ path: "impl.cpp", content: STARTER }]}
        runExtras={[{ path: "tests.cpp", content: TESTS, readOnly: true }]}
        submitExtras={[{ path: "tests.cpp", content: TESTS, readOnly: true }]}
        judge={(files) => judgeInBrowser(files, 3000)}
      />
    </main>
  );
}
