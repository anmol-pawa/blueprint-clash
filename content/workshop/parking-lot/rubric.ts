import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-spots", text: "Knows the spots, which are taken, and picks the best-fitting free one", phase: "base", owners: ["SpotInventory", "Spots", "SpotAllocator", "ParkingSpots"] },
  { id: "res-tickets", text: "Knows which vehicles are inside and which ticket belongs to which stay", phase: "base", owners: ["TicketBook", "Tickets", "TicketRegistry", "StayRegistry"] },
  { id: "res-fee", text: "Decides what a stay costs, behind a seam", phase: "base", owners: ["FeePolicy", "PricingPolicy", "HourlyFeePolicy", "FeeCalculator"] },
  { id: "res-facade", text: "Coordinates arrival and departure across spots, tickets and pricing", phase: "base", owners: ["ParkingService", "ParkingLotImpl", "Lot"] },
  { id: "res-rates", text: "Knows the per-vehicle rates and the free period, without touching leave()", phase: "storm1", owners: ["RatedFeePolicy", "VehicleRateFeePolicy", "TypeRateFeePolicy"] },
];
