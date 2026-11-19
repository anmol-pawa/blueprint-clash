// Static registry of Workshop problems for the app build. The Node loader (`lib/workshop/load.ts`) imports the
// TypeScript modules by path, which a bundler cannot follow, so the app lists them here explicitly.
import { clarify as evbClarify } from "./event-bus/clarify";
import { followups as evbFollowups } from "./event-bus/followups";
import { meta as evbMeta } from "./event-bus/meta";
import { rubric as evbRubric } from "./event-bus/rubric";
import { clarify as carClarify } from "./car-rental/clarify";
import { followups as carFollowups } from "./car-rental/followups";
import { meta as carMeta } from "./car-rental/meta";
import { rubric as carRubric } from "./car-rental/rubric";
import { clarify as atmClarify } from "./atm/clarify";
import { followups as atmFollowups } from "./atm/followups";
import { meta as atmMeta } from "./atm/meta";
import { rubric as atmRubric } from "./atm/rubric";
import { clarify as elevatorClarify } from "./elevator-system/clarify";
import { followups as elevatorFollowups } from "./elevator-system/followups";
import { meta as elevatorMeta } from "./elevator-system/meta";
import { rubric as elevatorRubric } from "./elevator-system/rubric";
import { clarify as cartClarify } from "./shopping-cart/clarify";
import { followups as cartFollowups } from "./shopping-cart/followups";
import { meta as cartMeta } from "./shopping-cart/meta";
import { rubric as cartRubric } from "./shopping-cart/rubric";
import { clarify as payClarify } from "./payment-processor/clarify";
import { followups as payFollowups } from "./payment-processor/followups";
import { meta as payMeta } from "./payment-processor/meta";
import { rubric as payRubric } from "./payment-processor/rubric";
import { clarify as hotelClarify } from "./hotel-booking/clarify";
import { followups as hotelFollowups } from "./hotel-booking/followups";
import { meta as hotelMeta } from "./hotel-booking/meta";
import { rubric as hotelRubric } from "./hotel-booking/rubric";
import { clarify as kvClarify } from "./kv-store/clarify";
import { followups as kvFollowups } from "./kv-store/followups";
import { meta as kvMeta } from "./kv-store/meta";
import { rubric as kvRubric } from "./kv-store/rubric";
import { clarify as libraryClarify } from "./library-management/clarify";
import { followups as libraryFollowups } from "./library-management/followups";
import { meta as libraryMeta } from "./library-management/meta";
import { rubric as libraryRubric } from "./library-management/rubric";
import { clarify as loggerClarify } from "./logger-framework/clarify";
import { followups as loggerFollowups } from "./logger-framework/followups";
import { meta as loggerMeta } from "./logger-framework/meta";
import { rubric as loggerRubric } from "./logger-framework/rubric";
import { clarify as lruClarify } from "./lru-lfu-cache/clarify";
import { followups as lruFollowups } from "./lru-lfu-cache/followups";
import { meta as lruMeta } from "./lru-lfu-cache/meta";
import { rubric as lruRubric } from "./lru-lfu-cache/rubric";
import { clarify as notifClarify } from "./notification-service/clarify";
import { followups as notifFollowups } from "./notification-service/followups";
import { meta as notifMeta } from "./notification-service/meta";
import { rubric as notifRubric } from "./notification-service/rubric";
import { clarify as rideClarify } from "./ride-sharing/clarify";
import { followups as rideFollowups } from "./ride-sharing/followups";
import { meta as rideMeta } from "./ride-sharing/meta";
import { rubric as rideRubric } from "./ride-sharing/rubric";
import { clarify as foodClarify } from "./food-delivery/clarify";
import { followups as foodFollowups } from "./food-delivery/followups";
import { meta as foodMeta } from "./food-delivery/meta";
import { rubric as foodRubric } from "./food-delivery/rubric";
import { clarify as parkingClarify } from "./parking-lot/clarify";
import { followups as parkingFollowups } from "./parking-lot/followups";
import { meta as parkingMeta } from "./parking-lot/meta";
import { rubric as parkingRubric } from "./parking-lot/rubric";
import { clarify as rlClarify } from "./rate-limiter/clarify";
import { followups as rlFollowups } from "./rate-limiter/followups";
import { meta as rlMeta } from "./rate-limiter/meta";
import { rubric as rlRubric } from "./rate-limiter/rubric";
import { clarify as snlClarify } from "./snake-and-ladder/clarify";
import { followups as snlFollowups } from "./snake-and-ladder/followups";
import { meta as snlMeta } from "./snake-and-ladder/meta";
import { rubric as snlRubric } from "./snake-and-ladder/rubric";
import { clarify as splitClarify } from "./splitwise/clarify";
import { followups as splitFollowups } from "./splitwise/followups";
import { meta as splitMeta } from "./splitwise/meta";
import { rubric as splitRubric } from "./splitwise/rubric";
import { clarify as tixClarify } from "./ticket-booking/clarify";
import { followups as tixFollowups } from "./ticket-booking/followups";
import { meta as tixMeta } from "./ticket-booking/meta";
import { rubric as tixRubric } from "./ticket-booking/rubric";
import { clarify as tttClarify } from "./tic-tac-toe/clarify";
import { followups as tttFollowups } from "./tic-tac-toe/followups";
import { meta as tttMeta } from "./tic-tac-toe/meta";
import { rubric as tttRubric } from "./tic-tac-toe/rubric";
import { clarify as vendingClarify } from "./vending-machine/clarify";
import { followups as vendingFollowups } from "./vending-machine/followups";
import { meta as vendingMeta } from "./vending-machine/meta";
import { rubric as vendingRubric } from "./vending-machine/rubric";
import { clarify as editClarify } from "./text-editor/clarify";
import { followups as editFollowups } from "./text-editor/followups";
import { meta as editMeta } from "./text-editor/meta";
import { rubric as editRubric } from "./text-editor/rubric";
import { clarify as fsClarify } from "./file-system/clarify";
import { followups as fsFollowups } from "./file-system/followups";
import { meta as fsMeta } from "./file-system/meta";
import { rubric as fsRubric } from "./file-system/rubric";
import { clarify as jobqClarify } from "./job-queue/clarify";
import { followups as jobqFollowups } from "./job-queue/followups";
import { meta as jobqMeta } from "./job-queue/meta";
import { rubric as jobqRubric } from "./job-queue/rubric";
import { clarify as chessClarify } from "./chess/clarify";
import { followups as chessFollowups } from "./chess/followups";
import { meta as chessMeta } from "./chess/meta";
import { rubric as chessRubric } from "./chess/rubric";
import { clarify as schedClarify } from "./task-scheduler/clarify";
import { followups as schedFollowups } from "./task-scheduler/followups";
import { meta as schedMeta } from "./task-scheduler/meta";
import { rubric as schedRubric } from "./task-scheduler/rubric";
import { clarify as sheetClarify } from "./spreadsheet/clarify";
import { followups as sheetFollowups } from "./spreadsheet/followups";
import { meta as sheetMeta } from "./spreadsheet/meta";
import { rubric as sheetRubric } from "./spreadsheet/rubric";
import type { PackageModules } from "@/lib/workshop/load";

export const WORKSHOP_REGISTRY: Record<string, PackageModules> = {
  atm: { meta: atmMeta, clarify: atmClarify, rubric: atmRubric, followups: atmFollowups },
  "food-delivery": { meta: foodMeta, clarify: foodClarify, rubric: foodRubric, followups: foodFollowups },
  "ride-sharing": { meta: rideMeta, clarify: rideClarify, rubric: rideRubric, followups: rideFollowups },
  "car-rental": { meta: carMeta, clarify: carClarify, rubric: carRubric, followups: carFollowups },
  "elevator-system": { meta: elevatorMeta, clarify: elevatorClarify, rubric: elevatorRubric, followups: elevatorFollowups },
  "event-bus": { meta: evbMeta, clarify: evbClarify, rubric: evbRubric, followups: evbFollowups },
  "shopping-cart": { meta: cartMeta, clarify: cartClarify, rubric: cartRubric, followups: cartFollowups },
  "payment-processor": { meta: payMeta, clarify: payClarify, rubric: payRubric, followups: payFollowups },
  "file-system": { meta: fsMeta, clarify: fsClarify, rubric: fsRubric, followups: fsFollowups },
  "hotel-booking": { meta: hotelMeta, clarify: hotelClarify, rubric: hotelRubric, followups: hotelFollowups },
  "kv-store": { meta: kvMeta, clarify: kvClarify, rubric: kvRubric, followups: kvFollowups },
  "library-management": { meta: libraryMeta, clarify: libraryClarify, rubric: libraryRubric, followups: libraryFollowups },
  "logger-framework": { meta: loggerMeta, clarify: loggerClarify, rubric: loggerRubric, followups: loggerFollowups },
  "lru-lfu-cache": { meta: lruMeta, clarify: lruClarify, rubric: lruRubric, followups: lruFollowups },
  "notification-service": { meta: notifMeta, clarify: notifClarify, rubric: notifRubric, followups: notifFollowups },
  "parking-lot": { meta: parkingMeta, clarify: parkingClarify, rubric: parkingRubric, followups: parkingFollowups },
  "rate-limiter": { meta: rlMeta, clarify: rlClarify, rubric: rlRubric, followups: rlFollowups },
  "snake-and-ladder": { meta: snlMeta, clarify: snlClarify, rubric: snlRubric, followups: snlFollowups },
  "job-queue": { meta: jobqMeta, clarify: jobqClarify, rubric: jobqRubric, followups: jobqFollowups },
  chess: { meta: chessMeta, clarify: chessClarify, rubric: chessRubric, followups: chessFollowups },
  "task-scheduler": { meta: schedMeta, clarify: schedClarify, rubric: schedRubric, followups: schedFollowups },
  spreadsheet: { meta: sheetMeta, clarify: sheetClarify, rubric: sheetRubric, followups: sheetFollowups },
  splitwise: { meta: splitMeta, clarify: splitClarify, rubric: splitRubric, followups: splitFollowups },
  "text-editor": { meta: editMeta, clarify: editClarify, rubric: editRubric, followups: editFollowups },
  "ticket-booking": { meta: tixMeta, clarify: tixClarify, rubric: tixRubric, followups: tixFollowups },
  "tic-tac-toe": { meta: tttMeta, clarify: tttClarify, rubric: tttRubric, followups: tttFollowups },
  "vending-machine": { meta: vendingMeta, clarify: vendingClarify, rubric: vendingRubric, followups: vendingFollowups },
};
