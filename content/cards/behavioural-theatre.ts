import type { Card } from "@/lib/battle/cards";

/**
 * Behavioural Theatre concept deck (CURRICULUM L5). Original wording. Predict cards are compiled and run
 * natively by content:verify. Part 1 (C7a) covers Strategy, Observer, Command, State, Template Method and
 * Iterator; part 2 (C7a2) appends the remaining patterns. Patternling names used by the pattern cards:
 * Swapaw (Strategy), Watchowl (Observer), Scrollhound (Command), Chamelyn (State), Stencilmoth (Template
 * Method), Stepede (Iterator). Their sprites arrive with C7d.
 */
export const BEHAVIOURAL_THEATRE_PART1: Card[] = [
  // ---- Strategy --------------------------------------------------------
  {
    id: "bt-mcq-st-intent",
    kind: "mcq",
    topic: "L5.strategy",
    level: 1,
    prompt: "What is the intent of the Strategy pattern?",
    options: [
      "Put each interchangeable algorithm behind one interface so the caller can pick or swap it without changing its own code",
      "Let an object change its behaviour automatically as its internal state changes",
      "Define the skeleton of an algorithm in a base class and let subclasses fill in steps",
      "Notify many dependants when one object changes",
    ],
    answer: [0],
    explain: "Strategy lets the client choose the algorithm, usually by injecting it. State looks similar but the object switches strategies itself; Template Method fixes the skeleton by inheritance; Observer is about notification.",
  },
  {
    id: "bt-pat-st-shipping",
    kind: "pattern",
    topic: "L5.strategy",
    level: 1,
    prompt: "A checkout computes shipping as flat-rate, by weight, or by distance, and marketing keeps adding rules. The caller picks the rule per order. Which Patternling fits?",
    options: ["Swapaw (Strategy)", "Chamelyn (State)", "Stencilmoth (Template Method)", "Watchowl (Observer)"],
    answer: [0],
    explain: "Interchangeable algorithms chosen from outside: Strategy. If the order itself moved through phases and the rule changed because of that, it would be State. A Template Method would hide the choice in a subclass hierarchy.",
  },
  {
    id: "bt-pred-st-sort",
    kind: "predict",
    topic: "L5.strategy",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Ordering {
  virtual ~Ordering() = default;
  virtual bool before(const std::string& a, const std::string& b) const = 0;
};
struct ByLength : Ordering {
  bool before(const std::string& a, const std::string& b) const override { return a.size() < b.size(); }
};
struct Alphabetical : Ordering {
  bool before(const std::string& a, const std::string& b) const override { return a < b; }
};

void show(std::vector<std::string> v, const Ordering& o) {
  std::stable_sort(v.begin(), v.end(), [&](const auto& a, const auto& b) { return o.before(a, b); });
  for (size_t i = 0; i < v.size(); ++i) std::cout << (i ? " " : "") << v[i];
  std::cout << "\\n";
}

int main() {
  std::vector<std::string> words = {"pear", "fig", "apple", "kiwi"};
  show(words, ByLength());
  show(words, Alphabetical());
}
`,
    output: "fig pear kiwi apple\napple fig kiwi pear",
    options: [
      "fig pear kiwi apple\napple fig kiwi pear",
      "fig kiwi pear apple\napple fig kiwi pear",
      "pear fig apple kiwi\napple fig kiwi pear",
      "fig pear kiwi apple\npear kiwi fig apple",
    ],
    answer: [0],
    explain: "The caller owns the same data and swaps only the Ordering. stable_sort keeps equal-length words in input order, so pear stays before kiwi. Alphabetical gives apple fig kiwi pear. The function never mentions a concrete ordering, which is the point.",
  },
  {
    id: "bt-mcq-st-cpp",
    kind: "mcq",
    topic: "L5.strategy",
    level: 2,
    prompt: "In C++ you can express a Strategy as a virtual interface, a std::function, or a template parameter. Which statement is most accurate?",
    options: [
      "A template parameter is resolved at compile time and can inline, but the choice cannot change at runtime; a virtual interface or std::function allows runtime swapping at a small call cost",
      "A virtual interface is always the fastest because the vtable is cached",
      "std::function cannot hold a lambda that captures state",
      "Only a virtual interface counts as the Strategy pattern; the others are different patterns",
    ],
    answer: [0],
    explain: "The pattern is the idea, not the syntax. Pick a template when the policy is fixed per type (as in std::sort with a comparator), std::function for a single callable, and a virtual interface when the strategy has several operations or carries its own state and lifetime.",
  },
  {
    id: "bt-smell-st-switch",
    kind: "smell",
    topic: "L5.strategy",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `enum class Plan { Free, Pro, Team };

double price(Plan p, int seats) {
  switch (p) {
    case Plan::Free: return 0.0;
    case Plan::Pro:  return 12.0 * seats;
    case Plan::Team: return seats > 10 ? 9.0 * seats : 11.0 * seats;
  }
  return 0.0;
}`,
    options: [
      "A switch on a type tag that grows with every new plan; Open/Closed (a Strategy per plan would let you add one without editing this function)",
      "A subclass breaks its base contract; Liskov Substitution",
      "A wide interface forces unused methods; Interface Segregation",
      "A class reaches through other objects; Law of Demeter",
    ],
    answer: [0],
    explain: "Every new plan edits this function and every other function that switches on Plan. Restraint matters: with three stable plans a switch is fine. The smell appears when variants keep arriving, which is what a Change Storm will test.",
  },

  // ---- Observer --------------------------------------------------------
  {
    id: "bt-mcq-ob-intent",
    kind: "mcq",
    topic: "L5.observer",
    level: 1,
    prompt: "What does the Observer pattern provide?",
    options: [
      "A one-to-many dependency: when the subject changes, every registered observer is notified, and the subject does not need to know their concrete types",
      "A way to undo the last change to an object",
      "A single access point to a complicated subsystem",
      "A way to walk a collection without exposing how it is stored",
    ],
    answer: [0],
    explain: "Observer decouples the thing that changes from the things that care. Undo is Command or Memento, the single entry point is Facade, walking a collection is Iterator.",
  },
  {
    id: "bt-pat-ob-dashboard",
    kind: "pattern",
    topic: "L5.observer",
    level: 1,
    prompt: "A stock ticker must refresh a chart, a table and an alert badge whenever the price changes, and new widgets get added all the time without touching the ticker. Which Patternling fits?",
    options: ["Watchowl (Observer)", "Swapaw (Strategy)", "Stepede (Iterator)", "Scrollhound (Command)"],
    answer: [0],
    explain: "A publisher with an open set of subscribers is Observer. The ticker only knows the observer interface.",
  },
  {
    id: "bt-pred-ob-weak",
    kind: "predict",
    topic: "L5.observer",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct Observer {
  virtual ~Observer() = default;
  virtual void onEvent(int value) = 0;
};

class Printer : public Observer {
 public:
  explicit Printer(std::string name) : name_(std::move(name)) {}
  void onEvent(int value) override { std::cout << name_ << ':' << value << "\\n"; }

 private:
  std::string name_;
};

class Subject {
 public:
  void attach(const std::shared_ptr<Observer>& o) { observers_.push_back(o); }
  void notify(int value) {
    for (const auto& w : observers_) {
      if (auto o = w.lock()) o->onEvent(value);
    }
  }

 private:
  std::vector<std::weak_ptr<Observer>> observers_;
};

int main() {
  Subject s;
  auto a = std::make_shared<Printer>("A");
  auto c = std::make_shared<Printer>("C");
  {
    auto b = std::make_shared<Printer>("B");
    s.attach(a);
    s.attach(b);
    s.attach(c);
  }
  s.notify(7);
}
`,
    output: "A:7\nC:7",
    options: ["A:7\nC:7", "A:7\nB:7\nC:7", "C:7", "undefined behaviour"],
    answer: [0],
    explain: "The subject holds weak_ptr, so it does not keep B alive. B dies at the end of its block, lock() returns empty, and the subject skips it safely. With raw pointers this would be a dangling call. The expired slot still sits in the vector; a real subject would also prune it.",
  },
  {
    id: "bt-mcq-ob-reentrancy",
    kind: "mcq",
    topic: "L5.observer",
    level: 3,
    prompt: "During notify(), one observer calls subject.detach(self) on the vector being iterated. What is the robust design?",
    options: [
      "Iterate over a copy of the observer list (or mark removals and apply them after the loop), so callbacks may attach or detach safely",
      "Make every observer lock the subject's mutex during the callback",
      "Forbid detach and rely on destructors",
      "Use a larger vector so reallocation never happens",
    ],
    answer: [0],
    explain: "Erasing from a container while a range-for is walking it invalidates iterators. Snapshotting or deferring removal is the standard fix. A mutex does not help single-threaded re-entrancy and invites deadlock in the threaded case.",
  },
  {
    id: "bt-smell-ob-lapsed",
    kind: "smell",
    topic: "L5.observer",
    level: 3,
    prompt: "Name the smell and the principle it strains.",
    code: `class Subject {
 public:
  void attach(Observer* o) { observers_.push_back(o); }
  void notify() {
    for (Observer* o : observers_) o->onChange();   // observers may already be destroyed
  }
 private:
  std::vector<Observer*> observers_;
};`,
    options: [
      "The subject keeps raw pointers with no ownership or lifetime rule, so a destroyed observer is called (a dangling pointer); the contract needs weak_ptr or explicit detach in the observer's destructor (RAII)",
      "The subject has too many responsibilities; Single Responsibility",
      "The subject depends on a concrete observer class; Dependency Inversion",
      "The notify loop should be a switch; Open/Closed",
    ],
    answer: [0],
    explain: "The classic Observer bug is the lapsed listener: the pointer outlives the object. Fix it with weak_ptr, or an RAII subscription handle that detaches on destruction.",
  },

  // ---- Command ---------------------------------------------------------
  {
    id: "bt-mcq-cm-intent",
    kind: "mcq",
    topic: "L5.command",
    level: 1,
    prompt: "What does the Command pattern do?",
    options: [
      "Turns a request into an object, so it can be queued, logged, passed around and (if it stores enough information) undone",
      "Lets many objects share one copy of common data",
      "Chooses a hashing algorithm at runtime",
      "Defines a family of related products that must match",
    ],
    answer: [0],
    explain: "A command packages the receiver and the arguments of an action. That is what makes undo/redo, macros, job queues and audit logs straightforward.",
  },
  {
    id: "bt-pat-cm-editor",
    kind: "pattern",
    topic: "L5.command",
    level: 1,
    prompt: "A text editor needs undo and redo for typing, deleting and formatting, and macros that replay a recorded sequence. Which Patternling fits?",
    options: ["Scrollhound (Command)", "Watchowl (Observer)", "Chamelyn (State)", "Stepede (Iterator)"],
    answer: [0],
    explain: "Each edit becomes an object with execute() and undo(); a history stack of them gives undo and redo. Memento could snapshot the whole document instead, a trade-off between memory and simplicity.",
  },
  {
    id: "bt-pred-cm-undo",
    kind: "predict",
    topic: "L5.command",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <vector>

struct Counter { int value = 0; };

struct Command {
  virtual ~Command() = default;
  virtual void execute() = 0;
  virtual void undo() = 0;
};

class Add : public Command {
 public:
  Add(Counter& c, int n) : c_(c), n_(n) {}
  void execute() override { c_.value += n_; }
  void undo() override { c_.value -= n_; }

 private:
  Counter& c_;
  int n_;
};

class History {
 public:
  void run(std::unique_ptr<Command> cmd) {
    cmd->execute();
    done_.push_back(std::move(cmd));
  }
  void undo() {
    if (done_.empty()) return;
    done_.back()->undo();
    done_.pop_back();
  }

 private:
  std::vector<std::unique_ptr<Command>> done_;
};

int main() {
  Counter c;
  History h;
  h.run(std::make_unique<Add>(c, 5));
  h.run(std::make_unique<Add>(c, 3));
  h.undo();
  h.run(std::make_unique<Add>(c, 10));
  h.undo();
  h.undo();
  h.undo();
  std::cout << c.value << "\\n";
}
`,
    output: "0",
    options: ["0", "5", "8", "-8"],
    answer: [0],
    explain: "The history is a stack. After the sequence only Add(5) remains, then the extra undos remove it, and the final undo on an empty stack does nothing. The guard in undo() matters: without it the third undo would be undefined behaviour. Note that redo needs a second stack that is cleared whenever a new command runs.",
  },
  {
    id: "bt-mcq-cm-undo-state",
    kind: "mcq",
    topic: "L5.command",
    level: 3,
    prompt: "Undoing a command 'delete line 4' only works if the command stored something at execute time. What?",
    options: [
      "The removed text and its position, captured before the deletion, so undo() can re-insert it exactly",
      "Nothing: undo can recompute the line from the current document",
      "A pointer to the Document, which is enough",
      "Only the command's name for the history list",
    ],
    answer: [0],
    explain: "Undo needs the information that the action destroyed. Capture it inside execute(), not in the constructor, because the document may have changed between creation and execution.",
  },
  {
    id: "bt-smell-cm-callbacks",
    kind: "smell",
    topic: "L5.command",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `void onMenuClick(int itemId) {
  if (itemId == 1) doc.save();
  else if (itemId == 2) doc.print();
  else if (itemId == 3) doc.exportPdf();
  // every new menu item edits this function, and there is no way to queue, log or undo one
}`,
    options: [
      "A conditional chain that mixes the invoker with every action; Open/Closed (each action should be a Command the menu just runs)",
      "A getter exposes internal data; Encapsulation",
      "An object is created inside the class that uses it; Dependency Inversion",
      "A base class has a method no subclass can use; Interface Segregation",
    ],
    answer: [0],
    explain: "With a command per menu item the menu only stores and runs them. Adding an item, recording a macro or undoing becomes possible without editing the menu code.",
  },

  // ---- State -----------------------------------------------------------
  {
    id: "bt-mcq-sa-intent",
    kind: "mcq",
    topic: "L5.state",
    level: 1,
    prompt: "What is the intent of the State pattern?",
    options: [
      "Let an object alter its behaviour when its internal state changes, by delegating to a separate object for each state instead of branching on a flag",
      "Let the client choose an algorithm from outside",
      "Record a snapshot of an object so it can be restored",
      "Create objects without naming their concrete classes",
    ],
    answer: [0],
    explain: "State moves the 'what do I do now?' branching into one class per state. Strategy is chosen by the client; in State the transitions usually come from inside.",
  },
  {
    id: "bt-pat-sa-vending",
    kind: "pattern",
    topic: "L5.state",
    level: 1,
    prompt: "A vending machine reacts to 'insert coin', 'select item' and 'refund' differently depending on whether it is idle, has money, or is dispensing. Which Patternling fits?",
    options: ["Chamelyn (State)", "Swapaw (Strategy)", "Stencilmoth (Template Method)", "Scrollhound (Command)"],
    answer: [0],
    explain: "The same events mean different things in different phases and each phase decides the next one: State. A pile of if (hasMoney && !dispensing) flags is the smell it replaces.",
  },
  {
    id: "bt-pred-sa-turnstile",
    kind: "predict",
    topic: "L5.state",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>

class Turnstile;

struct State {
  virtual ~State() = default;
  virtual const char* coin(Turnstile& t) = 0;
  virtual const char* push(Turnstile& t) = 0;
};

class Turnstile {
 public:
  Turnstile();
  const char* coin() { return state_->coin(*this); }
  const char* push() { return state_->push(*this); }
  void lock() { state_ = &locked_; }
  void unlock() { state_ = &open_; }

 private:
  struct Locked : State {
    const char* coin(Turnstile& t) override { t.unlock(); return "unlocked"; }
    const char* push(Turnstile&) override { return "blocked"; }
  };
  struct Open : State {
    const char* coin(Turnstile&) override { return "thanks"; }
    const char* push(Turnstile& t) override { t.lock(); return "passed"; }
  };
  Locked locked_;
  Open open_;
  State* state_;
};

Turnstile::Turnstile() : state_(&locked_) {}

int main() {
  Turnstile t;
  std::cout << t.push() << ' ' << t.coin() << ' ' << t.coin() << ' ' << t.push() << ' ' << t.push() << "\\n";
}
`,
    output: "blocked unlocked thanks passed blocked",
    options: [
      "blocked unlocked thanks passed blocked",
      "blocked unlocked unlocked passed blocked",
      "passed unlocked thanks passed blocked",
      "blocked unlocked thanks blocked blocked",
    ],
    answer: [0],
    explain: "Locked: push is blocked, coin unlocks. Open: a second coin only says thanks, push passes and relocks. The next push is blocked again. Each rule lives in one class, and the transitions are explicit calls to lock() and unlock(). (The unspecified evaluation order of << chained calls is fine here since C++17 sequences them left to right.)",
  },
  {
    id: "bt-mcq-sa-vs-strategy",
    kind: "mcq",
    topic: "L5.state",
    level: 2,
    prompt: "State and Strategy have nearly identical class diagrams. What really separates them?",
    options: [
      "Intent and who changes the object: in State the states know about each other and drive transitions; in Strategy the client picks an algorithm and the strategies do not know each other",
      "State uses inheritance and Strategy never does",
      "Strategy objects must be stateless and State objects must be singletons",
      "There is no difference; they are two names for one pattern",
    ],
    answer: [0],
    explain: "Same shape, different story. If the object moves itself through phases, think State. If a caller selects how something is done, think Strategy. Interviewers like this question because the diagrams look the same.",
  },
  {
    id: "bt-smell-sa-flags",
    kind: "smell",
    topic: "L5.state",
    level: 3,
    prompt: "Name the smell and the principle it strains.",
    code: `class Order {
 public:
  void cancel() {
    if (paid_ && !shipped_ && !delivered_) refund();
    else if (!paid_ && !shipped_) discardCart();
    else if (shipped_ && !delivered_) startReturn();
    // delivered_: silently ignored
  }
 private:
  bool paid_ = false, shipped_ = false, delivered_ = false;
};`,
    options: [
      "Boolean flags encode an implicit state machine, so every method repeats the combinations and illegal combinations are representable; replace with explicit states (Open/Closed, and make illegal states unrepresentable)",
      "A constructor does real work; Single Responsibility",
      "A mutable global is shared; hidden dependency",
      "A deep inheritance tree; composition over inheritance",
    ],
    answer: [0],
    explain: "Three booleans allow eight combinations but only four are legal. An explicit State (or an enum plus a transition table for small machines) names the legal ones and makes each method one line per state.",
  },

  // ---- Template Method -------------------------------------------------
  {
    id: "bt-mcq-tm-intent",
    kind: "mcq",
    topic: "L5.template-method",
    level: 1,
    prompt: "What is the Template Method pattern?",
    options: [
      "A base class fixes the order of an algorithm's steps in a non-virtual method and lets subclasses override selected steps",
      "A class template parameterised on a type",
      "A way to copy an object without knowing its class",
      "An object that records every call made to another object",
    ],
    answer: [0],
    explain: "The word 'template' here has nothing to do with C++ templates. The base owns the invariant sequence (the 'Hollywood principle': don't call us, we'll call you) and the subclasses supply the variable steps.",
  },
  {
    id: "bt-pat-tm-report",
    kind: "pattern",
    topic: "L5.template-method",
    level: 1,
    prompt: "Every report exporter must open a file, write a header, write rows, write a footer, then close the file in that exact order. Only the row format differs (CSV vs JSON). Which Patternling fits?",
    options: ["Stencilmoth (Template Method)", "Chamelyn (State)", "Watchowl (Observer)", "Swapaw (Strategy)"],
    answer: [0],
    explain: "A fixed skeleton with a few varying steps: Template Method. If the whole algorithm were swappable at runtime, or you wanted to avoid inheritance, Strategy would be the alternative.",
  },
  {
    id: "bt-pred-tm-order",
    kind: "predict",
    topic: "L5.template-method",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>

class Beverage {
 public:
  virtual ~Beverage() = default;
  void prepare() const {
    boil();
    brew();
    pour();
    if (wantsCondiments()) addCondiments();
  }

 protected:
  virtual void brew() const = 0;
  virtual void addCondiments() const = 0;
  virtual bool wantsCondiments() const { return true; }

 private:
  void boil() const { std::cout << "boil "; }
  void pour() const { std::cout << "pour "; }
};

class Tea : public Beverage {
 protected:
  void brew() const override { std::cout << "steep "; }
  void addCondiments() const override { std::cout << "lemon "; }
};

class Espresso : public Beverage {
 protected:
  void brew() const override { std::cout << "press "; }
  void addCondiments() const override { std::cout << "sugar "; }
  bool wantsCondiments() const override { return false; }
};

int main() {
  std::unique_ptr<Beverage> a = std::make_unique<Tea>();
  std::unique_ptr<Beverage> b = std::make_unique<Espresso>();
  a->prepare();
  std::cout << "| ";
  b->prepare();
  std::cout << "\\n";
}
`,
    output: "boil steep pour lemon | boil press pour",
    options: [
      "boil steep pour lemon | boil press pour",
      "steep boil pour lemon | press boil pour",
      "boil steep pour lemon | boil press pour sugar",
      "boil steep lemon pour | boil press sugar pour",
    ],
    answer: [0],
    explain: "prepare() is public and non-virtual, so no subclass can reorder the steps. Espresso overrides the hook wantsCondiments() to skip the last step. This is the NVI (non-virtual interface) idiom: the public interface is fixed, the customisation points are protected virtuals.",
  },
  {
    id: "bt-mcq-tm-vs-strategy",
    kind: "mcq",
    topic: "L5.template-method",
    level: 3,
    prompt: "When would you prefer Strategy over Template Method?",
    options: [
      "When the variation should be chosen or swapped at runtime, combined freely, or tested without a subclass; inheritance fixes the choice at compile time and couples you to the base class",
      "Never; Template Method is strictly better because it is simpler",
      "Only when the language lacks virtual functions",
      "Only when there are exactly two variants",
    ],
    answer: [0],
    explain: "Template Method uses inheritance, a heavy and static tool. Prefer composition (Strategy) when behaviours need to be mixed, swapped or injected. Template Method still wins when the sequence is a real invariant and the variation points are few and tied together.",
  },
  {
    id: "bt-smell-tm-copy",
    kind: "smell",
    topic: "L5.template-method",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `void CsvExporter::run() { open(); writeCsvHeader(); for (auto& r : rows) writeCsvRow(r); close(); }
void JsonExporter::run() { open(); writeJsonHeader(); for (auto& r : rows) writeJsonRow(r); close(); }
void XmlExporter::run() { open(); writeXmlHeader(); for (auto& r : rows) writeXmlRow(r); close(); }`,
    options: [
      "The same skeleton is copied into each class, so a fix to the sequence must be made three times; DRY (hoist the sequence into a Template Method)",
      "A class returns a different type than its base promises; Liskov Substitution",
      "A class exposes too much; Interface Segregation",
      "A constructor is private; Singleton",
    ],
    answer: [0],
    explain: "Duplicated control flow is the signal. Move open/header/rows/footer/close into one base method and leave only the format-specific steps virtual.",
  },

  // ---- Iterator --------------------------------------------------------
  {
    id: "bt-mcq-it-intent",
    kind: "mcq",
    topic: "L5.iterator",
    level: 1,
    prompt: "What does the Iterator pattern give you?",
    options: [
      "A uniform way to visit the elements of a collection in sequence without exposing how it is stored",
      "A way to notify observers when a collection changes",
      "A copy of the collection that can be restored later",
      "A way to share one element among many owners",
    ],
    answer: [0],
    explain: "The client writes one loop that works for arrays, lists, trees and generated sequences. In C++ the standard library is built around this idea.",
  },
  {
    id: "bt-pat-it-tree",
    kind: "pattern",
    topic: "L5.iterator",
    level: 1,
    prompt: "You store employees in a tree but callers just want to write `for (const auto& e : org)` in sorted order. Which Patternling fits?",
    options: ["Stepede (Iterator)", "Swapaw (Strategy)", "Chamelyn (State)", "Watchowl (Observer)"],
    answer: [0],
    explain: "Hiding the traversal behind begin() and end() is Iterator. The caller never learns that there is a tree inside.",
  },
  {
    id: "bt-pred-it-range",
    kind: "predict",
    topic: "L5.iterator",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>

class Countdown {
 public:
  explicit Countdown(int from) : from_(from) {}

  class Iterator {
   public:
    explicit Iterator(int v) : v_(v) {}
    int operator*() const { return v_; }
    Iterator& operator++() { v_ -= 2; return *this; }
    bool operator!=(const Iterator& o) const { return v_ > o.v_; }

   private:
    int v_;
  };

  Iterator begin() const { return Iterator(from_); }
  Iterator end() const { return Iterator(0); }

 private:
  int from_;
};

int main() {
  for (int x : Countdown(7)) std::cout << x << ' ';
  std::cout << "\\n";
}
`,
    output: "7 5 3 1",
    options: ["7 5 3 1", "7 5 3 1 -1", "6 4 2", "7 6 5 4 3 2 1"],
    answer: [0],
    explain: "Range-for needs begin(), end() and an iterator with operator*, prefix ++ and !=. Here != means 'still above the end value', so the walk stops once v_ reaches 0 or below; 7, 5, 3, 1 are printed and -1 is not. Overloading != with non-symmetric meaning is a trick for sentinels, but a proper end sentinel type is clearer.",
  },
  {
    id: "bt-mcq-it-invalidation",
    kind: "mcq",
    topic: "L5.iterator",
    level: 2,
    prompt: "A loop does `for (auto it = v.begin(); it != v.end(); ++it) { if (*it == 0) v.push_back(1); }` on a std::vector. What is wrong?",
    options: [
      "push_back may reallocate and invalidate every iterator, so using `it` afterwards is undefined behaviour",
      "Nothing; iterators always stay valid",
      "It is fine only because vector is contiguous",
      "The loop is just slow, but correct",
    ],
    answer: [0],
    explain: "Iterator validity is part of each container's contract. Modify the structure only by index, collect changes and apply them after the loop, or choose a container with stable iterators (std::list).",
  },
  {
    id: "bt-smell-it-expose",
    kind: "smell",
    topic: "L5.iterator",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `class Playlist {
 public:
  std::vector<Song>& songs() { return songs_; }   // callers index and mutate it directly
 private:
  std::vector<Song> songs_;
};

// elsewhere
for (size_t i = 0; i < pl.songs().size(); ++i) play(pl.songs()[i]);`,
    options: [
      "The internal container is exposed, so every caller depends on how songs are stored and can break the invariants; encapsulation (offer begin()/end() or a visit function instead)",
      "A class has a virtual destructor but no virtual methods; unnecessary polymorphism",
      "A function takes too many parameters; long parameter list",
      "A switch on type; Open/Closed",
    ],
    answer: [0],
    explain: "A mutable reference to the vector lets callers add, sort or erase behind the playlist's back, and switching to a list or tree later breaks them all. Const iteration over a narrow view preserves both freedom and invariants.",
  },
];

/** The full deck; part 2 (C7a2) will add its cards to this list. */
export const BEHAVIOURAL_THEATRE_DECK: Card[] = [...BEHAVIOURAL_THEATRE_PART1];
