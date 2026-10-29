"use client";
import { useEffect, useRef } from "react";
import { toRgba, type PixelBuffer } from "@/lib/sprites/buffer";

/** Draws a pixel buffer with nearest-neighbour scaling. */
export function SpriteCanvas({
  buffer,
  palette,
  scale = 4,
  label,
}: {
  buffer: PixelBuffer;
  palette: readonly string[];
  scale?: number;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.putImageData(new ImageData(toRgba(buffer, palette) as Uint8ClampedArray<ArrayBuffer>, buffer.width, buffer.height), 0, 0);
  }, [buffer, palette]);
  return (
    <canvas
      ref={ref}
      width={buffer.width}
      height={buffer.height}
      role="img"
      aria-label={label}
      style={{ width: buffer.width * scale, height: buffer.height * scale, imageRendering: "pixelated", maxWidth: "100%" }}
    />
  );
}
