import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations, validates a request in the documented order and sequences the collaborators", phase: "base", owners: ["RidesImpl", "RideService", "RideSystem", "Dispatcher", "RideFacade"] },
  { id: "res-grid", text: "Owns the meaning of space: the map's limits and the distance in blocks", phase: "base", owners: ["Grid", "CityMap", "Geometry", "Distance", "Coordinates"] },
  { id: "res-roster", text: "Knows the drivers: who exists, who is online, who is on a trip and where each is", phase: "base", owners: ["DriverRoster", "Roster", "DriverPool", "Drivers", "DriverRegistry"] },
  { id: "res-matcher", text: "Decides which of the free drivers gets a trip, behind an interface the rest of the code does not look inside", phase: "base", owners: ["Matcher", "DriverMatcher", "MatchingStrategy", "DriverSelector", "MatchPolicy"] },
  { id: "res-lifecycle", text: "Owns the trip state machine: which moves between stages are legal, written once", phase: "base", owners: ["TripLifecycle", "TripState", "TripStateMachine", "StateMachine", "Transitions"] },
  { id: "res-ledger", text: "Records every trip for good, issues ids and finds a trip or a rider's open trip", phase: "base", owners: ["TripLedger", "TripStore", "Trips", "TripRepository", "TripBook"] },
  { id: "res-fare", text: "Decides what a trip costs, given the distance and, in Storm 1, the state of the market", phase: "storm1", owners: ["FarePolicy", "PricingPolicy", "Pricing", "FareStrategy", "FareCalculator"] },
  { id: "res-decline", text: "Remembers who has declined a trip so that the matcher is never offered them for it, and does the re-matching", phase: "storm2", owners: ["Trip", "RidesImpl", "TripLedger", "Dispatcher", "RideService"] },
];
