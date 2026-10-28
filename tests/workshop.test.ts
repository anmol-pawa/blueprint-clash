import { beforeAll, describe, expect, it } from "vitest";
import { loadPackage } from "@/lib/workshop/load";
import { validatePackage } from "@/lib/workshop/validate";
import { failedTests, runPhase, testFilesUpTo } from "@/lib/workshop/verify";
import type { WorkshopPackage } from "@/lib/workshop/types";

let pkg: WorkshopPackage;
beforeAll(async () => {
  pkg = await loadPackage("library-management");
});

const clone = (): WorkshopPackage => structuredClone(pkg);

describe("validatePackage", () => {
  it("accepts the sample problem", () => {
    expect(validatePackage(pkg)).toEqual([]);
  });

  it("flags a hidden requirement that no question reveals", () => {
    const p = clone();
    p.clarify = p.clarify.map((q) => ({ ...q, reveals: q.reveals.filter((r) => r !== "R-limit") }));
    expect(validatePackage(p).join("\n")).toMatch(/R-limit is not revealable/);
  });

  it("flags questions that reveal unknown requirements or noise that reveals", () => {
    const p = clone();
    p.clarify[0].reveals = ["R-ghost"];
    p.clarify[p.clarify.length - 1].reveals = ["R-limit"];
    const msg = validatePackage(p).join("\n");
    expect(msg).toMatch(/unknown requirement R-ghost/);
    expect(msg).toMatch(/is noise but reveals/);
  });

  it("flags a rubric owner the reference never declares", () => {
    const p = clone();
    p.rubric[0].owners = ["GhostClass"];
    expect(validatePackage(p).join("\n")).toMatch(/reference declares none of GhostClass/);
  });

  it("flags an undocumented bad design and a thin editorial", () => {
    const p = clone();
    p.meta.bad[0].failingTests = [];
    p.editorial = "# Editorial\n\n## Requirements\nx";
    const msg = validatePackage(p).join("\n");
    expect(msg).toMatch(/documents no failing test/);
    expect(msg).toMatch(/missing a "## Alternatives" section/);
  });

  it("flags a storm requirement with no tests or bad design", () => {
    const p = clone();
    p.meta.requirements.push({ id: "R-s1", text: "x", phase: "storm1", hidden: true });
    const msg = validatePackage(p).join("\n");
    expect(msg).toMatch(/tests\/storm1 has no test files/);
    expect(msg).toMatch(/no bad design documented for storm1/);
    expect(msg).toMatch(/R-s1 is not revealable/);
  });
});

describe("runPhase (native)", () => {
  it("test files are cumulative and namespaced by phase", () => {
    const names = testFilesUpTo(pkg, "base").map((f) => f.path);
    expect(names).toContain("tests_base_library_base.cpp");
    expect(names).toContain("api.h");
  });

  it("reports the failing tests of a broken design", async () => {
    const r = await runPhase(pkg, pkg.bad["no_limit"], "base");
    expect(r.verdict).toBe("wrong_behaviour");
    expect(failedTests(r)).toEqual(["Limits.FourthBookIsRefused"]);
  });
});
