import type { Card } from "@/lib/battle/cards";

/**
 * Behavioural Theatre concept deck, part 2 (CURRICULUM L5). Original wording. Predict cards are compiled and
 * run natively by content:verify. Patternling names reserved for C7d: Relayrat (Chain of Responsibility),
 * Hubhen (Mediator), Snapsnail (Memento), Visitrix (Visitor), Glyphpup (Interpreter), Nullnewt (Null Object),
 * Sieveling (Specification).
 */
export const BEHAVIOURAL_THEATRE_PART2: Card[] = [
  // ---- Chain of Responsibility -----------------------------------------
  {
    id: "bt-mcq-cor-intent",
    kind: "mcq",
    topic: "L5.chain-of-responsibility",
    level: 1,
    prompt: "What does Chain of Responsibility give you?",
    options: [
      "A sender that does not know which handler will deal with a request; handlers are linked and each either handles it or passes it on",
      "One object that knows every handler and routes each request to the right one",
      "A way to undo the last request",
      "A guarantee that every handler in the list processes every request",
    ],
    answer: [0],
    explain: "The sender hands the request to the head of the chain and is decoupled from who answers. Option 2 describes a registry or Mediator. A request may also fall off the end unhandled, so decide what that means up front.",
  },
  {
    id: "bt-pat-cor-support",
    kind: "pattern",
    topic: "L5.chain-of-responsibility",
    level: 1,
    prompt: "A support ticket goes to a bot, then a tier-1 agent, then a specialist, each of which may resolve it or escalate. Which Patternling fits?",
    options: ["Relayrat (Chain of Responsibility)", "Hubhen (Mediator)", "Swapaw (Strategy)", "Snapsnail (Memento)"],
    answer: [0],
    explain: "A request travels a sequence of candidate handlers and stops at the first that takes it. A Strategy would pick one algorithm up front; a Mediator would route everything through a central object that knows all parties.",
  },
  {
    id: "bt-pred-cor-limits",
    kind: "predict",
    topic: "L5.chain-of-responsibility",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>

class Approver {
 public:
  explicit Approver(int limit) : limit_(limit) {}
  virtual ~Approver() = default;
  Approver* then(std::unique_ptr<Approver> next) {
    next_ = std::move(next);
    return next_.get();
  }
  void approve(int amount) const {
    if (amount <= limit_) {
      std::cout << name() << " approves " << amount << "\\n";
    } else if (next_) {
      next_->approve(amount);
    } else {
      std::cout << "nobody approves " << amount << "\\n";
    }
  }

 protected:
  virtual const char* name() const = 0;

 private:
  int limit_;
  std::unique_ptr<Approver> next_;
};

struct Lead : Approver {
  Lead() : Approver(100) {}
  const char* name() const override { return "lead"; }
};
struct Director : Approver {
  Director() : Approver(1000) {}
  const char* name() const override { return "director"; }
};

int main() {
  Lead head;
  head.then(std::make_unique<Director>());
  head.approve(80);
  head.approve(100);
  head.approve(101);
  head.approve(5000);
}
`,
    output: "lead approves 80\nlead approves 100\ndirector approves 101\nnobody approves 5000",
    options: [
      "lead approves 80\nlead approves 100\ndirector approves 101\nnobody approves 5000",
      "lead approves 80\ndirector approves 100\ndirector approves 101\nnobody approves 5000",
      "lead approves 80\nlead approves 100\ndirector approves 101\ndirector approves 5000",
      "lead approves 80\nlead approves 100\nlead approves 101\nnobody approves 5000",
    ],
    answer: [0],
    explain: "The limit check is inclusive, so 100 stays with the lead and 101 moves on. 5000 passes the director's limit too and falls off the end; the chain prints a fallback instead of silently dropping it. Each link owns the next with unique_ptr, so the whole chain is freed from the head.",
  },
  {
    id: "bt-mcq-cor-fallthrough",
    kind: "mcq",
    topic: "L5.chain-of-responsibility",
    level: 2,
    prompt: "A middleware chain checks authentication, then rate limits, then logs. A handler forgets to call the next one. What happens?",
    options: [
      "The request silently stops there; the downstream handlers never see it, so you need tests or a framework that makes forwarding explicit",
      "The compiler reports an error",
      "The next handler is called automatically",
      "The request is retried from the head of the chain",
    ],
    answer: [0],
    explain: "Forwarding is a convention, not a language rule. Guard it with a base class that does the forwarding and calls a virtual hook, or with tests that push a request through the whole chain and check the end result.",
  },
  {
    id: "bt-smell-cor-ladder",
    kind: "smell",
    topic: "L5.chain-of-responsibility",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `void Logger::log(Level lv, const std::string& m) {
  if (lv >= Level::Error && !pagerDisabled_) pager_.send(m);
  if (lv >= Level::Warn) file_.write(m);
  if (lv >= Level::Info && consoleOn_) console_.print(m);
  // every new sink or rule edits this function
}`,
    options: [
      "One function hard-codes every sink and rule, so adding a sink means editing it; Open/Closed (use a chain or a list of sinks that each decide)",
      "Too many parameters",
      "A virtual destructor is missing",
      "A getter exposes internal state; encapsulation",
    ],
    answer: [0],
    explain: "A list of sink objects, each with its own level filter, or a chain of handlers, lets a new sink be added without touching the logger. The cost is a little indirection, which is worth it once you have a third rule.",
  },

  // ---- Mediator ---------------------------------------------------------
  {
    id: "bt-mcq-med-intent",
    kind: "mcq",
    topic: "L5.mediator",
    level: 1,
    prompt: "What problem does Mediator solve?",
    options: [
      "Many peers talking directly to each other become tangled; a central object owns the interaction so peers only know the mediator",
      "A request needs several handlers in order",
      "A subject must notify an open-ended list of listeners",
      "An object must be restored to an earlier state",
    ],
    answer: [0],
    explain: "N peers with direct links need up to N(N-1)/2 connections. With a mediator each peer has one. Observer is one-to-many broadcast with no coordination logic; a mediator holds the coordination rules.",
  },
  {
    id: "bt-pat-med-tower",
    kind: "pattern",
    topic: "L5.mediator",
    level: 1,
    prompt: "In a chat room, users never reference each other. They send to the room, and the room decides who receives it, applies mutes and enforces rate limits. Which Patternling fits?",
    options: ["Hubhen (Mediator)", "Relayrat (Chain of Responsibility)", "Watchowl (Observer)", "Stepede (Iterator)"],
    answer: [0],
    explain: "The room holds the interaction rules and the participants only know the room. Observer would only broadcast; it would not own mute and rate-limit rules.",
  },
  {
    id: "bt-pred-med-room",
    kind: "predict",
    topic: "L5.mediator",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <string>
#include <vector>

class Room;

class User {
 public:
  User(std::string name, Room& room);
  void say(const std::string& text);
  void hear(const std::string& from, const std::string& text) const {
    std::cout << name_ << " hears " << from << ": " << text << "\\n";
  }
  const std::string& name() const { return name_; }

 private:
  std::string name_;
  Room& room_;
};

class Room {
 public:
  void join(User* u) { users_.push_back(u); }
  void broadcast(const User& from, const std::string& text) const {
    for (const User* u : users_) {
      if (u != &from) u->hear(from.name(), text);
    }
  }

 private:
  std::vector<User*> users_;
};

User::User(std::string name, Room& room) : name_(std::move(name)), room_(room) { room_.join(this); }
void User::say(const std::string& text) { room_.broadcast(*this, text); }

int main() {
  Room room;
  User ann("ann", room), bob("bob", room), cy("cy", room);
  ann.say("hi");
  bob.say("yo");
}
`,
    output: "bob hears ann: hi\ncy hears ann: hi\nann hears bob: yo\ncy hears bob: yo",
    options: [
      "bob hears ann: hi\ncy hears ann: hi\nann hears bob: yo\ncy hears bob: yo",
      "ann hears ann: hi\nbob hears ann: hi\ncy hears ann: hi\nann hears bob: yo\nbob hears bob: yo\ncy hears bob: yo",
      "bob hears ann: hi\ncy hears ann: hi",
      "cy hears ann: hi\nbob hears ann: hi\ncy hears bob: yo\nann hears bob: yo",
    ],
    answer: [0],
    explain: "Users only hold a Room reference; the Room iterates in join order and skips the sender. Users are built in the order ann, bob, cy, so that is the delivery order. Note the lifetime rule: the room keeps raw pointers, so users must outlive it or leave first.",
  },
  {
    id: "bt-mcq-med-god",
    kind: "mcq",
    topic: "L5.mediator",
    level: 3,
    prompt: "A mediator keeps growing: it now knows every widget's internals and has 2,000 lines. What is the usual cost of Mediator done carelessly?",
    options: [
      "The mediator becomes a god object that centralises all the coupling instead of removing it",
      "It makes peers slower to construct",
      "It forces inheritance between peers",
      "It cannot be unit tested",
    ],
    answer: [0],
    explain: "Mediator moves coupling into one place. If that place knows too much it is a god class. Keep the mediator to coordination rules over narrow peer interfaces, and split it per workflow once it sprawls.",
  },
  {
    id: "bt-smell-med-mesh",
    kind: "smell",
    topic: "L5.mediator",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `class Dropdown { Textbox* tb; Button* ok; Checkbox* cb;   /* ... */ };
class Textbox  { Dropdown* dd; Button* ok; Checkbox* cb;   /* ... */ };
class Button   { Dropdown* dd; Textbox* tb; Checkbox* cb;  /* ... */ };
class Checkbox { Dropdown* dd; Textbox* tb; Button* ok;    /* ... */ };`,
    options: [
      "Every widget references every other, so none can be reused or tested alone; high coupling (introduce a mediator or dialog that owns the interaction)",
      "A class has too many virtual functions",
      "A switch on type; Open/Closed",
      "Pointers where references would do; const-correctness",
    ],
    answer: [0],
    explain: "Reuse one widget and you drag all the others with it. A form object that wires them together gives each widget a single dependency and makes the interaction rules visible in one place.",
  },

  // ---- Memento ----------------------------------------------------------
  {
    id: "bt-mcq-mem-intent",
    kind: "mcq",
    topic: "L5.memento",
    level: 1,
    prompt: "What is Memento for?",
    options: [
      "Capturing an object's state in an opaque snapshot so it can be restored later, without exposing its internals",
      "Notifying listeners when an object changes",
      "Encapsulating a request as an object",
      "Sharing common state between many objects",
    ],
    answer: [0],
    explain: "The originator creates and consumes the snapshot; a caretaker only stores it. Command-based undo records the operation and its inverse instead; Memento records the state.",
  },
  {
    id: "bt-pat-mem-editor",
    kind: "pattern",
    topic: "L5.memento",
    level: 1,
    prompt: "A drawing canvas lets users press Ctrl+Z to return to an earlier arrangement, and the history holder must not read or edit the canvas's private fields. Which Patternling fits?",
    options: ["Snapsnail (Memento)", "Scrollhound (Command)", "Chamelyn (State)", "Hubhen (Mediator)"],
    answer: [0],
    explain: "A snapshot the caretaker cannot open: Memento. Command undo would also work but needs a reliable inverse per action; when the inverse is awkward, snapshots are the simpler tool.",
  },
  {
    id: "bt-pred-mem-undo",
    kind: "predict",
    topic: "L5.memento",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <string>
#include <vector>

class Editor {
 public:
  class Snapshot {
   public:
    Snapshot(const Snapshot&) = default;

   private:
    friend class Editor;
    explicit Snapshot(std::string t) : text_(std::move(t)) {}
    std::string text_;
  };

  void type(const std::string& s) { text_ += s; }
  Snapshot save() const { return Snapshot(text_); }
  void restore(const Snapshot& s) { text_ = s.text_; }
  const std::string& text() const { return text_; }

 private:
  std::string text_;
};

int main() {
  Editor e;
  std::vector<Editor::Snapshot> history;
  e.type("ab");
  history.push_back(e.save());
  e.type("cd");
  history.push_back(e.save());
  e.type("ef");
  std::cout << e.text() << "\\n";
  e.restore(history.back());
  std::cout << e.text() << "\\n";
  history.pop_back();
  e.restore(history.back());
  std::cout << e.text() << "\\n";
}
`,
    output: "abcdef\nabcd\nab",
    options: ["abcdef\nabcd\nab", "abcdef\nabcdef\nab", "abcdef\nabcd\nabcd", "abcdef\nab\nabcd"],
    answer: [0],
    explain: "Snapshots are taken after 'ab' and after 'abcd'. The 'ef' typed later is not in either, so the first restore returns to 'abcd'. After popping the newest snapshot, the next restore returns to 'ab'. Snapshot's constructor is private, so only Editor can create or read one.",
  },
  {
    id: "bt-mcq-mem-cost",
    kind: "mcq",
    topic: "L5.memento",
    level: 3,
    prompt: "Undo history stores a full copy of a 50 MB document per keystroke. What is the main trade-off to weigh?",
    options: [
      "Snapshots are simple and exact but cost memory and time per save; store diffs, share structure, or cap the history if the state is large",
      "Snapshots are always cheaper than commands",
      "Memento cannot be used with value types",
      "There is no trade-off if the caretaker is const",
    ],
    answer: [0],
    explain: "Full copies cost O(state size) per step. Persistent data structures, delta snapshots or command-based undo cut that cost, at the price of more machinery. Decide from state size and undo depth.",
  },
  {
    id: "bt-smell-mem-friend",
    kind: "smell",
    topic: "L5.memento",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `struct UndoStack {
  std::vector<std::pair<Document*, std::string>> saved;
  void push(Document* d) { saved.push_back({d, d->body}); }     // reads the public field
  void pop()            { saved.back().first->body = saved.back().second; saved.pop_back(); }
};`,
    options: [
      "The undo code reaches into the document's fields, so any change to Document's representation breaks it; encapsulation (let Document create and restore its own snapshot)",
      "A destructor is not virtual",
      "A function has too many parameters",
      "A static member is mutable; global state",
    ],
    answer: [0],
    explain: "With a Memento the document owns the format of its snapshot and the stack only stores opaque values. The same bug in the smell code also stores a raw Document*, which dangles if the document is destroyed.",
  },

  // ---- Visitor ----------------------------------------------------------
  {
    id: "bt-mcq-vis-intent",
    kind: "mcq",
    topic: "L5.visitor",
    level: 1,
    prompt: "What does Visitor let you do?",
    options: [
      "Add new operations over a stable set of element types without editing those types, by dispatching on both the visitor and the element (double dispatch)",
      "Add new element types without touching any existing code",
      "Hide an algorithm behind one interface",
      "Let many objects share intrinsic state",
    ],
    answer: [0],
    explain: "Visitor makes new operations cheap and new element types expensive: every visitor must be updated for a new element. This is the expression problem, and choosing between virtual functions and Visitor means choosing which axis grows.",
  },
  {
    id: "bt-pat-vis-ast",
    kind: "pattern",
    topic: "L5.visitor",
    level: 2,
    prompt: "A compiler has a fixed set of AST node types but keeps gaining passes: type check, pretty print, constant fold, code generation. Which Patternling fits?",
    options: ["Visitrix (Visitor)", "Glyphpup (Interpreter)", "Swapaw (Strategy)", "Stencilmoth (Template Method)"],
    answer: [0],
    explain: "Stable node types and a growing set of operations is the Visitor sweet spot. If node types changed often instead, plain virtual methods on the nodes would be cheaper.",
  },
  {
    id: "bt-pred-vis-shapes",
    kind: "predict",
    topic: "L5.visitor",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <vector>

struct Circle;
struct Square;

struct Visitor {
  virtual ~Visitor() = default;
  virtual void visit(const Circle&) = 0;
  virtual void visit(const Square&) = 0;
};

struct Shape {
  virtual ~Shape() = default;
  virtual void accept(Visitor& v) const = 0;
};
struct Circle : Shape {
  int r = 2;
  void accept(Visitor& v) const override { v.visit(*this); }
};
struct Square : Shape {
  int side = 3;
  void accept(Visitor& v) const override { v.visit(*this); }
};

struct AreaSum : Visitor {
  int total = 0;
  void visit(const Circle& c) override { total += 3 * c.r * c.r; }
  void visit(const Square& s) override { total += s.side * s.side; }
};
struct Namer : Visitor {
  void visit(const Circle&) override { std::cout << "circle "; }
  void visit(const Square&) override { std::cout << "square "; }
};

int main() {
  std::vector<std::unique_ptr<Shape>> shapes;
  shapes.push_back(std::make_unique<Circle>());
  shapes.push_back(std::make_unique<Square>());
  shapes.push_back(std::make_unique<Circle>());
  AreaSum area;
  Namer namer;
  for (const auto& s : shapes) { s->accept(area); s->accept(namer); }
  std::cout << "\\n" << area.total << "\\n";
}
`,
    output: "circle square circle \n33",
    options: ["circle square circle \n33", "circle square circle \n21", "circle square circle \n24", "square circle square \n33"],
    answer: [0],
    explain: "Each circle contributes 3*2*2 = 12 and the square 3*3 = 9, giving 12 + 9 + 12 = 33. Two operations were added without editing Circle or Square; the two accept() calls pick the concrete type (first dispatch) and the overload on the visitor (second). Add a Triangle and both visitors must change.",
  },
  {
    id: "bt-mcq-vis-cost",
    kind: "mcq",
    topic: "L5.visitor",
    level: 3,
    prompt: "Which change is hardest with a classic Visitor design?",
    options: [
      "Adding a new element type, because every visitor interface and implementation needs a new overload",
      "Adding a new operation over existing elements",
      "Running two operations on the same tree",
      "Unit testing one operation in isolation",
    ],
    answer: [0],
    explain: "New element means touching the Visitor interface and all its implementations. In C++17, std::variant with std::visit offers the same shape with the compiler checking that every case is handled.",
  },
  {
    id: "bt-smell-vis-dyncast",
    kind: "smell",
    topic: "L5.visitor",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `double area(const Shape& s) {
  if (auto* c = dynamic_cast<const Circle*>(&s)) return 3.14 * c->r * c->r;
  if (auto* q = dynamic_cast<const Square*>(&s)) return q->side * q->side;
  return 0;     // silently wrong for any new shape
}`,
    options: [
      "A type ladder with a silent default: a new Shape compiles but returns 0; Open/Closed (use a virtual method, or Visitor/variant so the compiler flags the missing case)",
      "Too many parameters",
      "A constructor does heavy work",
      "A global variable is shared across threads",
    ],
    answer: [0],
    explain: "dynamic_cast ladders hide the missing case at runtime. Virtual dispatch moves the choice to the type; Visitor or std::variant with std::visit makes the compiler enforce completeness.",
  },

  // ---- Interpreter ------------------------------------------------------
  {
    id: "bt-mcq-int-intent",
    kind: "mcq",
    topic: "L5.interpreter",
    level: 1,
    prompt: "When is the Interpreter pattern a reasonable choice?",
    options: [
      "For a small, stable grammar, such as simple rules or expressions, where each grammar rule becomes a class that can evaluate itself",
      "For any large programming language",
      "To notify observers of changes",
      "To avoid writing a parser by never parsing input",
    ],
    answer: [0],
    explain: "Interpreter models a grammar as a tree of expression objects. It does not parse text itself, and it scales poorly to big grammars, where a proper parser generator and a compiled or bytecode form are better.",
  },
  {
    id: "bt-pat-int-rules",
    kind: "pattern",
    topic: "L5.interpreter",
    level: 2,
    prompt: "A pricing tool lets analysts write rules like `(qty > 10 AND tier == gold) OR coupon`. You build nodes for AND, OR and comparisons that each evaluate against a context. Which Patternling fits?",
    options: ["Glyphpup (Interpreter)", "Visitrix (Visitor)", "Hubhen (Mediator)", "Snapsnail (Memento)"],
    answer: [0],
    explain: "A small language whose sentences are trees of self-evaluating nodes is Interpreter, and Composite is the structure under it. A Visitor could add passes later, such as printing, without editing the nodes.",
  },
  {
    id: "bt-pred-int-expr",
    kind: "predict",
    topic: "L5.interpreter",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <utility>

struct Expr {
  virtual ~Expr() = default;
  virtual int eval() const = 0;
};
struct Num : Expr {
  explicit Num(int v) : v_(v) {}
  int eval() const override { return v_; }
  int v_;
};
struct Add : Expr {
  Add(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r) : l_(std::move(l)), r_(std::move(r)) {}
  int eval() const override { return l_->eval() + r_->eval(); }
  std::unique_ptr<Expr> l_, r_;
};
struct Mul : Expr {
  Mul(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r) : l_(std::move(l)), r_(std::move(r)) {}
  int eval() const override { return l_->eval() * r_->eval(); }
  std::unique_ptr<Expr> l_, r_;
};

int main() {
  // (2 + 3) * 4 + 1
  auto sum = std::make_unique<Add>(std::make_unique<Num>(2), std::make_unique<Num>(3));
  auto prod = std::make_unique<Mul>(std::move(sum), std::make_unique<Num>(4));
  Add whole(std::move(prod), std::make_unique<Num>(1));
  std::cout << whole.eval() << "\\n";
}
`,
    output: "21",
    options: ["21", "15", "14", "25"],
    answer: [0],
    explain: "The tree's shape carries the precedence: (2 + 3) = 5, times 4 = 20, plus 1 = 21. Evaluation is a recursive walk with no parsing involved. Ownership flows downward with unique_ptr, so the whole tree is released by destroying its root.",
  },
  {
    id: "bt-mcq-int-limit",
    kind: "mcq",
    topic: "L5.interpreter",
    level: 3,
    prompt: "Users now want loops, functions and imports in your rule language. What should you do?",
    options: [
      "Stop growing the node-class design; adopt a real parser and a compiled or bytecode representation, or embed an existing scripting language",
      "Add one class per new keyword indefinitely",
      "Make every node a singleton",
      "Move evaluation into the client",
    ],
    answer: [0],
    explain: "Class-per-rule is neat for a few rules and becomes a maintenance and speed problem as the grammar grows. State the switch point honestly in a design review: small and stable means Interpreter, otherwise buy or generate a language implementation.",
  },
  {
    id: "bt-smell-int-eval",
    kind: "smell",
    topic: "L5.interpreter",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `bool allowed(const std::string& rule, const Ctx& c) {
  // re-split and re-parse the same string on every request
  if (rule.find("AND") != std::string::npos) { /* split and recurse */ }
  if (rule.find("OR")  != std::string::npos) { /* split and recurse */ }
  if (rule.find(">")   != std::string::npos) { /* hand-rolled compare */ }
  return false;
}`,
    options: [
      "Rule text is parsed ad hoc on every call with string searches, which is slow and brittle; separate parsing from evaluation (parse once into a tree of nodes)",
      "A class is missing a virtual destructor",
      "A global singleton is used",
      "A method returns a reference to a local",
    ],
    answer: [0],
    explain: "Substring checks mis-handle precedence, nested brackets and values that contain the keywords. Parse once into an expression tree, validate it, and evaluate the tree on each request.",
  },

  // ---- Null Object ------------------------------------------------------
  {
    id: "bt-mcq-nul-intent",
    kind: "mcq",
    topic: "L5.null-object",
    level: 1,
    prompt: "What is the Null Object pattern?",
    options: [
      "A real implementation of an interface that does nothing (or a safe default), so callers do not need null checks",
      "A pointer that is set to nullptr after delete",
      "An exception thrown when a dependency is missing",
      "A singleton that holds all optional values",
    ],
    answer: [0],
    explain: "The caller treats it like any other implementation. Used well it removes scattered if (p) checks. Used badly it hides a missing dependency that should have been an error, so only use it when 'do nothing' really is the right behaviour.",
  },
  {
    id: "bt-pat-nul-logger",
    kind: "pattern",
    topic: "L5.null-object",
    level: 1,
    prompt: "Tests and benchmarks construct a service with a Logger that discards messages, so the service code never checks whether a logger exists. Which Patternling fits?",
    options: ["Nullnewt (Null Object)", "Hubhen (Mediator)", "Relayrat (Chain of Responsibility)", "Glyphpup (Interpreter)"],
    answer: [0],
    explain: "A do-nothing implementation of the same interface stands in for absence. In C++ you inject it through the constructor, usually as a reference or a unique_ptr to the interface.",
  },
  {
    id: "bt-pred-nul-audit",
    kind: "predict",
    topic: "L5.null-object",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <string>

struct Audit {
  virtual ~Audit() = default;
  virtual void record(const std::string& what) = 0;
};
struct ConsoleAudit : Audit {
  void record(const std::string& what) override { std::cout << "audit: " << what << "\\n"; }
};
struct NoAudit : Audit {
  void record(const std::string&) override {}
};

class Account {
 public:
  explicit Account(std::unique_ptr<Audit> audit) : audit_(std::move(audit)) {}
  void deposit(int amount) {
    balance_ += amount;
    audit_->record("deposit " + std::to_string(amount));
  }
  int balance() const { return balance_; }

 private:
  std::unique_ptr<Audit> audit_;
  int balance_ = 0;
};

int main() {
  Account quiet(std::make_unique<NoAudit>());
  Account loud(std::make_unique<ConsoleAudit>());
  quiet.deposit(5);
  loud.deposit(7);
  quiet.deposit(1);
  std::cout << quiet.balance() << " " << loud.balance() << "\\n";
}
`,
    output: "audit: deposit 7\n6 7",
    options: ["audit: deposit 7\n6 7", "audit: deposit 5\naudit: deposit 7\naudit: deposit 1\n6 7", "audit: deposit 7\n5 7", "6 7"],
    answer: [0],
    explain: "Both accounts call audit_->record() unconditionally. The NoAudit object swallows the calls and the ConsoleAudit prints once. No branch in Account checks for a missing auditor, which is the benefit. The balances are 5 + 1 = 6 and 7.",
  },
  {
    id: "bt-mcq-nul-danger",
    kind: "mcq",
    topic: "L5.null-object",
    level: 3,
    prompt: "A PaymentGateway has a NullGateway whose charge() returns success without charging. A config mistake wires it into production. What went wrong with the design?",
    options: [
      "A silent success default is not harmless: absence of a payment dependency should fail loudly, so Null Object suits optional side effects (logging, metrics), not essential operations",
      "Null Object should always return failure",
      "The gateway should be a singleton",
      "Nothing; that is the intended use",
    ],
    answer: [0],
    explain: "Null Object is for behaviour where doing nothing is correct. For essential collaborators, make absence an error at construction time (throw or refuse to start) or use std::optional and force the caller to handle it.",
  },
  {
    id: "bt-smell-nul-checks",
    kind: "smell",
    topic: "L5.null-object",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `void Service::run() {
  if (metrics_) metrics_->count("start");
  step1();
  if (metrics_) metrics_->count("step1");
  step2();
  if (metrics_) metrics_->count("step2");
  if (tracer_)  tracer_->end();
}`,
    options: [
      "The same null check is repeated at every call site, so one forgotten check crashes; inject a do-nothing implementation instead (Null Object)",
      "A virtual destructor is missing",
      "A class has too many subclasses",
      "A method is too short",
    ],
    answer: [0],
    explain: "Optional collaborators that must be checked everywhere invite a missed check and obscure the main flow. A do-nothing metrics object lets the service read straight through.",
  },

  // ---- Specification ----------------------------------------------------
  {
    id: "bt-mcq-spc-intent",
    kind: "mcq",
    topic: "L5.specification",
    level: 1,
    prompt: "What does the Specification pattern provide?",
    options: [
      "Small named predicate objects that can be combined with and / or / not to express business rules, and reused for filtering or validation",
      "A way to describe the public API in documents",
      "A base class for every entity",
      "A cache for query results",
    ],
    answer: [0],
    explain: "Each rule becomes an object with an isSatisfiedBy method. Composition builds richer rules without editing the old ones, which is useful for coupons, search filters and eligibility checks.",
  },
  {
    id: "bt-pat-spc-coupon",
    kind: "pattern",
    topic: "L5.specification",
    level: 2,
    prompt: "A coupon applies if the cart is over 50, the user is new, and the items are not already discounted; ops keeps inventing new combinations. Which Patternling fits?",
    options: ["Sieveling (Specification)", "Stencilmoth (Template Method)", "Chamelyn (State)", "Snapsnail (Memento)"],
    answer: [0],
    explain: "Reusable predicates composed with and/or/not. The alternative is a growing if-chain in the checkout, which has to be edited and retested for each new combination.",
  },
  {
    id: "bt-pred-spc-combo",
    kind: "predict",
    topic: "L5.specification",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <utility>

struct Cart { int total; bool newUser; };

struct Spec {
  virtual ~Spec() = default;
  virtual bool ok(const Cart& c) const = 0;
};
struct Over : Spec {
  explicit Over(int n) : n_(n) {}
  bool ok(const Cart& c) const override { return c.total > n_; }
  int n_;
};
struct NewUser : Spec {
  bool ok(const Cart& c) const override { return c.newUser; }
};
struct Not : Spec {
  explicit Not(std::unique_ptr<Spec> s) : s_(std::move(s)) {}
  bool ok(const Cart& c) const override { return !s_->ok(c); }
  std::unique_ptr<Spec> s_;
};
struct And : Spec {
  And(std::unique_ptr<Spec> a, std::unique_ptr<Spec> b) : a_(std::move(a)), b_(std::move(b)) {}
  bool ok(const Cart& c) const override { return a_->ok(c) && b_->ok(c); }
  std::unique_ptr<Spec> a_, b_;
};

int main() {
  // over 50 and not a new user
  And rule(std::make_unique<Over>(50), std::make_unique<Not>(std::make_unique<NewUser>()));
  std::cout << rule.ok({80, false}) << rule.ok({80, true}) << rule.ok({50, false}) << rule.ok({51, false}) << "\\n";
}
`,
    output: "1001",
    options: ["1001", "1011", "1000", "0101"],
    answer: [0],
    explain: "{80,false}: over 50 and not new gives 1. {80,true}: new user is excluded, 0. {50,false}: the comparison is strict, so 50 is not over 50, 0. {51,false}: 1. The result prints 1001. Composing existing specs expressed a new rule without editing any of them.",
  },
  {
    id: "bt-mcq-spc-vs",
    kind: "mcq",
    topic: "L5.specification",
    level: 3,
    prompt: "For two fixed rules in a small module, is a Specification class hierarchy worth it?",
    options: [
      "Usually not; a plain function or lambda per rule is enough, and Specification pays off when rules multiply, get combined at runtime or come from configuration",
      "Yes, always, because it follows SOLID",
      "Only if rules are stored in a database",
      "No, because predicates cannot be combined in C++",
    ],
    answer: [0],
    explain: "In C++ a std::function<bool(const Cart&)> with small combinator helpers is often lighter than a class hierarchy. Name the over-application cost in review: extra types and indirection that two rules do not justify.",
  },
  {
    id: "bt-smell-spc-flags",
    kind: "smell",
    topic: "L5.specification",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `std::vector<Product> filter(const std::vector<Product>& ps, bool byColour, Colour c,
                            bool bySize, Size s, bool byBrand, const std::string& b) {
  std::vector<Product> out;
  for (const auto& p : ps) {
    if (byColour && p.colour != c) continue;
    if (bySize   && p.size   != s) continue;
    if (byBrand  && p.brand  != b) continue;
    out.push_back(p);
  }
  return out;
}`,
    options: [
      "Flags and parameters grow with every new criterion, and callers cannot combine rules freely; Open/Closed (compose predicates instead)",
      "A missing virtual destructor",
      "A class exposes a public data member",
      "The function is a template",
    ],
    answer: [0],
    explain: "Each new filter edits this signature and every call site, and 'or' is not expressible. Composable predicates (a Specification or lambdas) let callers build any combination.",
  },
];
