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
  "sign-solid-square": {
    id: "sign-solid-square",
    start: "a",
    nodes: { a: { text: "SOLID SQUARE. Five pillars, five habits: one reason to change, open for extension, honest substitutes, small interfaces, depend on abstractions. Old Town is back south." } },
  },
  "sable-intro": {
    id: "sable-intro",
    start: "a",
    nodes: {
      a: { speaker: "Sable Quill", text: "A class that writes the receipt, stores the receipt and decides the discount has three reasons to change. I count three meetings you will be pulled into.", next: "q" },
      q: {
        speaker: "Sable Quill",
        text: "So: is every class with two methods a violation of the Single Responsibility Principle?",
        choices: [
          { text: "Yes. One method per class, always.", next: "no" },
          { text: "No. It is about reasons to change, not method count.", next: "yes", set: ["sable-srp"] },
        ],
      },
      no: { speaker: "Sable Quill", text: "That road ends in a thousand one-method classes and a reader who cannot find anything. Split along who asks for the change, not along verbs.", next: "bye" },
      yes: { speaker: "Sable Quill", text: "Good. Responsibility means a reason to change, usually one stakeholder. Cohesion is the test; method count is not.", next: "bye" },
      bye: { speaker: "Sable Quill", text: "The Principle Hall's master will test this properly. Practise the refactors first." },
    },
  },
  "rook-intro": {
    id: "rook-intro",
    start: "a",
    nodes: {
      a: { speaker: "Rook Ferris", text: "My notifier called the email library directly. Then Marketing wanted SMS. I spent a week on a one-line idea.", next: "q" },
      q: {
        speaker: "Rook Ferris",
        text: "Dependency inversion, then. Which way should the arrow between policy and detail point?",
        choices: [
          { text: "Detail depends on an abstraction the policy owns.", next: "yes", set: ["rook-dip"] },
          { text: "Policy depends on the concrete detail.", next: "no" },
        ],
      },
      yes: { speaker: "Rook Ferris", text: "Right. The policy defines the interface it needs and the detail plugs into it. A caution: do not invent an interface for every class. Add one where a second implementation or a test double is real.", next: "bye" },
      no: { speaker: "Rook Ferris", text: "That is how I got my week. Flip it: the high-level code states what it needs, and the low-level code adapts.", next: "bye" },
      bye: { speaker: "Rook Ferris", text: "Fight me in the Hall when the master opens it. I will bring a fake clock." },
    },
  },
  "board-solid": {
    id: "board-solid",
    start: "a",
    nodes: { a: { text: "NOTICE: A rule used without its trade-off is a superstition. Read the lessons, then argue with them. -- The Pillar Society" } },
  },
  "marlow-intro": {
    id: "marlow-intro",
    start: "a",
    nodes: {
      a: { speaker: "Provost Marlow", text: "Five gems on my staff, one per principle. Every one has a price when you over-apply it, and the price is where most candidates stumble.", next: "q" },
      q: {
        speaker: "Provost Marlow",
        text: "A colleague wraps every class in an interface 'for flexibility' and has one implementation of each. Which principle did they honour?",
        choices: [
          { text: "Dependency Inversion, so it is fine.", next: "no" },
          { text: "None. That is speculative generality; add the seam when a second implementation or a test double is real.", next: "yes", set: ["marlow-yagni"] },
        ],
      },
      no: { speaker: "Provost Marlow", text: "An abstraction with no second user is cost without benefit: more files, more indirection, the same coupling. Principles justify seams; they do not demand them.", next: "bye" },
      yes: { speaker: "Provost Marlow", text: "Well said. In an interview, say the principle and its cost in the same breath. That is the senior signal.", next: "bye" },
      bye: { speaker: "Provost Marlow", text: "When you have trained on the cards and the refactor drills, take my trial from the Battle menu: Principle Hall master. Three phases, one badge." },
    },
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
