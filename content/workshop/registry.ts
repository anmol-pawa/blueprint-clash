// Static registry of Workshop problems for the app build. The Node loader (`lib/workshop/load.ts`) imports the
// TypeScript modules by path, which a bundler cannot follow, so the app lists them here explicitly.
import { clarify as libraryClarify } from "./library-management/clarify";
import { followups as libraryFollowups } from "./library-management/followups";
import { meta as libraryMeta } from "./library-management/meta";
import { rubric as libraryRubric } from "./library-management/rubric";
import type { PackageModules } from "@/lib/workshop/load";

export const WORKSHOP_REGISTRY: Record<string, PackageModules> = {
  "library-management": { meta: libraryMeta, clarify: libraryClarify, rubric: libraryRubric, followups: libraryFollowups },
};
