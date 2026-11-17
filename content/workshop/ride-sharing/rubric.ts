import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations, validates a request in the documented order and sequences the collaborators", phase: "base", owners: ["RideServiceImpl", "RideService", "RideSystem", "RideFacade", "Dispatcher"] },
  { id: "res-grid", text: "Owns the meaning of space: whether a point is on the grid and the distance between two points", phase: "base", owners: ["Grid", "Geometry", "Distance", "Location", "Point"] },
  { id: "res-roster", text: "Knows the drivers: where each is, whether idle, busy or offline, and who is within range of a point", phase: "base", owners: ["Roster", "DriverRegistry", "Drivers", "DriverPool", "DriverBook"] },
  { id: "res-matcher", text: "Decides which of the nearby drivers gets a request, behind an interface that can be swapped", phase: "base", owners: ["Matcher", "DriverMatcher", "MatchingStrategy", "DriverSelector", "NearestDriver"] },
  { id: "res-machine", text: "Owns the legal moves of a trip: which operation is allowed in which state, and what state follows", phase: "base", owners: ["TripMachine", "TripStateMachine", "TripLifecycle", "TripState", "Transitions"] },
  { id: "res-trips", text: "Records who rides with whom and what the fare is, issues ids, and says whether a rider already has a trip", phase: "base", owners: ["Trips", "TripStore", "TripBook", "TripLog", "Trip"] },
  { id: "res-fare", text: "Knows what a trip costs, including the multiplier of a ride class", phase: "storm1", owners: ["Fare", "FareCalculator", "Pricing", "FarePolicy", "PriceList"] },
  { id: "res-cancelfee", text: "Decides what cancelling costs the rider, given whether the driver has arrived", phase: "storm2", owners: ["CancelFee", "CancellationPolicy", "CancelPolicy", "FeePolicy", "Penalty"] },
];
