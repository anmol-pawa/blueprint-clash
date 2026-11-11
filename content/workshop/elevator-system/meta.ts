import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "elevator-system",
  title: "Elevator system",
  level: "SDE2",
  parMinutes: 60,
  patterns: ["State", "Strategy"],
  requirements: [
    { id: "R-validate", text: "A hall call needs a real floor (InvalidFloor) and a direction that exists there: Up from the top floor and Down from floor 0 return InvalidDirection. selectFloor returns UnknownElevator for a car that does not exist and InvalidFloor for a floor that does not. A refused request changes nothing.", phase: "base", hidden: true },
    { id: "R-start", text: "Floors are numbered from 0 and cars from 0. Every car starts idle at floor 0 with no stops.", phase: "base", hidden: false },
    { id: "R-dispatch", text: "A hall call is given to one car at once: the car with the fewest floors between it and the call, measured from where it is now, whether or not it is busy. Ties go to the lowest car id.", phase: "base", hidden: true },
    { id: "R-move", text: "On each step() a car with something to do moves exactly one floor. A car with nothing to do stays where it is.", phase: "base", hidden: false },
    { id: "R-doors", text: "When a car reaches a floor it must stop at, it serves that stop and its doors open on that same tick (state DoorsOpen). The doors stay open for that one tick; the next step() closes them and the car does not move on that tick. A hall or cabin request for the floor where a car already stands opens its doors on the next step. A floor requested twice is served once.", phase: "base", hidden: true },
    { id: "R-sweep", text: "A car keeps the direction of its last move (initially up) while any stop is ahead of it, serving stops in passing in floor order, and reverses only when nothing is left ahead. It never turns back for a nearer stop behind it.", phase: "base", hidden: true },
    { id: "R-service", text: "Storm 1: staff can take a car out of service and bring it back. Taking a car out stops it where it is, drops its cabin stops, and gives its hall calls to the nearest cars still in service (same rule as R-dispatch). Hall calls never go to a car out of service, and selectFloor on one returns OutOfService. The last car in service cannot be removed (CannotRemoveLastCar), removing a car already out is Ok, and unknown cars return UnknownElevator. A car returned to service is idle at the floor where it stopped; returning a car that is in service changes nothing.", phase: "storm1", hidden: true },
  ],
  bad: [
    {
      dir: "first_car_only",
      failsPhase: "base",
      failingTests: ["Dispatch.NearestCarAnswersAHallCall"],
      reason: "Every hall call goes to the first car, so the other cars never help and a rider waits for a car on the far side of the building. The choice of car is a policy, and here it is not even written down: there is no place to put a smarter rule.",
    },
    {
      dir: "nearest_stop_first",
      failsPhase: "base",
      failingTests: ["Sweep.KeepsHeadingBeforeReversing", "Sweep.DownwardSweepKeepsHeadingToo"],
      reason: "Each tick the car heads for whichever stop is nearest, so it zigzags: a rider going to the 6th floor is carried back down to the 3rd and the 8th-floor rider waits behind them. A car needs a heading it keeps, and only reverses when nothing is ahead.",
    },
    {
      dir: "no_door_tick",
      failsPhase: "base",
      failingTests: ["Doors.ArrivalOpensTheDoorsOnTheSameTick", "Doors.DoorsStayOpenForOneTickAndTheCarDoesNotMoveWhileClosing"],
      reason: "Arriving clears the stop but there is no door stage: the doors never open and the car drives straight on. 'Doors open' is a stage of the car's life with its own rule (no movement), which is what a mode object makes explicit.",
    },
    {
      dir: "oos_keeps_calls",
      failsPhase: "storm1",
      failingTests: ["Service.OutOfServiceReassignsHallCalls", "Service.ReassignedCallsGoToTheNearestCarInService"],
      reason: "A flag marks the car as out of service, but the hall calls already given to it stay on it, so nobody will ever answer them. Taking a car out is a transition that must hand its work back, not only stop it.",
    },
    {
      dir: "oos_still_dispatched",
      failsPhase: "storm1",
      failingTests: ["Service.NewCallsSkipACarOutOfService"],
      reason: "The dispatcher was written before the storm and still considers every car. When 'who may take work' lives inside the choosing rule, each new availability rule means editing the policy; the fleet should hand the policy only the eligible cars.",
    },
  ],
};
