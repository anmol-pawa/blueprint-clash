import type { ClarifyQuestion } from "@/lib/workshop/types";

export const clarify: ClarifyQuestion[] = [
  { id: "q-choose", text: "Which car answers a hall call, and when is that decided?", answer: "Decide immediately, when the button is pressed: the car with the fewest floors between it and the call, measured from where it is right now (busy or not). Ties go to the lowest car id.", reveals: ["R-dispatch"], quality: "essential" },
  { id: "q-order", text: "In what order does a car visit its stops?", answer: "Like a real elevator: it keeps going the way it was going while there is anything ahead, serving stops in passing, and turns around only when nothing is left ahead. It starts out heading up.", reveals: ["R-sweep"], quality: "essential" },
  { id: "q-doors", text: "What happens when a car arrives? Do the doors take time?", answer: "The doors open on the tick it arrives and stay open for one tick. The next tick they close, and the car does not move on that tick. Pressing a button for the floor where a car already stands opens its doors on the next step.", reveals: ["R-doors"], quality: "essential" },
  { id: "q-future", text: "Will cars ever be unavailable, or will the rules for choosing a car change?", answer: "Good question. Maintenance will soon need to take a car out of service, and the dispatch rules will keep changing. Details arrive with the change.", reveals: ["R-service"], quality: "essential" },
  { id: "q-invalid", text: "What counts as an invalid request?", answer: "A floor outside the building, a car that does not exist, and a direction that is impossible (up from the top floor, down from the ground floor). Refusals change nothing.", reveals: ["R-validate"], quality: "useful" },
  { id: "q-time", text: "Is time real or simulated, and how long does a floor take?", answer: "Simulated. Nothing moves until step() is called, and one step is one tick: a car moves one floor per tick.", reveals: [], quality: "useful" },
  { id: "q-direction", text: "Does a car have to respect the direction a rider asked for?", answer: "Not in this version: a hall call is just a stop on the answering car. (A real controller would; say what you would change.)", reveals: [], quality: "useful" },
  { id: "q-capacity", text: "Do cars have a weight or passenger limit?", answer: "No. Assume a car can always take everyone.", reveals: [], quality: "useful" },
  { id: "q-gui", text: "Is there a floor display or a panel inside the cars to design?", answer: "No UI. Only the interface in api.h is tested.", reveals: [], quality: "noise" },
  { id: "q-express", text: "Should some cars be express cars or serve only some floors?", answer: "Not now. Do not make it painful to add later.", reveals: [], quality: "noise" },
  { id: "q-power", text: "Do requests have to survive a power cut?", answer: "No. In memory for this exercise.", reveals: [], quality: "noise" },
];
