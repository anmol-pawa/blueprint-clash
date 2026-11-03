// Static list of exercise metadata for the app build (a bundler cannot follow the Node loader's path imports).
// Add an entry when an exercise is used by an in-game screen.
import type { ExerciseMeta } from "@/lib/exercises/types";
import { meta as fileHandle } from "./file-handle/meta";

export const EXERCISE_META: Record<string, ExerciseMeta> = { "file-handle": fileHandle };
