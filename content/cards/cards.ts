import type { Card } from "@/lib/battle/types";

/** Hand-written non-predict cards for Old Town. Original wording. */
export const OLD_TOWN_CARDS: Card[] = [
  {
    id: "mcq-raii-definition",
    kind: "mcq",
    topic: "raii",
    prompt: "In C++, what does RAII tie the lifetime of a resource to?",
    options: ["The lifetime of an object (acquire in the constructor, release in the destructor)", "The garbage collector's next cycle", "The end of the translation unit", "An explicit close() call the caller must remember"],
    answer: 0,
    explain: "RAII binds a resource to an object's scope. When the object is destroyed, normally or while unwinding after an exception, the destructor releases the resource, so there is no cleanup call to forget.",
  },
  {
    id: "mcq-rule-of-zero",
    kind: "mcq",
    topic: "ownership",
    prompt: "A class holds a std::string and a std::vector<int> and nothing else needing special cleanup. Which special members should you write?",
    options: ["None: let the compiler generate them (rule of zero)", "Only a destructor", "Copy constructor and destructor, but not assignment", "All five, to be safe"],
    answer: 0,
    explain: "Members that already manage themselves make the compiler-generated copy, move and destructor correct. Writing them by hand adds bugs and can suppress the implicit move operations.",
  },
  {
    id: "multi-virtual-dtor",
    kind: "multi",
    topic: "polymorphism",
    prompt: "Which of these classes should declare a virtual destructor?",
    options: ["An abstract Shape interface that callers delete through unique_ptr<Shape>", "A final value type Point {int x, y;}", "A base class whose objects are owned by shared_ptr<Base> only", "A base class with virtual functions that someone might delete through a Base*"],
    answers: [0, 3],
    explain: "Deleting a derived object through a base pointer without a virtual destructor is undefined behaviour. Interfaces and polymorphic bases need one. A plain value type does not. shared_ptr happens to remember the real deleter, but making the destructor virtual (or protected non-virtual) is still the safe rule for a polymorphic base.",
  },
  {
    id: "pattern-undo-stack",
    kind: "pattern",
    topic: "patterns",
    scenario: "A text editor must let users undo and redo operations, and each operation should be a small object that knows how to apply and reverse itself.",
    options: ["Command", "Singleton", "Flyweight", "Facade"],
    answer: 0,
    explain: "Command turns a request into an object, which is what makes queueing, logging and undo possible. Keep a stack of executed commands and call undo() on the top one.",
  },
  {
    id: "pattern-legacy-gateway",
    kind: "pattern",
    topic: "patterns",
    scenario: "Your code expects a PaymentGateway interface, but the vendor SDK exposes a different set of methods you cannot change.",
    options: ["Adapter", "Decorator", "Observer", "Prototype"],
    answer: 0,
    explain: "Adapter translates one interface into the one your code expects, leaving both sides untouched. Decorator keeps the same interface and adds behaviour, which is not the problem here.",
  },
  {
    id: "smell-god-class",
    kind: "smell",
    topic: "solid",
    code: `class OrderManager {
 public:
  void addItem(const Item&);
  double computeTax() const;
  void chargeCard(const Card&);
  void sendConfirmationEmail();
  void saveToDatabase();
  std::string renderInvoiceHtml() const;
};`,
    options: ["God class: violates the Single Responsibility Principle", "Liskov violation", "Interface segregation violation", "Dependency inversion is satisfied"],
    answer: 0,
    explain: "Pricing, payment, email, persistence and rendering change for different reasons and belong in separate collaborators. One reason to change per class is the point of SRP.",
  },
  {
    id: "smell-switch-on-type",
    kind: "smell",
    topic: "solid",
    code: `double area(const Shape& s) {
  switch (s.kind) {
    case Kind::Circle: return 3.14159 * s.r * s.r;
    case Kind::Rect:   return s.w * s.h;
  }
  return 0;
}`,
    options: ["Open/Closed violation: every new shape edits this function", "Single Responsibility violation", "Interface segregation violation", "No smell: switches are always fine"],
    answer: 0,
    explain: "A tag plus a switch means adding Triangle requires modifying area() and every other switch like it. A virtual area() on a Shape hierarchy lets you extend without editing existing code.",
  },
];
