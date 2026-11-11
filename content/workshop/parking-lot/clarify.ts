import type { ClarifyQuestion } from "@/lib/workshop/types";

export const clarify: ClarifyQuestion[] = [
  { id: "q-fit", text: "Can any vehicle use any spot?", answer: "No. A motorcycle fits any spot, a car needs a Medium or Large spot, a truck needs a Large spot.", reveals: ["R-fit"], quality: "essential" },
  { id: "q-choice", text: "When several spots fit, which one should the vehicle get?", answer: "The smallest spot that fits, so large spots stay free for trucks. Among equals, the lowest spot id (alphabetical).", reveals: ["R-best"], quality: "essential" },
  { id: "q-dup", text: "Can the same plate be parked twice at once?", answer: "No. A plate already inside is refused with AlreadyParked, and nothing changes.", reveals: ["R-plate"], quality: "essential" },
  { id: "q-pricing", text: "How is the fee calculated, and could pricing differ by vehicle type or time of stay?", answer: "Today: 100 cents per started hour, minimum one hour, same for every vehicle. Good question though: management is about to price by vehicle type and give a short free period. Details arrive with the change.", reveals: ["R-fee", "R-rates"], quality: "essential" },
  { id: "q-full", text: "What happens when no suitable spot is free?", answer: "Return LotFull. Nothing is created or changed.", reveals: ["R-full"], quality: "useful" },
  { id: "q-time", text: "Does the system need its own clock for entry and exit times?", answer: "No. The caller passes the number of minutes parked when the vehicle leaves.", reveals: [], quality: "useful" },
  { id: "q-reuse", text: "Once a vehicle leaves, is its spot immediately reusable and may the plate come back later?", answer: "Yes to both. A used ticket is no longer valid: leaving with it again returns NoSuchTicket.", reveals: ["R-leave"], quality: "useful" },
  { id: "q-levels", text: "Do I need to model floors and distance from the entrance?", answer: "Not now. Spots are a flat list with ids. Keep it open to levels, but do not build them.", reveals: [], quality: "useful" },
  { id: "q-pay", text: "Should I integrate a payment gateway at the exit?", answer: "No. The receipt only reports the amount.", reveals: [], quality: "noise" },
  { id: "q-ui", text: "Do you want a gate display or a mobile app?", answer: "No UI. Only the interface in api.h is tested.", reveals: [], quality: "noise" },
  { id: "q-db", text: "Which database should tickets persist to?", answer: "None. In memory for this exercise.", reveals: [], quality: "noise" },
];
