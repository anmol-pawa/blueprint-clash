import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "dip-notifier",
  title: "Order service: depend on an abstraction, not on email",
  concepts: ["dependency inversion", "constructor injection", "test doubles", "reference vs owning injection"],
  hints: [
    "The tests give you a sender you have never seen. Where can the service get it from, if it must not create one or reach for a global?",
    "Take `MessageSender&` in the constructor and keep it in a member. The service decides *when* to notify; the sender decides *how*.",
    "`placeOrder`: reject `quantity <= 0` first; build the body with `std::to_string`; `if (!sender_.send(customer, body)) return false;` then `++confirmed_` and return true.",
  ],
  wrong: [
    { dir: "hardwired_email", failingTests: ["Order.SendsOneConfirmationThroughTheInjectedSender", "Injection.TwoServicesUseTheirOwnSenders"], reason: "The service ignores the injected sender and writes through a hard-wired internal email sender, so the caller cannot substitute or observe anything (the high-level policy depends on a concrete detail)." },
    { dir: "ignores_failure", failingTests: ["Order.FailedDeliveryIsNotAConfirmedOrder"], reason: "Counts the order as confirmed even when the sender reports that delivery failed." },
    { dir: "sends_invalid", failingTests: ["Order.RejectsNonPositiveQuantityWithoutSending"], reason: "Sends a confirmation for a zero or negative quantity before validating it." },
  ],
};
