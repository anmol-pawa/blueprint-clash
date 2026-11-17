import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations, validates a request in the documented order and sequences the collaborators", phase: "base", owners: ["RentalsImpl", "RentalService", "RentalSystem", "RentalFacade", "CarRentalService"] },
  { id: "res-span", text: "Owns the meaning of a rental period: the half-open range of hours, its length limit, overlap and the count of started days", phase: "base", owners: ["TimeSpan", "HourRange", "RentalPeriod", "Interval", "Period"] },
  { id: "res-schedule", text: "Answers how many cars of a category are committed at the busiest hour of a period (the promises, not the physical cars)", phase: "base", owners: ["Schedule", "AvailabilityCalendar", "Calendar", "ReservationSchedule", "Timeline"] },
  { id: "res-fleet", text: "Knows the physical cars: which exist, their category, which are out and when each last came back", phase: "base", owners: ["Fleet", "Garage", "CarPool", "Inventory", "Cars"] },
  { id: "res-bookings", text: "Records who holds which reservation with the total it was given, issues ids and spends them", phase: "base", owners: ["Bookings", "ReservationBook", "ReservationStore", "Reservations", "BookingLedger"] },
  { id: "res-tariff", text: "Knows what each category costs per started day and prices a period", phase: "base", owners: ["Tariff", "RateCard", "PriceList", "Pricing", "Rates"] },
  { id: "res-late", text: "Decides what a car that comes back late costs on top of the total", phase: "storm1", owners: ["LateFee", "LateFeePolicy", "PenaltyPolicy", "LatePolicy", "FeePolicy"] },
  { id: "res-chooser", text: "Decides which of the idle cars goes out next", phase: "storm2", owners: ["CarChooser", "CarSelector", "AssignmentPolicy", "CarPicker", "CarAllocator"] },
];
