import type { ClarifyQuestion } from "@/lib/workshop/types";

export const clarify: ClarifyQuestion[] = [
  { id: "q-coins", text: "Which coins does the machine accept, and what happens to others?", answer: "5, 10, 25 and 100 cents. Any other value is rejected with InvalidCoin and the credit stays as it was.", reveals: ["R-coins"], quality: "essential" },
  { id: "q-nocredit", text: "What if the customer presses a slot button before inserting anything?", answer: "InsertCoinFirst, whichever slot it is, even one that does not exist or is sold out.", reveals: ["R-idle"], quality: "essential" },
  { id: "q-refusal", text: "If the selection fails (unknown slot, sold out, not enough money), what happens to the money and in what order are the failures checked?", answer: "Check unknown slot, then sold out, then insufficient funds. A refusal changes nothing: the credit stays so the customer can add coins, choose again or cancel.", reveals: ["R-order"], quality: "essential" },
  { id: "q-future", text: "Is the machine ever out of service, or will there be modes besides selling?", answer: "Good question. Technicians will soon need a maintenance mode. Details arrive with the change.", reveals: ["R-maint"], quality: "essential" },
  { id: "q-cancel", text: "What does cancel do, and is there a refund when nothing was inserted?", answer: "It returns all the credit and clears it. With no credit it returns 0.", reveals: ["R-cancel"], quality: "useful" },
  { id: "q-slots", text: "How are slots set up, can ids repeat, and can the price be zero?", answer: "Staff add slots with an id, name, price and quantity. A duplicate id returns DuplicateSlot. Price must be above 0 and the quantity 0 or more, otherwise InvalidArgument. Restocking adds units to an existing slot.", reveals: ["R-add"], quality: "useful" },
  { id: "q-change", text: "Does the machine hold a limited stock of coins for change?", answer: "No. Assume it can always give exact change. (A real machine cannot; say what you would do about it.)", reveals: [], quality: "useful" },
  { id: "q-multi", text: "Can the customer buy several items with one payment?", answer: "No. One sale ends the transaction: the change is returned and the credit goes back to zero.", reveals: [], quality: "useful" },
  { id: "q-card", text: "Should it take card or phone payments?", answer: "Not now. Coins only, but do not make adding another payment method painful.", reveals: [], quality: "noise" },
  { id: "q-ui", text: "Is there a screen or a touch panel to design?", answer: "No UI. Only the interface in api.h is tested.", reveals: [], quality: "noise" },
  { id: "q-persist", text: "Does the stock have to survive a power cut?", answer: "No. In memory for this exercise.", reveals: [], quality: "noise" },
];
