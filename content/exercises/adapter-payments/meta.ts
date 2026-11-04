import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "adapter-payments",
  title: "Adapter: put a legacy bank behind your gateway",
  concepts: ["adapter", "interface translation", "object adapter", "reference vs copy", "unit conversion"],
  hints: [
    "Checkout already speaks `PaymentGateway`. Write a class that implements it and translates each call into what `LegacyBank` expects: dollars, a C-string, integer codes. Do not touch `LegacyBank`.",
    "Cents become dollars with a floating-point division (`cents / 100.0`); an integer division loses the cents. Keep the translation of result codes in one small function so the mapping is easy to read.",
    "Store `LegacyBank&`, not a `LegacyBank` value: the vendor object has state (its call count) that other code reads. Reject `cents <= 0` and an empty currency before calling the bank at all.",
  ],
  wrong: [
    { dir: "integer_division", failingTests: ["Adapter.ApprovedPaymentConvertsCentsToDollars", "Adapter.SmallAmountsKeepTheirCents"], reason: "Converts with cents / 100 in integer arithmetic, so 1999 cents becomes 19 dollars: a unit-conversion bug hidden inside the translation layer." },
    { dir: "bank_copy", failingTests: ["Adapter.ApprovedPaymentConvertsCentsToDollars", "Adapter.SharesTheVendorObjectInsteadOfCopyingIt"], reason: "Stores a LegacyBank by value, so the adapter talks to a private copy and the real vendor object never sees a call." },
    { dir: "everything_declined", failingTests: ["Adapter.IssuerUnavailableIsRetryable"], reason: "Maps every non-zero code to Declined, so a retryable outage looks like a final refusal and callers cannot tell the difference." },
    { dir: "calls_bank_on_invalid", failingTests: ["Adapter.ImpossibleRequestsNeverReachTheBank"], reason: "Forwards zero, negative and empty-currency requests to the bank and relies on its error codes, wasting a remote call on requests that can never succeed." },
  ],
};
