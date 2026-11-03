import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "dip-clock",
  title: "Sessions: inject the clock and own it",
  concepts: ["dependency inversion", "owning injection with unique_ptr", "testable time", "lifetime and ownership"],
  hints: [
    "How would a test ever make a session expire without waiting? The store needs a time source it does not create itself.",
    "Take `std::unique_ptr<Clock>` by value in the constructor and `std::move` it into a member: that says \"the store owns this clock\". Keep a `std::map<std::string, long long>` of token to creation time.",
    "`isValid`: find the token; `return it != end && clock_->nowSeconds() - it->second < ttl_;`. `activeCount` counts the valid ones. Tokens: `\"s\" + std::to_string(++counter_)`.",
  ],
  wrong: [
    { dir: "system_clock", failingTests: ["Expiry.SessionExpiresWhenTheInjectedClockAdvances", "Expiry.ActiveCountDropsAsSessionsExpire"], reason: "Ignores the injected clock and reads std::chrono::system_clock, so the test's clock has no effect and nothing can be tested without sleeping." },
    { dir: "off_by_one", failingTests: ["Expiry.ExpiresExactlyAtTheTtl"], reason: "Uses <= so a session is still valid at exactly ttl seconds, contradicting the documented contract." },
    { dir: "leaks_clock", failingTests: ["Ownership.StoreDestroysTheClockItOwns"], reason: "Releases the unique_ptr into a raw pointer and never deletes it, so the owner of the clock is unclear and it leaks." },
  ],
};
