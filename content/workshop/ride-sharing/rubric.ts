import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations, validates a request in the documented order and sequences the collaborators", phase: "base", owners: ["RideImpl", "RideService", "DispatchService", "RideDispatch", "DispatchImpl"] },
  { id: "res-geometry", text: "Owns the meaning of the grid: Manhattan distance and what counts as a point on it", phase: "base", owners: ["Geometry", "Grid", "Distance", "Location", "Point"] },
  { id: "res-drivers", text: "Knows the drivers: who exists, their state and spot, and their rating history", phase: "base", owners: ["DriverPool", "Drivers", "DriverRegistry", "DriverBook", "DriverStore"] },
  { id: "res-trip", text: "Is one trip and its state machine: which moves are legal from which state, and who the rider and driver are", phase: "base", owners: ["Trip", "TripState", "TripStateMachine", "Ride", "Journey"] },
  { id: "res-tripbook", text: "Issues trip ids, keeps every trip and knows which riders have an unfinished one", phase: "base", owners: ["TripBook", "Trips", "TripStore", "TripRegistry", "TripLedger"] },
  { id: "res-tariff", text: "Knows what a trip of a given distance costs, including any multiplier", phase: "base", owners: ["Tariff", "FareCalculator", "Pricing", "FarePolicy", "Fare"] },
  { id: "res-surge", text: "Decides the price multiplier from the supply at request time", phase: "storm1", owners: ["SurgePolicy", "SurgePricing", "DemandPricing", "PricingPolicy", "SurgeStrategy"] },
  { id: "res-matcher", text: "Decides which of the nearby available drivers gets the ride, and how far it looks", phase: "storm2", owners: ["DriverMatcher", "MatchingStrategy", "Matcher", "DriverSelector", "DriverChooser"] },
];
