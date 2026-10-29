import type { DialogueScript } from "./dialogue";

const ADA = "Ada Lintwell";

/** Old Town dialogue. Original wording; Ada sets the learning stance of the whole game. */
export const SCRIPTS: Readonly<Record<string, DialogueScript>> = {
  "ada-intro": {
    id: "ada-intro",
    start: "hello",
    nodes: {
      hello: { speaker: ADA, text: "Ah, the new apprentice. Mind the blueprints on the floor; every one of them is a promise somebody made to a future maintainer.", next: "why" },
      why: { speaker: ADA, text: "Blueprint City keeps crumbling. Not from storms, from change. A rigid design cracks the first time somebody asks for one more feature.", next: "ask" },
      ask: {
        speaker: ADA,
        text: "Before we draw anything: what do you think makes a design good?",
        choices: [
          { text: "It works for today's requirements.", next: "works" },
          { text: "It stays easy to change.", next: "change", set: ["ada-change"] },
          { text: "I am not sure yet.", next: "unsure" },
        ],
      },
      works: { speaker: ADA, text: "Working is the entry fee, not the prize. Plenty of code works and still fights you on Tuesday. Keep that in mind; we will test it with storms.", next: "bye" },
      change: { speaker: ADA, text: "Exactly the instinct I hoped for. Cheap change is the whole game. We will measure it, too.", next: "bye" },
      unsure: { speaker: ADA, text: "Honest answer. You will have your own by the end of the district.", next: "bye" },
      bye: { speaker: ADA, text: "Take a draftling from the shelf when you are ready. Then step out into the square; the notice boards will tell you what the town needs.", set: ["met-ada"] },
    },
  },
  "sign-welcome": {
    id: "sign-welcome",
    start: "a",
    nodes: { a: { text: "OLD TOWN. Population: classes, objects, and one very patient mentor. Drafting Hall straight ahead." } },
  },
  "board-quest": {
    id: "board-quest",
    start: "a",
    nodes: { a: { text: "NOTICE: Who owns this resource? Please settle ownership before the next release. -- Town Council of Smart Pointers" } },
  },
  "board-patterns": {
    id: "board-patterns",
    start: "a",
    nodes: { a: { text: "NOTICE: Patterns are names for problems you already have. District of the Pattern Quarter opens later." } },
  },
  "chalkboard-uml": {
    id: "chalkboard-uml",
    start: "a",
    nodes: { a: { text: "A chalk sketch: a box labelled Shape with an arrow from Circle and Square. 'Depend on the box, not the arrows.'" } },
  },
};
