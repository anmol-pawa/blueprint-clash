import type { Lesson } from "@/lib/lessons/model";
import { CREATIONAL_FOUNDRY_LESSONS } from "./creational-foundry";
import { STRUCTURAL_BRIDGES_LESSONS } from "./structural-bridges";
import { SOLID_SQUARE_LESSONS } from "./solid-square";

export const ALL_LESSONS: readonly Lesson[] = [...SOLID_SQUARE_LESSONS, ...CREATIONAL_FOUNDRY_LESSONS, ...STRUCTURAL_BRIDGES_LESSONS];

export function lessonById(id: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}
