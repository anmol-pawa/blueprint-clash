import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations, validates a request in the documented order and sequences the collaborators", phase: "base", owners: ["BookingImpl", "BookingService", "TicketBooking", "BookingFacade", "BookingSystem"] },
  { id: "res-layout", text: "Knows the hall's shape and how seats are named; parses names strictly", phase: "base", owners: ["Layout", "Hall", "SeatMap", "SeatGrid", "SeatNaming"] },
  { id: "res-window", text: "Owns the clock and the one definition of 'a hold is live'; every free-seat, confirm and usage question asks it", phase: "base", owners: ["HoldWindow", "HoldPolicy", "HoldClock", "ExpiryRule", "HoldTimer"] },
  { id: "res-inventory", text: "Records which seats are booked or held and by whom, derives seat state, and settles confirm and release in one place", phase: "base", owners: ["Inventory", "SeatInventory", "SeatLedger", "HoldBook", "ShowSeats"] },
  { id: "res-select", text: "Chooses seats for a 'best seats' request by a replaceable rule", phase: "storm1", owners: ["SeatSelector", "SeatChooser", "SeatPicker", "SelectionStrategy", "CentreFirstSelector"] },
  { id: "res-limit", text: "Decides whether a user may take more seats, from what they already use", phase: "storm2", owners: ["UsagePolicy", "SeatLimit", "UserLimit", "LimitPolicy", "QuotaPolicy"] },
];
