import type { Card } from "@/lib/battle/cards";

/**
 * Modelling and UML concept deck, part 1 (CURRICULUM L6). Original wording. Multiple-choice only for now: UML-reading
 * cards arrive with the Design Board (C8c). Topics: entities, class-diagram, state-diagram.
 */
export const MODELLING_DECK: Card[] = [
  // ---- Requirements to entities ----------------------------------------
  {
    id: "ml-mcq-ent-nouns", kind: "mcq", topic: "L6.entities", level: 1,
    prompt: "In noun/verb analysis of a brief, what do the nouns usually become?",
    options: ["Candidate classes or fields", "Candidate design patterns", "Unit tests", "Thread-safety requirements"],
    answer: [0],
    explain: "Nouns are candidate entities (classes) or attributes (fields); verbs are candidate behaviours (methods). Patterns come later, once you see which part will change.",
  },
  {
    id: "ml-mcq-ent-attribute", kind: "mcq", topic: "L6.entities", level: 1,
    prompt: "A brief says a book has a title. Which is the better first model?",
    options: ["A `std::string title` field on `Book`", "A `Title` class with its own interface and subclasses", "A `TitleManager` singleton", "A `BookTitleFactory`"],
    answer: [0],
    explain: "A noun that only describes another noun is a field. It earns a class only if it has its own rules or lifecycle (for example validation, formatting or several variants).",
  },
  {
    id: "ml-mcq-ent-crc", kind: "mcq", topic: "L6.entities", level: 2,
    prompt: "A CRC card for a class lists a responsibility that needs 'and' to describe ('stores loans AND calculates fines AND emails members'). What does that suggest?",
    options: ["The class probably holds several responsibilities and should be split", "The class is well named", "The class should become a singleton", "The class needs a virtual destructor"],
    answer: [0],
    explain: "Needing 'and' in the responsibility sentence is the same signal as an SRP violation, found at the whiteboard before any code exists.",
  },
  {
    id: "ml-mcq-ent-verb-home", kind: "mcq", topic: "L6.entities", level: 2,
    prompt: "The verb 'calculate the late fee' needs the due date (held by `Loan`) and a per-day rate that finance may change. Where does it best live?",
    options: ["A `FinePolicy` that takes a `Loan`, so the rate rule has one named home", "Inside `Library::giveBack`, next to the maps", "Inside `Member`, because members pay", "In a global function using a `#define` rate"],
    answer: [0],
    explain: "The rate is the likely change, so give it a named class. `Loan` answers 'how late'; the policy turns lateness into money. Burying it in `Library` is the god-class smell.",
  },
  // ---- Class diagrams as ownership -------------------------------------
  {
    id: "ml-mcq-cd-composition", kind: "mcq", topic: "L6.class-diagram", level: 1,
    prompt: "A `Car` is composed of an `Engine`. In C++, which member best expresses composition?",
    options: ["An `Engine` member by value (or a `unique_ptr<Engine>` if it must be polymorphic)", "A raw `Engine*` the caller keeps alive", "A global `Engine`", "A `weak_ptr<Engine>`"],
    answer: [0],
    explain: "Composition means the whole owns the part and controls its lifetime: a value member or `unique_ptr`. A raw or weak pointer says someone else owns it.",
  },
  {
    id: "ml-mcq-cd-aggregation", kind: "mcq", topic: "L6.class-diagram", level: 2,
    prompt: "A `Team` refers to `Driver` objects that exist independently and may belong to several teams. Which relationship and member?",
    options: ["Aggregation: non-owning references or pointers (drivers must outlive the team)", "Composition: `vector<Driver>` by value", "Inheritance: `Team : public Driver`", "Dependency: a function parameter only"],
    answer: [0],
    explain: "The team does not own the drivers' lifetime, so it holds non-owning handles and the lifetime rule becomes part of the contract. A by-value vector would copy drivers and break the shared identity.",
  },
  {
    id: "ml-mcq-cd-dependency", kind: "mcq", topic: "L6.class-diagram", level: 1,
    prompt: "`Printer::print(const Report& r)` uses a `Report` for one call and stores nothing. Which UML line is that?",
    options: ["A dashed dependency arrow", "A filled-diamond composition", "A hollow-diamond aggregation", "An inheritance triangle"],
    answer: [0],
    explain: "If the other type appears only as a parameter, local or return type, it is a dependency. An association or aggregation is for a stored reference.",
  },
  {
    id: "ml-mcq-cd-inherit", kind: "mcq", topic: "L6.class-diagram", level: 2,
    prompt: "An engineer draws `Stack` inheriting from `Vector` 'to reuse push and pop'. What is the best critique?",
    options: ["It exposes vector operations that break stack invariants; prefer composition", "It is fine, inheritance is always for reuse", "It needs a singleton", "It should be a friend class"],
    answer: [0],
    explain: "Public inheritance promises substitutability, and a `Stack` that can be indexed or inserted into the middle is not substitutable in spirit. Hold the vector as a private member and expose only stack operations.",
  },
  // ---- State diagrams --------------------------------------------------
  {
    id: "ml-mcq-sd-arrow", kind: "mcq", topic: "L6.state-diagram", level: 1,
    prompt: "What does an arrow in a state diagram represent?",
    options: ["A transition between states, triggered by an event (optionally with a guard and an action)", "A class inheriting from another", "A thread starting", "A database foreign key"],
    answer: [0],
    explain: "An arrow is labelled event [guard] / action. Missing arrows are the useful finding: they are the events the requirements forgot to specify.",
  },
  {
    id: "ml-mcq-sd-flags", kind: "mcq", topic: "L6.state-diagram", level: 2,
    prompt: "A class tracks its condition with `bool paid_, shipped_, cancelled_`. What is the main risk?",
    options: ["Impossible combinations (for example shipped and cancelled) are representable and nothing forbids them", "Booleans are slow", "It cannot be unit tested", "It forces a singleton"],
    answer: [0],
    explain: "Three booleans allow eight combinations, but an order has a few real states. An `enum class` plus one transition function makes illegal states unrepresentable or at least rejected in one place.",
  },
  {
    id: "ml-mcq-sd-missing", kind: "mcq", topic: "L6.state-diagram", level: 2,
    prompt: "While drawing a vending machine's states you notice nothing says what happens when a coin is inserted during dispensing. What do you do in an interview?",
    options: ["Name it as an open question, propose a default (reject the coin) and note the alternative", "Ignore it, since the happy path works", "Add a mutex", "Switch to a microservice"],
    answer: [0],
    explain: "Finding the missing transition is the point of the diagram. Stating the gap, choosing a default and flagging the trade-off is the Senior-level behaviour interviewers look for.",
  },
  {
    id: "ml-mcq-sd-enum-vs-pattern", kind: "mcq", topic: "L6.state-diagram", level: 3,
    prompt: "A machine has three states and no state-specific data. When is the State pattern (a class per state) justified over an enum and a switch?",
    options: ["Not yet: use the enum; move to State when states gain their own behaviour, data or frequent additions", "Always, because switches are forbidden", "Only for machines with exactly two states", "Whenever a mutex is present"],
    answer: [0],
    explain: "The pattern pays for itself when every new state would otherwise touch many switches. For a small closed machine the enum is clearer and cheaper; say that, then name the trigger for refactoring.",
  },
];
