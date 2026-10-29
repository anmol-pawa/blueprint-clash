import { describe, expect, it } from "vitest";
import { migrate, SaveVersionError, type Migration } from "@/lib/save/migrate";
import { exportSave, importSave, checksum, MAX_IMPORT_BYTES } from "@/lib/save/transfer";
import { sanitize } from "@/lib/save/validate";
import { memorySaveStore } from "@/lib/save/store";
import { adjustBits, awardBadge, recordCompletion, updateSettings } from "@/lib/save/actions";
import { newSave, CURRENT_SAVE_VERSION } from "@/lib/save/types";

const NOW = 1_700_000_000_000;

describe("migrate", () => {
  it("is the identity at the current version", () => {
    const raw = { version: CURRENT_SAVE_VERSION, x: 1 };
    expect(migrate(raw)).toEqual(raw);
  });

  it("applies steps in order", () => {
    const steps: Migration[] = [
      { from: 1, up: (r) => ({ ...r, a: 1 }) },
      { from: 2, up: (r) => ({ ...r, b: (r.a as number) + 1 }) },
    ];
    expect(migrate({ version: 1 }, steps, 3)).toEqual({ version: 3, a: 1, b: 2 });
  });

  it("refuses a newer save, a missing version and a missing step", () => {
    expect(() => migrate({ version: 99 })).toThrow(SaveVersionError);
    expect(() => migrate({})).toThrow(SaveVersionError);
    expect(() => migrate({ version: 1 }, [], 2)).toThrow(SaveVersionError);
  });
});

describe("sanitize", () => {
  it("drops junk, clamps numbers and blocks prototype keys", () => {
    const raw = JSON.parse(
      `{"version":1,"bits":-5,"playerName":"  ${"x".repeat(40)}  ","badges":["a","a",3,"__proto__"],
        "mastery":{"p1":{"state":"mastered","lastSeen":5,"intervalDays":99999,"streak":2.7},
                   "bad":{"state":"godlike"},"__proto__":{"state":"seen"}},
        "completions":{"w1":{"bestScore":250,"assisted":"yes"}},
        "settings":{"sound":false,"evil":true},"extra":1}`,
    );
    const s = sanitize(raw, NOW);
    expect(s.bits).toBe(0);
    expect(s.playerName).toBe("x".repeat(24));
    expect(s.badges).toEqual(["a"]);
    expect(Object.keys(s.mastery)).toEqual(["p1"]);
    expect(s.mastery.p1).toEqual({ state: "mastered", lastSeen: 5, intervalDays: 3650, streak: 2 });
    expect(s.completions.w1.bestScore).toBe(100);
    expect(s.completions.w1.assisted).toBe(false);
    expect(s.settings).toEqual({ sound: false, music: true, reducedMotion: false });
    expect(s).not.toHaveProperty("extra");
    expect(({} as Record<string, unknown>).state).toBeUndefined();
  });

  it("falls back to defaults on an empty object", () => {
    expect(sanitize({}, NOW)).toEqual(newSave(NOW));
  });
});

describe("export / import", () => {
  const save = awardBadge(recordCompletion(newSave(NOW), "library", 90, false, NOW + 1), "old-town", NOW + 2);

  it("round-trips", () => {
    const r = importSave(exportSave(save), NOW);
    expect(r).toEqual({ ok: true, save });
  });

  it("rejects non-JSON, foreign JSON, tampering and oversize files", () => {
    expect(importSave("nope", NOW)).toMatchObject({ ok: false });
    expect(importSave('{"format":"other"}', NOW)).toMatchObject({ ok: false });
    const env = JSON.parse(exportSave(save));
    env.data = env.data.replace("old-town", "old-towm");
    const bad = importSave(JSON.stringify(env), NOW);
    expect(bad).toMatchObject({ ok: false });
    expect((bad as { error: string }).error).toMatch(/Checksum/);
    expect(importSave(" ".repeat(MAX_IMPORT_BYTES + 1), NOW)).toMatchObject({ ok: false });
  });

  it("reports a save from a newer game", () => {
    const data = JSON.stringify({ ...save, version: 42 });
    const env = JSON.stringify({ format: "blueprint-clash-save", version: 42, checksum: checksum(data), data });
    const r = importSave(env, NOW);
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/newer/);
  });
});

describe("store", () => {
  it("keeps the previous save as a backup and clears both", async () => {
    const store = memorySaveStore(() => NOW);
    expect(await store.load()).toBeNull();
    const a = newSave(NOW);
    const b = { ...a, bits: 10 };
    await store.save(a);
    await store.save(b);
    expect((await store.load())?.bits).toBe(10);
    expect((await store.loadBackup())?.bits).toBe(0);
    await store.clear();
    expect(await store.load()).toBeNull();
    expect(await store.loadBackup()).toBeNull();
  });
});

describe("actions", () => {
  it("keeps the best score and clears assisted on an unaided pass", () => {
    let s = recordCompletion(newSave(NOW), "p", 60, true, NOW);
    expect(s.completions.p).toMatchObject({ bestScore: 60, assisted: true });
    s = recordCompletion(s, "p", 40, false, NOW + 5);
    expect(s.completions.p).toMatchObject({ bestScore: 60, assisted: false, completedAt: NOW });
    expect(s.updatedAt).toBe(NOW + 5);
  });

  it("badges are unique, bits never go negative, settings merge", () => {
    const s = newSave(NOW);
    expect(awardBadge(awardBadge(s, "x", NOW), "x", NOW).badges).toEqual(["x"]);
    expect(adjustBits(s, -1, NOW)).toBeNull();
    expect(adjustBits(s, 7.9, NOW)?.bits).toBe(7);
    expect(updateSettings(s, { music: false }, NOW).settings).toEqual({ sound: true, music: false, reducedMotion: false });
  });
});
