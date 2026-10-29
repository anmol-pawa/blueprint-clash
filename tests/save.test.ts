import { describe, expect, it } from "vitest";
import { migrate, type Migration } from "@/lib/save/migrations";
import { SAVE_VERSION, newSave, validateSave } from "@/lib/save/schema";
import { loadSave, memorySaveStore, updateSave } from "@/lib/save/store";
import { canonicalJson, checksum, exportSave, importSave } from "@/lib/save/transfer";

describe("schema", () => {
  it("accepts a new save and rejects malformed ones", () => {
    expect(validateSave(newSave(1))).toEqual([]);
    expect(validateSave({ ...newSave(1), badges: [1] })).toContain("badges must be a string array");
    expect(validateSave(null)).toEqual(["save is not an object"]);
    const s = newSave(1);
    s.srs.x = { due: NaN, intervalDays: 1, ease: 2.5, reps: 0, lapses: 0 };
    expect(validateSave(s)).toContain("srs.x is malformed");
  });
});

describe("migrate", () => {
  const chain: Migration[] = [
    { from: 1, up: (o) => ({ ...o, a: 1 }) },
    { from: 2, up: (o) => ({ ...o, b: (o.a as number) + 1 }) },
  ];
  it("runs migrations in order without mutating the input", () => {
    const input = { version: 1 };
    expect(migrate(input, chain, 3)).toEqual({ ok: true, data: { version: 3, a: 1, b: 2 } });
    expect(input).toEqual({ version: 1 });
  });
  it("rejects missing versions, gaps, non-objects and newer saves", () => {
    expect(migrate({}, chain, 3).ok).toBe(false);
    expect(migrate({ version: 1 }, [chain[1]], 3)).toEqual({ ok: false, error: "no migration from version 1" });
    const newer = migrate({ version: SAVE_VERSION + 1 });
    expect(!newer.ok && newer.error).toMatch(/newer version/);
    expect(migrate([], chain, 3).ok).toBe(false);
  });
  it("is a no-op at the current version", () => {
    const s = newSave(5);
    expect(migrate(s)).toEqual({ ok: true, data: s });
  });
});

describe("export / import", () => {
  const sample = () => {
    const s = newSave(100);
    s.badges.push("old-town");
    s.workshop["library-management"] = { bestPhase: 1, bestScore: 82, attempts: 3 };
    return s;
  };
  const wrap = (data: unknown) =>
    JSON.stringify({ app: "blueprint-clash", version: 1, exportedAt: 1, checksum: checksum(canonicalJson(data)), data });

  it("round-trips", () => {
    const s = sample();
    expect(importSave(exportSave(s, 200))).toEqual({ ok: true, data: s });
  });
  it("checksum ignores key order", () => {
    expect(checksum(canonicalJson({ a: 1, b: [2, { d: 1, c: 2 }] }))).toBe(checksum(canonicalJson({ b: [2, { c: 2, d: 1 }], a: 1 })));
  });
  it("rejects bad JSON, foreign files, edits and invalid data", () => {
    expect(importSave("{nope")).toEqual({ ok: false, error: "not valid JSON" });
    expect(importSave('{"app":"other"}').ok).toBe(false);
    const env = JSON.parse(exportSave(sample(), 1));
    env.data.badges.push("cheat");
    expect(importSave(JSON.stringify(env))).toMatchObject({ ok: false, error: expect.stringMatching(/checksum/) });
    expect(importSave(wrap({ ...sample(), badges: "x" }))).toMatchObject({ ok: false, error: expect.stringMatching(/invalid save/) });
  });
  it("rejects a file missing required fields", () => {
    const { settings: _settings, ...old } = sample();
    void _settings;
    expect(importSave(wrap(old))).toMatchObject({ ok: false, error: expect.stringMatching(/invalid save: settings/) });
  });
});

describe("store", () => {
  it("gives a fresh save when empty", async () => {
    expect(await loadSave(memorySaveStore(), 7)).toEqual({ data: newSave(7) });
  });
  it("persists updates and bumps updatedAt without mutating the input", async () => {
    const store = memorySaveStore();
    const a = newSave(1);
    const b = await updateSave(store, a, (d) => d.badges.push("old-town"), 50);
    expect(a.badges).toEqual([]);
    expect(b.updatedAt).toBe(50);
    expect((await loadSave(store, 99)).data).toEqual(b);
  });
  it("keeps a corrupt or newer stored save untouched and warns", async () => {
    const corrupt = { version: 1, nonsense: true };
    const store = memorySaveStore(corrupt);
    const out = await loadSave(store, 3);
    expect(out.warning).toMatch(/invalid/);
    expect(out.data).toEqual(newSave(3));
    expect(await store.read()).toEqual(corrupt);
    expect((await loadSave(memorySaveStore({ version: SAVE_VERSION + 1 }), 3)).warning).toMatch(/newer/);
  });
  it("survives a failing store", async () => {
    const broken = { read: async () => { throw new Error("x"); }, write: async () => {}, clear: async () => {} };
    expect((await loadSave(broken, 1)).warning).toMatch(/storage unavailable/);
  });
});
