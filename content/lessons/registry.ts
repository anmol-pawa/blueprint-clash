import type { Lesson } from "@/lib/lessons/model";
import { CREATIONAL_FOUNDRY_LESSONS } from "./creational-foundry";
import { SOLID_SQUARE_LESSONS } from "./solid-square";
import { STRUCTURAL_BRIDGES_LESSONS } from "./structural-bridges";
import { BEHAVIOURAL_THEATRE_LESSONS } from "./behavioural-theatre";
import { BEHAVIOURAL_THEATRE_LESSONS_2 } from "./behavioural-theatre-2";
import { BEHAVIOURAL_THEATRE_LESSONS_3 } from "./behavioural-theatre-3";
import { BEHAVIOURAL_THEATRE_LESSONS_4 } from "./behavioural-theatre-4";
import { MODELLING_LESSONS } from "./modelling";

export const ALL_LESSONS: readonly Lesson[] = [...SOLID_SQUARE_LESSONS, ...CREATIONAL_FOUNDRY_LESSONS, ...STRUCTURAL_BRIDGES_LESSONS, ...BEHAVIOURAL_THEATRE_LESSONS, ...BEHAVIOURAL_THEATRE_LESSONS_2, ...BEHAVIOURAL_THEATRE_LESSONS_3, ...BEHAVIOURAL_THEATRE_LESSONS_4, ...MODELLING_LESSONS];

export function lessonById(id: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}
