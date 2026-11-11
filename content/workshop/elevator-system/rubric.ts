import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-car", text: "Knows one car's floor, heading and stops, and how it sweeps", phase: "base", owners: ["Car", "Elevator", "ElevatorCar", "Cab"] },
  { id: "res-mode", text: "Decides what a car does on a tick at this stage of its life, with one place per stage", phase: "base", owners: ["CarMode", "CarState", "ElevatorState", "ActiveMode", "DoorsOpenMode"] },
  { id: "res-dispatch", text: "Chooses which car answers a hall call, as a replaceable policy", phase: "base", owners: ["Dispatcher", "DispatchStrategy", "NearestCarDispatcher", "SchedulingStrategy"] },
  { id: "res-fleet", text: "Owns the cars and knows which ones may take work", phase: "base", owners: ["Fleet", "Bank", "ElevatorBank", "Controller", "CarPool"] },
  { id: "res-service", text: "Knows what taking a car out of service changes, without editing the other stages or the policy", phase: "storm1", owners: ["OutOfServiceMode", "OutOfServiceState", "ServiceMode"] },
];
