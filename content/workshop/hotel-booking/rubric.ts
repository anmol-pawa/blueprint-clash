import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations, validates a request in the documented order and sequences the collaborators", phase: "base", owners: ["HotelImpl", "HotelService", "HotelBooking", "HotelFacade", "BookingSystem"] },
  { id: "res-range", text: "Owns the meaning of a stay: the half-open range of nights, its length limit and how far away it starts", phase: "base", owners: ["StayRange", "DateRange", "NightRange", "Stay", "StayDates"] },
  { id: "res-calendar", text: "Counts the rooms taken on each night of one room type and answers availability as the tightest night", phase: "base", owners: ["RoomCalendar", "Inventory", "NightlyInventory", "AvailabilityCalendar", "RoomStock"] },
  { id: "res-reservations", text: "Records who holds which reservation with the total it was given, issues ids and spends them on cancel", phase: "base", owners: ["ReservationBook", "ReservationStore", "Reservations", "BookingLedger", "ReservationRegistry"] },
  { id: "res-pricing", text: "Prices a stay night by night; the one place that knows normal rates and seasons", phase: "storm1", owners: ["Pricing", "RateCard", "PriceCalculator", "Pricer", "RatePolicy"] },
  { id: "res-refund", text: "Decides how much of a total is paid back for a cancellation this many days ahead", phase: "storm2", owners: ["RefundPolicy", "CancellationPolicy", "RefundStrategy", "TieredRefund", "RefundSchedule"] },
];
