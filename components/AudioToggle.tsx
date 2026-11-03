"use client";
import { useEffect, useSyncExternalStore } from "react";
import { type AudioSettings, DEFAULT_AUDIO } from "@/lib/audio/themes";
import { getAudioSettings, setMusic, setSfx, sfx, subscribeAudio } from "@/game/audio/synth";

const SERVER: AudioSettings = DEFAULT_AUDIO;

/** A small sound button for page headers: tap to mute everything, tap again to restore. Also unlocks audio on the first gesture. */
export function AudioToggle() {
  const s = useSyncExternalStore(subscribeAudio, getAudioSettings, () => SERVER);
  useEffect(() => {
    const unlock = () => sfx.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
  const muted = !s.music && !s.sfx;
  return (
    <button
      type="button"
      className="px-btn flex h-11 w-11 shrink-0 items-center justify-center p-0 text-lg"
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      aria-pressed={muted}
      title={muted ? "Sound off" : "Sound on"}
      onClick={() => {
        const next = muted;
        setMusic(next);
        setSfx(next);
        if (next) sfx.click();
      }}
    >
      <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
    </button>
  );
}
