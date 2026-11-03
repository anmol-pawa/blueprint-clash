import type { Lesson } from "@/lib/lessons/model";
import { SOLID_SQUARE_LESSONS } from "./solid-square";

export const ALL_LESSONS: readonly Lesson[] = [...SOLID_SQUARE_LESSONS];

export function lessonById(id: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}
