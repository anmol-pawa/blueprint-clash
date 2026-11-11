// Static registry of Workshop problems for the app build. The Node loader (`lib/workshop/load.ts`) imports the
// TypeScript modules by path, which a bundler cannot follow, so the app lists them here explicitly.
import { clarify as libraryClarify } from "./library-management/clarify";
import { followups as libraryFollowups } from "./library-management/followups";
import { meta as libraryMeta } from "./library-management/meta";
import { rubric as libraryRubric } from "./library-management/rubric";
import { clarify as parkingClarify } from "./parking-lot/clarify";
import { followups as parkingFollowups } from "./parking-lot/followups";
import { meta as parkingMeta } from "./parking-lot/meta";
import { rubric as parkingRubric } from "./parking-lot/rubric";
import type { PackageModules } from "@/lib/workshop/load";

export const WORKSHOP_REGISTRY: Record<string, PackageModules> = {
  "library-management": { meta: libraryMeta, clarify: libraryClarify, rubric: libraryRubric, followups: libraryFollowups },
  "parking-lot": { meta: parkingMeta, clarify: parkingClarify, rubric: parkingRubric, followups: parkingFollowups },
};
