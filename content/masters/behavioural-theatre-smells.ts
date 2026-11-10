import type { Card } from "@/lib/battle/cards";

/**
 * Smell cards for Director Voss's last phase. Each shows a short C++ fragment and asks for the smell, the cost,
 * or the right call. Original wording; the wrong options are the tempting neighbours, and one card tests
 * restraint (a pattern that is not earned) rather than a violation.
 */
export const BEHAVIOURAL_THEATRE_MASTER_SMELLS: Card[] = [
  {
    id: "btm-smell-observer-dangling",
    kind: "smell",
    topic: "L5.observer",
    level: 3,
    prompt: "Crashes appear only after a screen closes. What is wrong with this subject?",
    code: `class Prices {
  std::vector<PriceListener*> listeners_;   // raw, non-owning
 public:
  void subscribe(PriceListener* l) { listeners_.push_back(l); }
  void publish(int p) { for (auto* l : listeners_) l->onPrice(p); }
};
// A screen subscribes in its constructor and is destroyed when closed.`,
    options: [
      "Nothing ties a listener's lifetime to the subject, so a destroyed screen is still called. Hold weak_ptr (or return an unsubscribe token) and skip expired entries",
      "publish() must be static so no listener can be dangling",
      "Observers should be created with new and never freed",
      "Replace the vector with a std::set so duplicates are rejected",
    ],
    answer: [0],
    explain:
      "A subject that stores raw pointers promises to call objects it cannot know are alive. The fix is explicit lifetime: weak_ptr plus a lock-and-skip, or a subscription handle whose destructor unsubscribes. The honest cost is more machinery, and the contract for re-entrancy (a listener unsubscribing inside its own callback) must still be written down.",
  },
  {
    id: "btm-smell-strategy-flags",
    kind: "smell",
    topic: "L5.strategy",
    level: 2,
    prompt: "Every new shipping rule means editing the same function and its tests. Name the smell and the move.",
    code: `Money fee(const Parcel& p, int mode) {
  if (mode == 0) return flat(p);
  if (mode == 1) return perKilo(p);
  if (mode == 2) return flat(p) + insurance(p);
  /* next quarter: modes 3, 4, 5 ... */
}`,
    options: [
      "A mode switch that grows with every rule. Extract a FeePolicy interface, one class per rule, and pass the chosen policy in",
      "Too few comments; document the modes",
      "Make mode a global so every caller sees it",
      "Turn every if into a separate thread",
    ],
    answer: [0],
    explain:
      "An integer selecting behaviour means each new variant edits shared code, which is the opposite of open for extension. A Strategy moves each rule into its own class and lets the caller (or a registry) choose. The cost is a few small classes and an indirection; with two stable rules, the switch is fine.",
  },
  {
    id: "btm-smell-state-flags",
    kind: "smell",
    topic: "L5.state",
    level: 3,
    prompt: "An order can be shipped twice and cancelled after delivery. What is the structural cause?",
    code: `struct Order {
  bool paid = false, shipped = false, delivered = false, cancelled = false;
  void ship()   { if (paid) shipped = true; }
  void cancel() { cancelled = true; }
};`,
    options: [
      "Four independent booleans describe sixteen states, most illegal. Model one explicit state with allowed transitions (State pattern or an enum plus a transition table)",
      "The booleans should be public so callers can check them",
      "Orders need a mutex around every flag",
      "cancel() should delete the order object",
    ],
    answer: [0],
    explain:
      "Flags multiply: each pair can be set independently, so illegal combinations are representable and every method must remember to guard them. One current state plus an explicit transition rule makes illegal moves unrepresentable or loudly rejected. State objects pay off when each state has real behaviour; for pure data, an enum with a table is lighter.",
  },
  {
    id: "btm-smell-template-override-all",
    kind: "smell",
    topic: "L5.template-method",
    level: 3,
    prompt: "A subclass 'customises' the report and silently breaks the footer for everyone. What did the base class get wrong?",
    code: `class Report {
 public:
  virtual void run() {          // the algorithm, overridable
    header(); body(); footer();
  }
  virtual void header(); virtual void body(); virtual void footer();
};`,
    options: [
      "The skeleton is itself virtual and public, so subclasses can replace the fixed steps. Make run() non-virtual (NVI) and expose only the hooks that may vary",
      "Report should be a struct instead of a class",
      "footer() must be called twice to be safe",
      "Use multiple inheritance so each step has its own parent",
    ],
    answer: [0],
    explain:
      "Template Method works because the base class owns the order and subclasses fill in the gaps. Making the skeleton virtual hands that ownership away. A non-virtual public entry point calling protected or private virtual hooks keeps the invariant. The trade-off: subclasses can only vary what you chose to expose, which is the point.",
  },
  {
    id: "btm-smell-mediator-god",
    kind: "smell",
    topic: "L5.mediator",
    level: 3,
    prompt: "A dialog Mediator keeps growing and nobody dares touch it. What has happened, and what is the way out?",
    code: `class SettingsMediator {   // 1,800 lines
  void onThemeChanged(); void onFontChanged(); void onNetworkRetry();
  void onExportClicked(); void validateEverything();
  /* every widget's business rule lives here */
};`,
    options: [
      "The mediator absorbed domain rules and became a god object. Keep it as routing only, move rules into the colleagues or small collaborators, and split by workflow",
      "Mediators should always be a Singleton",
      "Replace the Mediator with global variables",
      "It is fine: centralising everything is the goal of the pattern",
    ],
    answer: [0],
    explain:
      "A mediator trades many-to-many coupling for many-to-one, and the risk is that the one becomes the hairball. Its job is to coordinate, not to hold every rule. Push business decisions back to the objects that own the data, and split by workflow when it still grows. If only two objects talk, no mediator is needed.",
  },
  {
    id: "btm-smell-visitor-moving-target",
    kind: "smell",
    topic: "L5.visitor",
    level: 3,
    prompt: "This codebase gains a new node type every sprint but only two operations ever. Is Visitor the right call?",
    code: `struct NodeVisitor {
  virtual void visit(const Num&) = 0;
  virtual void visit(const Add&) = 0;
  virtual void visit(const Mul&) = 0;
  /* a new node type edits this interface and every visitor */
};`,
    options: [
      "No. Visitor makes new operations cheap and new node types expensive; if the types are what keeps changing, put the operation on each node (virtual method) instead",
      "Yes; Visitor makes both new types and new operations cheap",
      "Yes, but make every visit() static",
      "No; use a Singleton visitor",
    ],
    answer: [0],
    explain:
      "Visitor flips the usual axis: adding an operation touches nothing, but adding an element type edits the visitor interface and every implementation. Pick by which axis moves. With a stable set of types and changing operations (compile, print, price), Visitor wins; with changing types, a plain virtual method wins. State this trade-off out loud in an interview.",
  },
  {
    id: "btm-smell-null-object-hides",
    kind: "smell",
    topic: "L5.null-object",
    level: 3,
    prompt: "A reviewer says this Null Object is the wrong tool here. Why?",
    code: `class NullPaymentGateway : public PaymentGateway {
 public:
  Receipt charge(Money) override { return Receipt{"ok"}; }   // silently 'succeeds'
};
// Injected when the real gateway failed to load at start-up.`,
    options: [
      "Charging is essential, not optional: a Null Object that reports success hides a failure and loses money. Fail loudly at start-up; use Null Object only for genuinely optional collaborators (logging, metrics)",
      "Null Objects must hold a std::mutex",
      "It should return a null pointer instead",
      "charge() should be pure virtual with a default body",
    ],
    answer: [0],
    explain:
      "Null Object removes if-null checks for collaborators whose absence is harmless: a no-op logger, an empty audit. When the operation matters, the do-nothing implementation turns a visible failure into silent data loss. The deciding question is whether a missing collaborator is a valid state of the world or a bug that should stop the program.",
  },
];
