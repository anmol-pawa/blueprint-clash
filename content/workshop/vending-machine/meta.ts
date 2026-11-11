import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "vending-machine",
  title: "Vending machine",
  level: "SDE2",
  parMinutes: 50,
  patterns: ["State"],
  requirements: [
    { id: "R-add", text: "Slots are added with an id, a name, a price (> 0 cents) and a quantity (>= 0). A duplicate id returns DuplicateSlot, a bad price or quantity returns InvalidArgument, and nothing changes. restock adds units to an existing slot (UnknownSlot, or InvalidArgument for a quantity <= 0).", phase: "base", hidden: true },
    { id: "R-sale", text: "A successful selection dispenses one unit, returns the change (credit minus price) and leaves the machine with no credit.", phase: "base", hidden: false },
    { id: "R-coins", text: "Only 5, 10, 25 and 100 cent coins are accepted. Any other value returns InvalidCoin and the credit does not change.", phase: "base", hidden: true },
    { id: "R-idle", text: "Pressing a slot button with no credit returns InsertCoinFirst, whatever the slot (even an unknown or sold-out one).", phase: "base", hidden: true },
    { id: "R-order", text: "With credit, a selection is checked in this order: UnknownSlot, SoldOut, InsufficientFunds. A refusal changes nothing: the credit stays so the customer can add coins, pick another slot or cancel.", phase: "base", hidden: true },
    { id: "R-cancel", text: "cancel returns all of the credit and clears it; with no credit it returns 0.", phase: "base", hidden: true },
    { id: "R-maint", text: "Storm 1: a technician can put the machine in maintenance. Entering refunds any credit. While in maintenance, coins and selections return OutOfService (OutOfService wins over InsertCoinFirst), cancel returns 0, and restock and addSlot still work. Leaving returns to normal service with no credit; leaving when not in maintenance does nothing.", phase: "storm1", hidden: true },
  ],
  bad: [
    {
      dir: "credit_leak",
      failsPhase: "base",
      failingTests: ["Selling.OverpaymentReturnsChange", "Selling.CreditIsClearedAfterSale"],
      reason: "A sale hands back the change but never clears the credit, so the next customer starts with the previous one's overpayment. The credit and the stage of the purchase live in one place per state; here nothing owns the end of the transaction.",
    },
    {
      dir: "refusal_eats_credit",
      failsPhase: "base",
      failingTests: ["Selling.InsufficientFundsKeepsCredit", "Selling.SoldOutKeepsCredit", "Selling.UnknownSlotKeepsCredit"],
      reason: "A shared cleanup at the end of select() resets the credit on every outcome, refusals included. A refused selection must be a no-op: the customer keeps their money and the choice to add coins or cancel.",
    },
    {
      dir: "idle_not_modelled",
      failsPhase: "base",
      failingTests: ["Idle.SelectWithoutCreditAsksForCoin"],
      reason: "There is no notion of 'waiting for a coin': a button press with no credit falls through to the price check and reports InsufficientFunds (or SoldOut). The machine's stage is implicit in credit == 0, which is exactly what a State object makes explicit.",
    },
    {
      dir: "maintenance_keeps_credit",
      failsPhase: "storm1",
      failingTests: ["Maintenance.EnteringRefundsCredit", "Maintenance.LeavingResumesSales"],
      reason: "Maintenance is added as a boolean flag and entering it forgets about the customer who already paid: their coins are stuck in the machine. A flag adds a case to every operation, and each one is a place to forget.",
    },
    {
      dir: "maintenance_still_sells",
      failsPhase: "storm1",
      failingTests: ["Maintenance.SelectIsRefused"],
      reason: "The maintenance flag is checked in insertCoin() but not in select(), so credit that was inserted earlier can still buy a product. With a State object, select() in MaintenanceState is the only select() the machine can run, so it cannot be forgotten.",
    },
  ],
};
