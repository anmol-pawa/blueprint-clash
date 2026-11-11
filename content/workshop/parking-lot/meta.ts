import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "parking-lot",
  title: "Parking lot",
  level: "SDE2",
  parMinutes: 50,
  patterns: ["Strategy (fee policy)"],
  requirements: [
    { id: "R-add", text: "Spots (with a size) can be added; ids are unique. Parking returns a ticket naming the spot; leaving returns a receipt with a fee.", phase: "base", hidden: false },
    { id: "R-fit", text: "A motorcycle fits any spot, a car needs a Medium or Large spot, a truck needs a Large spot.", phase: "base", hidden: true },
    { id: "R-best", text: "The vehicle gets the smallest free spot that fits; ties go to the lowest spot id.", phase: "base", hidden: true },
    { id: "R-plate", text: "A plate that is already inside is refused (AlreadyParked) and nothing changes.", phase: "base", hidden: true },
    { id: "R-full", text: "When no suitable spot is free, the result is LotFull and nothing changes.", phase: "base", hidden: true },
    { id: "R-leave", text: "Leaving frees the spot immediately; a used or unknown ticket returns NoSuchTicket; the plate may park again later.", phase: "base", hidden: true },
    { id: "R-fee", text: "The fee is 100 cents per started hour, minimum one hour, the same for every vehicle.", phase: "base", hidden: true },
    { id: "R-rates", text: "Storm 1: price by vehicle type (motorcycle 50, car 100, truck 200 cents per started hour); stays of 15 minutes or less are free. The vehicle type decides the rate, not the spot it ended up in.", phase: "storm1", hidden: true },
  ],
  bad: [
    {
      dir: "no_size_check",
      failsPhase: "base",
      failingTests: ["Parking.TruckOnlyFitsLarge", "Parking.TruckNeverTakesSmallSpot"],
      reason: "Ignores the fit rule: any free spot will do, whatever the vehicle. The fit rule was never asked about, so a truck gets parked in a motorcycle bay; a clarifying question would have surfaced it.",
    },
    {
      dir: "double_park",
      failsPhase: "base",
      failingTests: ["Parking.SamePlateTwiceIsRefused"],
      reason: "Never checks whether the plate is already inside, so one car holds two spots and the second ticket can never be reconciled.",
    },
    {
      dir: "spot_leak",
      failsPhase: "base",
      failingTests: ["Leaving.SpotIsFreedAfterLeaving", "Leaving.FreedSpotIsReused"],
      reason: "leave() closes the ticket but forgets to free the spot: the lot fills up for good. Two structures kept in step by hand is the smell; the reference releases the spot and closes the ticket in one method that owns the transition.",
    },
    {
      dir: "fee_hardcoded",
      failsPhase: "storm1",
      failingTests: ["Pricing.TruckPaysDouble", "Pricing.FirstFifteenMinutesAreFree"],
      reason: "The tariff is a literal inside leave(). It passed the base phase; the storm has to edit that method, and this version never consults the vehicle type.",
    },
    {
      dir: "rate_by_spot",
      failsPhase: "storm1",
      failingTests: ["Pricing.MotorcycleInBiggerSpotStillPaysMotorcycleRate"],
      reason: "Prices by the size of the spot instead of the type of the vehicle. A motorcycle that overflowed into a Medium bay is billed as a car. The rate belongs to the thing the customer chose, not to an allocation detail.",
    },
  ],
};
