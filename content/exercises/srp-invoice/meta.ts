import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "srp-invoice",
  title: "Invoice: one class, one reason to change",
  concepts: ["single responsibility", "separating data, formatting and persistence", "cohesion", "dependency on a sink abstraction"],
  hints: [
    "List who would ask for a change: finance (how totals work), design (how text looks), operations (where it is saved). Each is a different reason to change.",
    "`Invoice` keeps items and sums them. `InvoiceFormatter` only turns an `Invoice` into text. `InvoiceArchiver` only hands text to an `InvoiceSink`.",
    "`money(cents)`: dollars are `cents / 100`; the remainder `cents % 100` needs a leading `0` when below 10. `archive` is `sink_.store(formatter_.render(invoice))`.",
  ],
  wrong: [
    { dir: "invoice_renders", failingTests: ["Srp.InvoiceOnlyHoldsData"], reason: "Invoice still has a render member: the data class knows about presentation, so a layout change edits the same class as a pricing change." },
    { dir: "archive_unformatted", failingTests: ["Archiver.StoresTheRenderedTextOnce", "Archiver.EachArchiveCallStoresOnce"], reason: "The archiver stores only the raw total, not the formatted invoice text." },
    { dir: "money_truncates", failingTests: ["Formatter.RendersLinesAndTotal", "Formatter.ZeroIsTwoDigits", "Formatter.SingleDigitCentsArePadded"], reason: "Formats cents without padding the remainder to two digits (5 cents become 0.5)." },
  ],
};
