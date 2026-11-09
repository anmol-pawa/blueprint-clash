import type { Lesson } from "@/lib/lessons/model";
import { CREATIONAL_FOUNDRY_LESSONS } from "./creational-foundry";
import { SOLID_SQUARE_LESSONS } from "./solid-square";
import { STRUCTURAL_BRIDGES_LESSONS } from "./structural-bridges";
import { BEHAVIOURAL_THEATRE_LESSONS } from "./behavioural-theatre";

export const ALL_LESSONS: readonly Lesson[] = [...SOLID_SQUARE_LESSONS, ...CREATIONAL_FOUNDRY_LESSONS, ...STRUCTURAL_BRIDGES_LESSONS, ...BEHAVIOURAL_THEATRE_LESSONS];

export function lessonById(id: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}
