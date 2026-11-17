import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations and sequences seat maps, ledger and allocator in the right order, holding no rule of its own about time", phase: "base", owners: ["ServiceImpl", "BookingServiceImpl", "BookingFacade", "CinemaBooking", "BookingEngine"] },
  { id: "res-seats", text: "Knows the hall's geometry and what each seat records, with no idea what time it is", phase: "base", owners: ["SeatMap", "Hall", "SeatingPlan", "ShowSeats", "SeatGrid"] },
  { id: "res-ledger", text: "Owns the clock, the hold period and the one definition of 'live' and 'lapsed'; every read, hold and confirm asks it", phase: "base", owners: ["HoldLedger", "HoldRegistry", "HoldBook", "HoldManager", "HoldPolicy"] },
  { id: "res-life", text: "Models the hold's life cycle (active, then confirmed, released or lapsed) so terminal states reject every later transition", phase: "base", owners: ["HoldLedger", "HoldRegistry", "HoldBook", "HoldManager", "HoldRecord", "Hold"] },
  { id: "res-extend", text: "Decides whether and when a hold may be extended and moves its deadline", phase: "storm1", owners: ["HoldLedger", "HoldRegistry", "HoldBook", "HoldManager", "ExtensionPolicy", "HoldPolicy"] },
  { id: "res-alloc", text: "Chooses seats for 'best available' behind a replaceable rule that is the only place that knows what 'best' means", phase: "storm2", owners: ["SeatAllocator", "SeatSelector", "SeatChooser", "AllocationStrategy", "SeatPicker"] },
];
