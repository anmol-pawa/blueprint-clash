import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "facade-checkout",
  title: "Facade: one checkout call over four subsystems",
  concepts: ["facade", "orchestration order", "compensation on failure", "dependency by reference", "keeping the facade thin"],
  hints: [
    "Write one method that is the whole script: validate, reserve, charge, ship, email. Each subsystem call is one line; the facade's value is the order and the failure handling, not new logic.",
    "The order protects the customer and the stock: reserve before charging (so nobody pays for goods you cannot supply) and charge before shipping. If the charge is declined, undo the reservation with `release`, and do not email.",
    "Validate first, before any subsystem is touched, and compute the total as `quantity * unitCents` in `long long`. Store the subsystems as references: the facade neither owns nor copies them, and they remain usable on their own.",
  ],
  wrong: [
    { dir: "no_release_on_decline", failingTests: ["Checkout.DeclinedPaymentReleasesTheReservation"], reason: "Forgets to give the reservation back when the card is declined, so every failed payment permanently removes stock: the compensation step is the part callers cannot be trusted to remember." },
    { dir: "charge_before_reserve", failingTests: ["Checkout.HappyPathRunsTheSubsystemsInOrder", "Checkout.OutOfStockNeverChargesOrShips"], reason: "Charges first and checks stock second, so a customer can be charged for an item that is out of stock and needs a refund path the facade does not have." },
    { dir: "skips_validation", failingTests: ["Checkout.InvalidOrdersTouchNothing"], reason: "Sends impossible orders (empty names, zero or negative quantity) to the subsystems and relies on each of them to cope, spreading validation across four places." },
    { dir: "emails_on_decline", failingTests: ["Checkout.DeclinedPaymentSendsNoEmail"], reason: "Sends a confirmation even though the payment failed, telling the customer an order exists that does not." },
    { dir: "charges_unit_price", failingTests: ["Checkout.ChargesQuantityTimesUnitPrice", "Checkout.HappyPathRunsTheSubsystemsInOrder"], reason: "Charges the unit price once instead of quantity times unit price: the customer pays for one item and receives several." },
  ],
};
