"use client";
import { useEffect, useRef } from "react";
import { frameToRgba, type Frame } from "@/lib/sprites/raster";

interface Props {
  frames: readonly Frame[];
  palette: readonly string[];
  scale?: number;
  /** Frames per second; 0 shows only the first frame. */
  fps?: number;
  label?: string;
}

/** Draws indexed pixel-art frames with nearest-neighbour scaling, optionally looping. */
export function SpriteView({ frames, palette, scale = 4, fps = 0, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || frames.length === 0) return;
    const images = frames.map((f) => new ImageData(frameToRgba(f, palette) as Uint8ClampedArray<ArrayBuffer>, f.w, f.h));
    let i = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(images[i % images.length], 0, 0);
    };
    draw();
    if (fps <= 0 || images.length < 2) return;
    const id = window.setInterval(() => {
      i++;
      draw();
    }, 1000 / fps);
    return () => window.clearInterval(id);
  }, [frames, palette, fps]);
  const { w, h } = frames[0];
  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      aria-label={label}
      role="img"
      style={{ width: w * scale, height: h * scale, imageRendering: "pixelated", maxWidth: "100%" }}
    />
  );
}
