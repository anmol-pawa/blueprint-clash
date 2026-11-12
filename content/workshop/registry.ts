// Static registry of Workshop problems for the app build. The Node loader (`lib/workshop/load.ts`) imports the
// TypeScript modules by path, which a bundler cannot follow, so the app lists them here explicitly.
import { clarify as elevatorClarify } from "./elevator-system/clarify";
import { followups as elevatorFollowups } from "./elevator-system/followups";
import { meta as elevatorMeta } from "./elevator-system/meta";
import { rubric as elevatorRubric } from "./elevator-system/rubric";
import { clarify as libraryClarify } from "./library-management/clarify";
import { followups as libraryFollowups } from "./library-management/followups";
import { meta as libraryMeta } from "./library-management/meta";
import { rubric as libraryRubric } from "./library-management/rubric";
import { clarify as loggerClarify } from "./logger-framework/clarify";
import { followups as loggerFollowups } from "./logger-framework/followups";
import { meta as loggerMeta } from "./logger-framework/meta";
import { rubric as loggerRubric } from "./logger-framework/rubric";
import { clarify as parkingClarify } from "./parking-lot/clarify";
import { followups as parkingFollowups } from "./parking-lot/followups";
import { meta as parkingMeta } from "./parking-lot/meta";
import { rubric as parkingRubric } from "./parking-lot/rubric";
import { clarify as snlClarify } from "./snake-and-ladder/clarify";
import { followups as snlFollowups } from "./snake-and-ladder/followups";
import { meta as snlMeta } from "./snake-and-ladder/meta";
import { rubric as snlRubric } from "./snake-and-ladder/rubric";
import { clarify as tttClarify } from "./tic-tac-toe/clarify";
import { followups as tttFollowups } from "./tic-tac-toe/followups";
import { meta as tttMeta } from "./tic-tac-toe/meta";
import { rubric as tttRubric } from "./tic-tac-toe/rubric";
import { clarify as vendingClarify } from "./vending-machine/clarify";
import { followups as vendingFollowups } from "./vending-machine/followups";
import { meta as vendingMeta } from "./vending-machine/meta";
import { rubric as vendingRubric } from "./vending-machine/rubric";
import type { PackageModules } from "@/lib/workshop/load";

export const WORKSHOP_REGISTRY: Record<string, PackageModules> = {
  "elevator-system": { meta: elevatorMeta, clarify: elevatorClarify, rubric: elevatorRubric, followups: elevatorFollowups },
  "library-management": { meta: libraryMeta, clarify: libraryClarify, rubric: libraryRubric, followups: libraryFollowups },
  "logger-framework": { meta: loggerMeta, clarify: loggerClarify, rubric: loggerRubric, followups: loggerFollowups },
  "parking-lot": { meta: parkingMeta, clarify: parkingClarify, rubric: parkingRubric, followups: parkingFollowups },
  "snake-and-ladder": { meta: snlMeta, clarify: snlClarify, rubric: snlRubric, followups: snlFollowups },
  "tic-tac-toe": { meta: tttMeta, clarify: tttClarify, rubric: tttRubric, followups: tttFollowups },
  "vending-machine": { meta: vendingMeta, clarify: vendingClarify, rubric: vendingRubric, followups: vendingFollowups },
};
