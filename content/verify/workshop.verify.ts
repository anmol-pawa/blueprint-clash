import { describe, expect, it } from "vitest";
import { listProblems, loadPackage } from "@/lib/workshop/load";
import { activePhases, validatePackage } from "@/lib/workshop/validate";
import { failedTests, runPhase } from "@/lib/workshop/verify";
import type { WorkshopPackage } from "@/lib/workshop/types";

const ids = await listProblems();

describe.each(ids)("workshop/%s", (id) => {
  let pkg: WorkshopPackage;
  it("loads and is structurally valid", async () => {
    pkg = await loadPackage(id);
    expect(validatePackage(pkg)).toEqual([]);
  });

  it("the reference passes every phase", async () => {
    for (const phase of activePhases(pkg)) {
      const r = await runPhase(pkg, pkg.reference, phase);
      expect(r.verdict, `${phase}: ${JSON.stringify(r.diagnostics.slice(0, 3))} ${failedTests(r).join(",")}`).toBe("accepted");
      expect(r.summary.tests.length).toBeGreaterThan(0);
    }
  });

  it("every bad design fails exactly where documented", async () => {
    for (const bad of pkg.meta.bad) {
      const phases = activePhases(pkg);
      for (const phase of phases.slice(0, phases.indexOf(bad.failsPhase))) {
        const r = await runPhase(pkg, pkg.bad[bad.dir], phase);
        expect(r.verdict, `bad/${bad.dir} should still pass ${phase}: ${failedTests(r).join(",")}`).toBe("accepted");
      }
      const r = await runPhase(pkg, pkg.bad[bad.dir], bad.failsPhase);
      expect(r.verdict, `bad/${bad.dir} must compile`).not.toBe("compile_error");
      const failed = failedTests(r);
      for (const t of bad.failingTests) expect(failed, `bad/${bad.dir}`).toContain(t);
    }
  });
});
