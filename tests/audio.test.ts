import { describe, expect, it } from "vitest";
import { OLD_TOWN, THEMES, WARDEN_FIGHT, cycleSteps, midiToHz, parseAudioSettings, stepEvents, stepSeconds } from "@/lib/audio/themes";

describe("midiToHz", () => {
  it("A4 is 440 and an octave doubles", () => {
    expect(midiToHz(69)).toBeCloseTo(440, 6);
    expect(midiToHz(81)).toBeCloseTo(880, 6);
    expect(midiToHz(60)).toBeCloseTo(261.6256, 3);
  });
});

describe("themes", () => {
  it.each(Object.values(THEMES))("$id has a lead that fills one full cycle and valid degrees", (t) => {
    expect(t.lead.length).toBe(cycleSteps(t));
    for (const d of t.lead) if (d !== null) expect(d).toBeLessThan(t.scale.length);
    expect(stepSeconds(t)).toBeCloseTo(30 / t.bpm, 9);
  });

  it("loops: step n and step n + cycle are identical", () => {
    for (let s = 0; s < cycleSteps(OLD_TOWN); s++) expect(stepEvents(OLD_TOWN, s + cycleSteps(OLD_TOWN) * 3)).toEqual(stepEvents(OLD_TOWN, s));
  });

  it("plays the bar root an octave below the tonic on beats 1 and 3, with a snare on the backbeat", () => {
    expect(stepEvents(OLD_TOWN, 0).bass).toBe(48);
    expect(stepEvents(OLD_TOWN, 4).bass).toBe(48);
    expect(stepEvents(OLD_TOWN, 4).drum).toBe(2);
    expect(stepEvents(OLD_TOWN, 1).bass).toBeNull();
    // bar 2 (vi) drops the bass by three semitones
    expect(stepEvents(OLD_TOWN, 8).bass).toBe(45);
  });

  it("lead notes stay inside a two-octave window around the tonic and rests are null", () => {
    for (const t of [OLD_TOWN, WARDEN_FIGHT]) {
      for (let s = 0; s < cycleSteps(t); s++) {
        const { lead } = stepEvents(t, s);
        if (lead !== null) {
          expect(lead).toBeGreaterThanOrEqual(t.rootMidi + 12 - 7);
          expect(lead).toBeLessThanOrEqual(t.rootMidi + 12 + 12);
        }
      }
    }
    expect(stepEvents(OLD_TOWN, 1).lead).toBeNull();
  });

  it("the boss theme is faster and in a minor mode", () => {
    expect(WARDEN_FIGHT.bpm).toBeGreaterThan(OLD_TOWN.bpm);
    expect(WARDEN_FIGHT.scale).toContain(3);
    expect(OLD_TOWN.scale).toContain(4);
  });
});

describe("parseAudioSettings", () => {
  it("defaults on missing or corrupt input", () => {
    expect(parseAudioSettings(null)).toEqual({ volume: 0.6, music: true, sfx: true });
    expect(parseAudioSettings("{not json")).toEqual({ volume: 0.6, music: true, sfx: true });
  });
  it("clamps volume and keeps valid flags, ignoring bad fields", () => {
    expect(parseAudioSettings('{"volume":5,"music":false,"sfx":"x"}')).toEqual({ volume: 1, music: false, sfx: true });
    expect(parseAudioSettings('{"volume":-2}').volume).toBe(0);
    expect(parseAudioSettings('{"volume":"loud"}').volume).toBe(0.6);
  });
});
