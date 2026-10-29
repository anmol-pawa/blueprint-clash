import { describe, expect, it } from "vitest";
import { migrateSave, type Migration } from "@/lib/save/migrate";
import { defaultSave, sanitizeSave, SAVE_VERSION, type SaveData } from "@/lib/save/schema";
import { createSaveStore, memoryStorage, SAVE_KEY, type KeyValueStorage } from "@/lib/save/store";
import { canonicalJson, exportSave, importSave } from "@/lib/save/transfer";

const sample = (): SaveData => ({
  ...defaultSave(),
  xp: 540,
  bits: 12,
  badges: ["old-town"],
  cleared: ["l1-raii"],
  mastery: { "pattern:strategy": { level: "practiced", due: 20000, streak: 3 } },
  workshop: { "library-management": { best: { base: 12 }, cleared: false } },
  settings: { volume: 0.2, music: false, reducedMotion: true, zen: true },
});

describe("sanitizeSave", () => {
  it("returns defaults for junk", () => {
    expect(sanitizeSave(null)).toEqual(defaultSave());
    expect(sanitizeSave([1, 2])).toEqual(defaultSave());
    expect(sanitizeSave("x")).toEqual(defaultSave());
  });
  it("repairs bad fields without throwing", () => {
    const s = sanitizeSave({
      xp: -5,
      bits: "lots",
      badges: ["a", "a", 7, ""],
      mastery: { ok: { level: "mastered", due: 3, streak: 1 }, bad: { level: "godlike" }, worse: 4 },
      workshop: { p: { best: { base: -1, s1: 4.7 }, cleared: "yes" } },
      settings: { volume: 9, music: "no" },
    });
    expect(s.xp).toBe(0);
    expect(s.bits).toBe(0);
    expect(s.badges).toEqual(["a"]);
    expect(Object.keys(s.mastery)).toEqual(["ok"]);
    expect(s.workshop.p).toEqual({ best: { base: 0, s1: 4 }, cleared: false });
    expect(s.settings.volume).toBe(1);
    expect(s.settings.music).toBe(true);
  });
  it("keeps a valid save unchanged", () => {
    expect(sanitizeSave(sample())).toEqual(sample());
  });
});

describe("migrateSave", () => {
  it("accepts the current version and treats a missing version as 1", () => {
    const { version, ...noVersion } = sample();
    expect(version).toBe(SAVE_VERSION);
    const r = migrateSave(noVersion);
    expect(r.ok && r.from).toBe(1);
    expect(r.ok && r.save).toEqual(sample());
  });
  it("runs the chain in order and stamps the version", () => {
    const m: Record<number, Migration> = {
      1: (raw) => ({ ...raw, xp: (raw.xp as number) + 1 }),
      2: (raw) => ({ ...raw, xp: (raw.xp as number) * 10 }),
    };
    const r = migrateSave({ version: 1, xp: 4 }, 3, m);
    expect(r.ok).toBe(true);
    // sanitizeSave stamps SAVE_VERSION; the chain result proves order: (4+1)*10
    expect(r.ok && r.save.xp).toBe(50);
  });
  it("fails on a missing step, a newer version and bad versions", () => {
    expect(migrateSave({ version: 1 }, 2, {}).ok).toBe(false);
    const newer = migrateSave({ version: SAVE_VERSION + 1 });
    expect(!newer.ok && newer.error).toMatch(/newer/);
    expect(migrateSave({ version: 0 }).ok).toBe(false);
    expect(migrateSave({ version: "1" }).ok).toBe(false);
    expect(migrateSave(null).ok).toBe(false);
  });
});

describe("export / import", () => {
  it("round-trips", () => {
    const r = importSave(exportSave(sample(), new Date("2026-10-29T00:00:00Z")));
    expect(r.ok && r.save).toEqual(sample());
  });
  it("checksum ignores key order", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(canonicalJson({ a: [2, { c: 2, d: 1 }], b: 1 }));
  });
  it("rejects tampering, truncation, wrong app and non-JSON", () => {
    const text = exportSave(sample());
    expect(importSave(text.replace('"xp": 540', '"xp": 99999')).ok).toBe(false);
    expect(importSave(text.slice(0, text.length - 20)).ok).toBe(false);
    expect(importSave(JSON.stringify({ app: "query-clash", format: 1 })).ok).toBe(false);
    expect(importSave("nope").ok).toBe(false);
    expect(importSave("null").ok).toBe(false);
  });
  it("rejects a newer export format", () => {
    const f = JSON.parse(exportSave(sample()));
    f.format = 99;
    expect(importSave(JSON.stringify(f)).ok).toBe(false);
  });
});

describe("save store", () => {
  it("persists, notifies and reloads", () => {
    const storage = memoryStorage();
    const a = createSaveStore(storage);
    let calls = 0;
    const off = a.subscribe(() => calls++);
    a.update((s) => ({ ...s, xp: s.xp + 10 }));
    off();
    a.update((s) => ({ ...s, bits: 3 }));
    expect(calls).toBe(1);
    const b = createSaveStore(storage);
    expect(b.get().xp).toBe(10);
    expect(b.get().bits).toBe(3);
    b.reset();
    expect(createSaveStore(storage).get()).toEqual(defaultSave());
  });
  it("sets corrupt data aside instead of overwriting it", () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, "{not json");
    const s = createSaveStore(storage);
    expect(s.get()).toEqual(defaultSave());
    expect(s.loadWarning()).toMatch(/kept aside/);
    expect(storage.getItem(`${SAVE_KEY}.unreadable`)).toBe("{not json");
  });
  it("does not downgrade a save from a newer build", () => {
    const storage = memoryStorage();
    const newer = JSON.stringify({ version: SAVE_VERSION + 1, xp: 5 });
    storage.setItem(SAVE_KEY, newer);
    const s = createSaveStore(storage);
    expect(s.loadWarning()).toMatch(/newer/);
    expect(storage.getItem(`${SAVE_KEY}.unreadable`)).toBe(newer);
  });
  it("keeps working in memory when storage throws or is missing", () => {
    const broken: KeyValueStorage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("quota");
      },
      removeItem() {},
    };
    for (const st of [broken, null]) {
      const s = createSaveStore(st);
      s.update((x) => ({ ...x, xp: 7 }));
      expect(s.get().xp).toBe(7);
    }
  });
});
