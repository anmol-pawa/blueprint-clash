import type { Card } from "@/lib/battle/cards";

/**
 * SOLID Square concept deck (CURRICULUM L2: SRP, OCP, LSP, ISP, DIP and the supporting heuristics).
 * 40 cards, original wording. Predict cards are compiled and run natively by content:verify.
 */
export const SOLID_SQUARE_DECK: Card[] = [
  // ---- SRP -------------------------------------------------------------
  {
    id: "ss-mcq-srp-def",
    kind: "mcq",
    topic: "L2.srp",
    level: 1,
    prompt: "Which statement is the most useful way to apply the Single Responsibility Principle?",
    options: [
      "A class should have one reason to change, meaning one actor or concern whose requirements drive its edits",
      "A class should have exactly one public method",
      "A class should be at most 100 lines long",
      "A class should never depend on another class",
    ],
    answer: [0],
    explain: "SRP is about axes of change, not method counts or line counts. If the billing team and the reporting team both force edits to the same class, it has two responsibilities and each team can break the other's behaviour.",
  },
  {
    id: "ss-smell-srp-invoice",
    kind: "smell",
    topic: "L2.srp",
    level: 1,
    prompt: "Name the smell and the principle it strains.",
    code: `class Invoice {
 public:
  double total() const;
  void applyDiscount(double pct);
  std::string toHtml() const;
  void saveToDatabase(Db& db) const;
  void emailTo(const std::string& addr) const;
};`,
    options: [
      "God class mixing pricing, rendering, persistence and delivery; Single Responsibility",
      "Fat interface; Interface Segregation",
      "Type-code switch; Open/Closed",
      "Covariant return; Liskov Substitution",
    ],
    answer: [0],
    explain: "Pricing rules, HTML layout, database schema and mail transport change for unrelated reasons. Keep Invoice as the domain object and move rendering, storage and delivery to collaborators such as InvoiceRenderer, InvoiceRepository and Mailer.",
  },
  {
    id: "ss-mcq-srp-overapply",
    kind: "mcq",
    topic: "L2.srp",
    level: 2,
    prompt: "A candidate splits a 40-line OrderValidator into nine one-method classes 'for SRP'. What is the best critique?",
    options: [
      "SRP was over-applied: the pieces change together, so splitting adds indirection and wiring with no benefit",
      "Nothing is wrong; more classes is always better SRP",
      "The classes should be merged into a single global function",
      "SRP forbids validators from having any collaborators",
    ],
    answer: [0],
    explain: "A responsibility is a reason to change, not a method. Pieces that always change together are cohesive and belong together. In an interview, say what would change independently before you split, and stop when the split no longer buys you that.",
  },
  {
    id: "ss-mcq-srp-cohesion",
    kind: "mcq",
    topic: "L2.cohesion",
    level: 2,
    prompt: "Which symptom best suggests low cohesion in a class?",
    options: [
      "Groups of methods that use disjoint subsets of the fields",
      "The class has a virtual destructor",
      "The class has const member functions",
      "The class is declared in its own header",
    ],
    answer: [0],
    explain: "If one cluster of methods touches fields A and B and another touches only C and D, you are looking at two classes sharing a name. Splitting along that seam usually gives each half a clear invariant.",
  },
  {
    id: "ss-smell-srp-report",
    kind: "smell",
    topic: "L2.srp",
    level: 2,
    prompt: "Which principle does this function strain most, and what is the first refactor?",
    code: `void runMonthlyReport(const std::vector<Sale>& sales) {
  double total = 0;
  for (const auto& s : sales) total += s.amount;      // compute
  std::ofstream out("report.csv");                      // persist
  out << "total," << total << "\\n";
  std::cout << "Report written\\n";                     // notify
}`,
    options: [
      "Single Responsibility; separate computation from output so the logic is testable without a file",
      "Liskov Substitution; add a virtual destructor",
      "Interface Segregation; split the vector",
      "Dependency Inversion; make total a global",
    ],
    answer: [0],
    explain: "Calculation, file output and console messages are tangled, so a unit test must touch the file system. Extract double totalSales(const vector<Sale>&) as a pure function and pass an output stream or sink into the writer.",
  },
  {
    id: "ss-pat-srp-split",
    kind: "pattern",
    topic: "L2.srp",
    level: 3,
    prompt: "A checkout class computes tax, and the rules differ per region and change each quarter independently of the rest of checkout. Which approach isolates that axis of change best?",
    options: [
      "Extract a TaxPolicy interface with a per-region implementation injected into checkout",
      "Add a region enum and a switch inside checkout",
      "Make tax rates global constants",
      "Subclass checkout once per region",
    ],
    answer: [0],
    explain: "Tax rules are their own axis of change, so they get their own abstraction injected into checkout. A switch keeps all regions in one edit surface, globals hide the dependency, and a subclass per region multiplies checkout variants.",
  },

  // ---- OCP -------------------------------------------------------------
  {
    id: "ss-mcq-ocp-def",
    kind: "mcq",
    topic: "L2.ocp",
    level: 1,
    prompt: "What does the Open/Closed Principle ask for?",
    options: [
      "New behaviour can be added by adding code (a new class), not by editing code that already works",
      "Source files must be read-only on disk",
      "Classes may never be modified under any circumstance",
      "All classes must be abstract",
    ],
    answer: [0],
    explain: "Open for extension, closed for modification: identify the axis that is likely to vary, put it behind an abstraction, and new variants arrive as new classes. It is a design goal for the parts that really vary, not a ban on editing files.",
  },
  {
    id: "ss-smell-ocp-discount",
    kind: "smell",
    topic: "L2.ocp",
    level: 1,
    prompt: "Name the smell and the principle it strains.",
    code: `double price(const Order& o) {
  if (o.customerType == "student") return o.base * 0.8;
  if (o.customerType == "vip")     return o.base * 0.7;
  if (o.customerType == "staff")   return o.base * 0.5;
  return o.base;
}`,
    options: [
      "String-typed conditional chain; Open/Closed (each new customer type edits this function)",
      "God class; Single Responsibility",
      "Fat interface; Interface Segregation",
      "Singleton; Dependency Inversion",
    ],
    answer: [0],
    explain: "Every new customer tier edits tested code and risks the existing branches. A DiscountPolicy interface with one class per tier, chosen at the boundary, lets new tiers arrive without touching the others.",
  },
  {
    id: "ss-pred-ocp-strategy",
    kind: "predict",
    topic: "L2.ocp",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <vector>

struct Discount {
  virtual ~Discount() = default;
  virtual double apply(double p) const = 0;
};
struct None : Discount {
  double apply(double p) const override { return p; }
};
struct Percent : Discount {
  explicit Percent(double f) : f_(f) {}
  double apply(double p) const override { return p * (1.0 - f_); }
 private:
  double f_;
};
struct Flat : Discount {
  explicit Flat(double d) : d_(d) {}
  double apply(double p) const override { return p > d_ ? p - d_ : 0.0; }
 private:
  double d_;
};

int main() {
  std::vector<std::unique_ptr<Discount>> ds;
  ds.push_back(std::make_unique<None>());
  ds.push_back(std::make_unique<Percent>(0.25));
  ds.push_back(std::make_unique<Flat>(30));
  for (const auto& d : ds) std::cout << d->apply(80) << " ";
  std::cout << "\\n";
}
`,
    output: "80 60 50",
    options: ["80 60 50", "80 60 110", "80 55 50", "80 20 50"],
    answer: [0],
    explain: "None leaves 80, Percent(0.25) gives 80 x 0.75 = 60, and Flat(30) gives 80 - 30 = 50. The loop never changes when a fourth discount class is added: that is Open/Closed in practice.",
  },
  {
    id: "ss-mcq-ocp-predict-axis",
    kind: "mcq",
    topic: "L2.ocp",
    level: 3,
    prompt: "In an interview you are told 'payments will gain new methods every quarter, but refunds are always full'. How should OCP shape your design?",
    options: [
      "Put payment method behind an interface (the volatile axis) and keep refunds simple until they vary",
      "Abstract everything now, including refunds, in case it changes",
      "Use one big switch on method; it is fastest to write",
      "Avoid interfaces; use inheritance from a concrete Payment class",
    ],
    answer: [0],
    explain: "OCP pays off on axes you have evidence will vary. Abstracting refunds with no evidence is speculative generality (YAGNI). A switch on method would need editing every quarter, and concrete-class inheritance couples new methods to old code.",
  },
  {
    id: "ss-mcq-ocp-cost",
    kind: "mcq",
    topic: "L2.ocp",
    level: 3,
    prompt: "What is the honest cost of applying OCP everywhere?",
    options: [
      "More types and indirection to read and test, and abstractions guessed wrong are harder to remove than a plain function",
      "None; abstractions are free",
      "It makes code slower by an order of magnitude in every case",
      "It forbids unit testing",
    ],
    answer: [0],
    explain: "Abstractions cost reading time and can encode the wrong axis, which then has to be unpicked. A common rule: allow the first variation to be concrete, abstract on the second, and refactor with the change-storm in mind.",
  },
  {
    id: "ss-smell-ocp-logger",
    kind: "smell",
    topic: "L2.ocp",
    level: 3,
    prompt: "This class is 'closed' to extension. Which change makes it open without a switch?",
    code: `class Exporter {
 public:
  void run(const Data& d, Format f) {
    switch (f) {
      case Format::Csv:  writeCsv(d);  break;
      case Format::Json: writeJson(d); break;
    }
  }
};`,
    options: [
      "Introduce a Writer interface; Exporter receives one and calls write(d)",
      "Add a Format::Xml case and a writeXml function",
      "Make run a template on the enum",
      "Mark run as final",
    ],
    answer: [0],
    explain: "Adding Xml to the switch edits Exporter again. With a Writer interface, XmlWriter is a new class and Exporter is untouched. Choose the writer at the composition root, not inside the exporter.",
  },

  // ---- LSP -------------------------------------------------------------
  {
    id: "ss-mcq-lsp-def",
    kind: "mcq",
    topic: "L2.lsp",
    level: 1,
    prompt: "What does the Liskov Substitution Principle require of a subtype?",
    options: [
      "Code written against the base type keeps working, with the same expectations, when given the subtype",
      "The subtype must override every base method",
      "The subtype must be in the same file as the base",
      "The subtype must add more public methods than the base",
    ],
    answer: [0],
    explain: "Substitutability is behavioural, not just syntactic: the subtype honours the base contract. Compiling is not enough; a subtype that throws where the base promised success breaks callers even though every signature matches.",
  },
  {
    id: "ss-pred-lsp-rect",
    kind: "predict",
    topic: "L2.lsp",
    level: 2,
    prompt: "A caller expects that setting the width leaves the height alone. What does this program print?",
    code: `#include <iostream>

class Rectangle {
 public:
  virtual ~Rectangle() = default;
  virtual void setWidth(int w) { w_ = w; }
  virtual void setHeight(int h) { h_ = h; }
  int area() const { return w_ * h_; }
 protected:
  int w_ = 0, h_ = 0;
};
class Square : public Rectangle {
 public:
  void setWidth(int w) override { w_ = h_ = w; }
  void setHeight(int h) override { w_ = h_ = h; }
};

void stretch(Rectangle& r) {
  r.setWidth(5);
  r.setHeight(4);
  std::cout << r.area() << " ";
}

int main() {
  Rectangle r;
  Square s;
  stretch(r);
  stretch(s);
  std::cout << "\\n";
}
`,
    output: "20 16",
    options: ["20 16", "20 20", "16 16", "20 25"],
    answer: [0],
    explain: "For Rectangle: 5 x 4 = 20. For Square, setHeight(4) also overwrites the width, so the area is 16, not the 20 the caller reasoned about. The Square breaks a postcondition of setWidth/setHeight (the other dimension is unchanged), so it is not substitutable.",
  },
  {
    id: "ss-mcq-lsp-contract",
    kind: "mcq",
    topic: "L2.lsp",
    level: 2,
    prompt: "Which pair of rules matches the contract view of LSP? Choose all that apply.",
    options: [
      "A subtype may not strengthen preconditions (demand more than the base did)",
      "A subtype may not weaken postconditions (promise less than the base did)",
      "A subtype must preserve the base class invariants",
      "A subtype may throw any new exception type the base never mentioned",
    ],
    answer: [0, 1, 2],
    explain: "Preconditions may be weakened, postconditions may be strengthened, invariants must hold. Throwing new surprise failures is a postcondition violation unless the base contract already allowed it.",
  },
  {
    id: "ss-smell-lsp-notsupported",
    kind: "smell",
    topic: "L2.lsp",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `class Bird { public: virtual void fly() = 0; virtual ~Bird() = default; };
class Penguin : public Bird {
 public:
  void fly() override { throw std::logic_error("penguins cannot fly"); }
};`,
    options: [
      "Subtype refuses an inherited operation; Liskov Substitution (and the hierarchy is modelled wrongly)",
      "God class; Single Responsibility",
      "Missing virtual destructor; Open/Closed",
      "Raw pointer ownership; Dependency Inversion",
    ],
    answer: [0],
    explain: "Callers holding a Bird are promised fly() works. Split the capability: a Bird base with Flyer as a separate interface, or composition of a movement behaviour. Throwing from an override to opt out is the classic LSP alarm.",
  },
  {
    id: "ss-smell-lsp-precondition",
    kind: "smell",
    topic: "L2.lsp",
    level: 3,
    prompt: "Which LSP rule does the override break?",
    code: `struct Account {
  virtual ~Account() = default;
  // Pre: amount > 0. Post: balance reduced by amount.
  virtual void withdraw(int amount) { balance_ -= amount; }
  int balance_ = 100;
};
struct SavingsAccount : Account {
  // Only allows amounts that are multiples of 50.
  void withdraw(int amount) override {
    if (amount % 50 != 0) throw std::invalid_argument("bad amount");
    Account::withdraw(amount);
  }
};`,
    options: [
      "It strengthens the precondition (rejects inputs the base accepted)",
      "It weakens the invariant by calling the base",
      "It returns a covariant type",
      "It overrides a non-virtual function",
    ],
    answer: [0],
    explain: "The base accepted any positive amount; the subtype accepts only multiples of 50. A caller written against Account passing 30 now gets an exception. Subtypes may accept more, never less. Model the restriction as policy or a different type.",
  },
  {
    id: "ss-mcq-lsp-fix-square",
    kind: "mcq",
    topic: "L2.lsp",
    level: 3,
    prompt: "Square-inherits-Rectangle breaks LSP. Which fix is the soundest?",
    options: [
      "Make shapes immutable value types, or expose a common Shape with area() and no independent setters",
      "Throw from Square::setWidth",
      "Make Square override area to return w_ squared",
      "Add a dynamic_cast in the caller to check for Square",
    ],
    answer: [0],
    explain: "The trouble is mutation breaking the 'independent dimensions' expectation. Immutable shapes (or a hierarchy with only area/perimeter) have no such promise to break. Throwing, special-casing with casts, or tweaking area just hides the broken contract.",
  },
  {
    id: "ss-pat-lsp-capability",
    kind: "pattern",
    topic: "L2.lsp",
    level: 3,
    prompt: "A read-only file should not inherit write() from File. Which structure respects both LSP and ISP?",
    options: [
      "Separate Readable and Writable interfaces; ReadOnlyFile implements only Readable",
      "A File base with write() that throws for read-only files",
      "A File base with an isReadOnly() flag callers must check first",
      "Make every file writable and ignore the flag",
    ],
    answer: [0],
    explain: "Capabilities as separate interfaces mean a type only promises what it can do, so no caller is surprised. Throwing or flag-checking pushes the burden onto every caller and breaks substitution.",
  },

  // ---- ISP -------------------------------------------------------------
  {
    id: "ss-mcq-isp-def",
    kind: "mcq",
    topic: "L2.isp",
    level: 1,
    prompt: "What does the Interface Segregation Principle say?",
    options: [
      "Clients should not be forced to depend on methods they do not use; prefer several small, role-focused interfaces",
      "Every class should implement exactly one interface",
      "Interfaces should contain all methods of every implementation",
      "Interfaces should never be abstract",
    ],
    answer: [0],
    explain: "A fat interface couples every client to operations it never calls, so unrelated changes recompile and retest them and forced stubs appear in implementers. Split by the roles the clients play.",
  },
  {
    id: "ss-smell-isp-printer",
    kind: "smell",
    topic: "L2.isp",
    level: 1,
    prompt: "Name the smell and the principle it strains.",
    code: `class IMachine {
 public:
  virtual void print(const Doc&) = 0;
  virtual void scan(Doc&) = 0;
  virtual void fax(const Doc&) = 0;
  virtual ~IMachine() = default;
};
class BasicPrinter : public IMachine {
 public:
  void print(const Doc&) override { /* ok */ }
  void scan(Doc&) override { /* nothing */ }
  void fax(const Doc&) override { throw std::runtime_error("unsupported"); }
};`,
    options: [
      "Fat interface forcing stub methods; Interface Segregation",
      "Type-code switch; Open/Closed",
      "Shared global state; Dependency Inversion",
      "Constructor too long; Single Responsibility",
    ],
    answer: [0],
    explain: "BasicPrinter must implement scan and fax it cannot do, one of them throwing (which also strains LSP). Split into IPrinter, IScanner, IFax; a multifunction device implements all three.",
  },
  {
    id: "ss-mcq-isp-cost",
    kind: "mcq",
    topic: "L2.isp",
    level: 2,
    prompt: "What goes wrong if ISP is taken to the extreme of one-method interfaces everywhere?",
    options: [
      "Many tiny types to name, wire and navigate, with little gain when the methods always travel together",
      "Nothing; it is always optimal",
      "Virtual calls become impossible",
      "The compiler refuses to link the program",
    ],
    answer: [0],
    explain: "Group methods by the clients that use them. If every consumer of a repository needs both load and save, splitting them gives wiring cost without decoupling. Split where different clients use different subsets.",
  },
  {
    id: "ss-mcq-isp-cpp",
    kind: "mcq",
    topic: "L2.isp",
    level: 2,
    prompt: "In C++, which extra benefit does a narrow interface give besides fewer stubs?",
    options: [
      "Fewer recompilations of clients when an unrelated method is added, since they include only the small header",
      "Smaller object files for every class",
      "It lets you skip virtual destructors",
      "Automatic thread safety",
    ],
    answer: [0],
    explain: "Header dependencies are a real build cost in C++. A client that includes only IReader is not rebuilt when IWriter gains a method. Narrow interfaces also make fakes in tests tiny to write.",
  },
  {
    id: "ss-pat-isp-roles",
    kind: "pattern",
    topic: "L2.isp",
    level: 3,
    prompt: "A report generator only reads orders, a checkout service reads and writes them. How do you design the order store's interface?",
    options: [
      "A small OrderReader interface for the report, and a store that implements both reader and writer for checkout",
      "One IOrderStore with every method, passed to both",
      "A global OrderStore singleton used by both",
      "Copy the order data into each client",
    ],
    answer: [0],
    explain: "The report depends only on what it reads, so it cannot accidentally mutate orders and is trivial to fake. The same concrete store can implement both roles, which keeps the code DRY without a fat interface.",
  },

  // ---- DIP -------------------------------------------------------------
  {
    id: "ss-mcq-dip-def",
    kind: "mcq",
    topic: "L2.dip",
    level: 1,
    prompt: "What does the Dependency Inversion Principle say?",
    options: [
      "High-level policy should depend on abstractions, and details should depend on those same abstractions, not on each other directly",
      "Always use inheritance instead of composition",
      "Dependencies must be created inside the class that uses them",
      "Low-level modules should call high-level modules through globals",
    ],
    answer: [0],
    explain: "Business rules own the interface they need (for example Clock or PaymentGateway); concrete adapters implement it. Source dependencies point inward to policy, so you can swap or fake the details.",
  },
  {
    id: "ss-smell-dip-new",
    kind: "smell",
    topic: "L2.dip",
    level: 1,
    prompt: "Name the smell and the principle it strains.",
    code: `class OrderService {
 public:
  void place(const Order& o) {
    MySqlDatabase db("prod-host");
    db.insert(o);
    SmtpMailer mailer;
    mailer.send(o.customerEmail, "Thanks!");
  }
};`,
    options: [
      "High-level logic constructs concrete details; Dependency Inversion",
      "God interface; Interface Segregation",
      "Subclass narrows a precondition; Liskov Substitution",
      "Switch on type code; Open/Closed",
    ],
    answer: [0],
    explain: "OrderService cannot be tested without a database and mail server, and swapping either means editing it. Define OrderRepository and Notifier interfaces, take them by reference or unique_ptr in the constructor, and construct concretes at the composition root.",
  },
  {
    id: "ss-pred-dip-fake",
    kind: "predict",
    topic: "L2.dip",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <string>
#include <vector>

struct Notifier {
  virtual ~Notifier() = default;
  virtual void send(const std::string& msg) = 0;
};
struct FakeNotifier : Notifier {
  std::vector<std::string> sent;
  void send(const std::string& msg) override { sent.push_back(msg); }
};
class Checkout {
 public:
  explicit Checkout(Notifier& n) : notifier_(n) {}
  void pay(int cents) {
    if (cents <= 0) return;
    notifier_.send("paid " + std::to_string(cents));
  }
 private:
  Notifier& notifier_;
};

int main() {
  FakeNotifier fake;
  Checkout c(fake);
  c.pay(250);
  c.pay(0);
  c.pay(75);
  std::cout << fake.sent.size() << " " << fake.sent.back() << "\\n";
}
`,
    output: "2 paid 75",
    options: ["2 paid 75", "3 paid 75", "2 paid 250", "3 paid 0"],
    answer: [0],
    explain: "Checkout depends on the Notifier abstraction, so a test injects a fake that records messages. pay(0) returns early, leaving two sends; the last is 'paid 75'. This is the testability payoff of constructor injection.",
  },
  {
    id: "ss-mcq-dip-vs-di",
    kind: "mcq",
    topic: "L2.dip",
    level: 2,
    prompt: "How are Dependency Inversion (the principle) and dependency injection (the technique) related?",
    options: [
      "DIP says which way source dependencies should point; injection is one way to supply the abstraction's implementation",
      "They are the same thing",
      "Injection requires a framework, DIP does not",
      "DIP forbids constructors with parameters",
    ],
    answer: [0],
    explain: "You can invert dependencies and still construct objects by hand in main(). Injection (constructor parameters, mostly) is the mechanism that keeps classes from creating their own collaborators. A container is optional convenience, not part of the principle.",
  },
  {
    id: "ss-mcq-dip-cpp-ownership",
    kind: "mcq",
    topic: "L2.dip",
    level: 2,
    prompt: "A class receives a collaborator through its constructor. Which parameter type states 'I take ownership'?",
    options: [
      "std::unique_ptr<Notifier>",
      "Notifier&",
      "Notifier*",
      "const Notifier&",
    ],
    answer: [0],
    explain: "A unique_ptr parameter transfers sole ownership. A reference says the caller keeps ownership and must outlive you. A raw pointer is ambiguous about both. Pick deliberately and document lifetime for references.",
  },
  {
    id: "ss-mcq-dip-templates",
    kind: "mcq",
    topic: "L2.dip",
    level: 3,
    prompt: "Besides an abstract base class, what is a valid C++ way to invert a dependency, and what is its trade-off?",
    options: [
      "Template the class on a policy type: no virtual call, but implementations are fixed at compile time and appear in headers",
      "Use a global variable of the concrete type",
      "Use reinterpret_cast to swap implementations",
      "There is no other way",
    ],
    answer: [0],
    explain: "Static polymorphism via templates or concepts removes vtable cost and allows inlining, but you cannot swap implementations at run time and error messages and compile times suffer. Virtual interfaces suit runtime-chosen plugins; templates suit hot, compile-time-known paths.",
  },

  // ---- DRY / KISS / YAGNI ---------------------------------------------
  {
    id: "ss-mcq-dry-def",
    kind: "mcq",
    topic: "L2.dry",
    level: 1,
    prompt: "Two functions contain the same 8 lines. Which situation argues AGAINST merging them?",
    options: [
      "They are coincidentally similar today but serve different rules that will diverge",
      "They are edited together every time",
      "They both validate the same business rule",
      "They have identical tests",
    ],
    answer: [0],
    explain: "DRY is about duplicated knowledge, not duplicated characters. Merging code that only happens to look alike couples two reasons to change, and the shared helper soon grows boolean flags. Duplicate a little rather than abstract wrongly.",
  },
  {
    id: "ss-mcq-kiss",
    kind: "mcq",
    topic: "L2.kiss",
    level: 1,
    prompt: "An interviewer asks for a parking lot with two vehicle types. Which opening design shows KISS and good judgement?",
    options: [
      "Start with a small hierarchy or enum that satisfies stated requirements, and name the extension points you would add on request",
      "Build a plugin framework with a DSL for pricing rules",
      "Use ten design patterns to show breadth",
      "Skip the design and code everything in main",
    ],
    answer: [0],
    explain: "Interviewers score fit to the requirements and awareness of change, not pattern count. State the likely change axes, build the simplest model that handles them, and let the Change Storm show where abstraction is warranted.",
  },
  {
    id: "ss-smell-yagni",
    kind: "smell",
    topic: "L2.yagni",
    level: 2,
    prompt: "Name the smell. The app has one database and one email provider and no plans to change.",
    code: `class AbstractRepositoryFactoryProvider {
 public:
  virtual std::unique_ptr<RepositoryFactory> create(const Config&) = 0;
};
class DefaultRepositoryFactoryProvider : public AbstractRepositoryFactoryProvider { /* ... */ };
// Only one implementation exists, and nothing else is planned.`,
    options: [
      "Speculative generality; YAGNI",
      "Fat interface; Interface Segregation",
      "Subtype narrows its contract; Liskov Substitution",
      "Feature envy; Law of Demeter",
    ],
    answer: [0],
    explain: "A layer of abstraction with exactly one implementation and no evidence of a second is cost without benefit. Introduce the interface when a second variant or a test double actually needs it; refactoring to one is cheap.",
  },
  {
    id: "ss-mcq-yagni-vs-ocp",
    kind: "mcq",
    topic: "L2.yagni",
    level: 3,
    prompt: "How do you reconcile YAGNI with Open/Closed in a design interview?",
    options: [
      "Abstract the axes the requirements or Change Storm signal will vary; keep everything else concrete and say so",
      "Never abstract anything",
      "Abstract every noun in the requirements",
      "Choose whichever has more classes",
    ],
    answer: [0],
    explain: "Both are about evidence. Use the stated requirements, asked clarifications and plausible follow-ups to pick two or three axes of change, build seams there, and explain what you deliberately left simple.",
  },

  // ---- Demeter / tell-don't-ask / immutability --------------------------
  {
    id: "ss-smell-demeter",
    kind: "smell",
    topic: "L2.demeter",
    level: 2,
    prompt: "Name the smell and the heuristic it breaks.",
    code: `double shippingCost(const Order& o) {
  return o.getCustomer().getAddress().getCountry().getShippingRate() * o.weight();
}`,
    options: [
      "Train-wreck chain through other objects' internals; Law of Demeter",
      "Missing virtual destructor; Liskov Substitution",
      "Switch on enum; Open/Closed",
      "God class; Single Responsibility",
    ],
    answer: [0],
    explain: "The function knows the structure of Customer, Address and Country, so any reshuffle breaks it. Tell the order to compute it (o.shippingCost()) so only Order knows its neighbours. Do not apply this to fluent builders or value-type accessors, where chaining is fine.",
  },
  {
    id: "ss-pred-tell",
    kind: "predict",
    topic: "L2.tell-dont-ask",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>

class Wallet {
 public:
  explicit Wallet(int cents) : cents_(cents) {}
  bool trySpend(int cost) {
    if (cost > cents_) return false;
    cents_ -= cost;
    return true;
  }
  int balance() const { return cents_; }
 private:
  int cents_;
};

int main() {
  Wallet w(100);
  bool a = w.trySpend(70);
  bool b = w.trySpend(70);
  bool c = w.trySpend(30);
  std::cout << a << b << c << " " << w.balance() << "\\n";
}
`,
    output: "101 0",
    options: ["101 0", "111 -40", "100 30", "101 30"],
    answer: [0],
    explain: "The wallet owns the rule (check and subtract in one operation), so the second spend is refused and the third succeeds: true, false, true prints 101, leaving 100 - 70 - 30 = 0. Asking for the balance and subtracting in the caller would let two callers overspend.",
  },
  {
    id: "ss-mcq-composition",
    kind: "mcq",
    topic: "L2.composition",
    level: 2,
    prompt: "Why does 'favour composition over inheritance' hold in most designs?",
    options: [
      "Behaviour can be swapped at run time and combined freely, while inheritance fixes the relationship at compile time and exposes the base class's details",
      "Composition is always faster",
      "Inheritance is not allowed in C++ interviews",
      "Composition removes the need for interfaces",
    ],
    answer: [0],
    explain: "Inheritance models a true is-a that honours the contract (LSP) and is hard to change later. Composition models has-a/uses-a and lets you recombine parts, which is why Strategy and Decorator beat deep trees. Use inheritance for interfaces and genuine subtype relationships.",
  },
  {
    id: "ss-pred-immutable",
    kind: "predict",
    topic: "L2.immutability",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>

class Money {
 public:
  Money(long long cents) : cents_(cents) {}
  Money plus(const Money& o) const { return Money(cents_ + o.cents_); }
  long long cents() const { return cents_; }
 private:
  long long cents_;
};

int main() {
  const Money a(500);
  Money b = a.plus(Money(250));
  Money c = b.plus(b);
  std::cout << a.cents() << " " << b.cents() << " " << c.cents() << "\\n";
}
`,
    output: "500 750 1500",
    options: ["500 750 1500", "750 750 1500", "500 750 750", "1500 1500 1500"],
    answer: [0],
    explain: "plus returns a new Money and never mutates its receiver, so a stays 500, b is 750 and c is 1500. Immutable value types are safe to share across threads and cannot have invariants broken by a distant caller.",
  },
  {
    id: "ss-mcq-const-correct",
    kind: "mcq",
    topic: "L2.immutability",
    level: 1,
    prompt: "Which C++ practice best supports an immutable-by-default design?",
    options: [
      "Mark getters const, take read-only inputs as const&, and make members const or private with no setters",
      "Make every member public",
      "Use const_cast to remove const when convenient",
      "Avoid const to keep signatures short",
    ],
    answer: [0],
    explain: "const member functions and const references document and enforce that a call does not change state. Public mutable fields, or casting const away, remove the guarantee that keeps invariants local to the class.",
  },
  {
    id: "ss-smell-feature-envy",
    kind: "smell",
    topic: "L2.tell-dont-ask",
    level: 3,
    prompt: "Name the smell and the better home for the logic.",
    code: `class Cart {
 public:
  std::vector<Item> items;
};
double total(const Cart& c) {
  double sum = 0;
  for (const auto& i : c.items) sum += i.price * i.qty;
  if (sum > 100) sum *= 0.9;
  return sum;
}`,
    options: [
      "Feature envy (anemic model); move total() into Cart so it owns its items and rules",
      "Fat interface; split Cart into readers and writers",
      "Covariant return; Liskov Substitution",
      "Singleton; Dependency Inversion",
    ],
    answer: [0],
    explain: "The free function reaches into Cart's data to apply rules that belong to the cart, and every caller can duplicate or diverge from them. Put total() on Cart and keep items private so the discount rule has one home.",
  },
  {
    id: "ss-mcq-coupling",
    kind: "mcq",
    topic: "L2.coupling",
    level: 2,
    prompt: "Which pairing is the healthiest target for module design?",
    options: [
      "High cohesion within a module, low coupling between modules",
      "Low cohesion inside, high coupling outside",
      "High coupling, so changes propagate quickly",
      "Cohesion and coupling do not matter for design",
    ],
    answer: [0],
    explain: "Related things together and unrelated things apart: a change should touch one module. Coupling through narrow, stable abstractions is fine; coupling through shared mutable state or concrete types is what hurts.",
  },
  {
    id: "ss-mcq-explain-order",
    kind: "mcq",
    topic: "L2.interview",
    level: 3,
    prompt: "In an LLD interview, what is the most convincing way to present SOLID?",
    options: [
      "Name the likely change, show the seam you put there, and say what you left simple and why",
      "List all five principles in your opening minute",
      "Add an interface for every class",
      "Avoid mentioning trade-offs to sound confident",
    ],
    answer: [0],
    explain: "Senior signals are judgement and communication: tie each abstraction to a concrete change, state the cost, and show you can stop. Reciting acronyms or abstracting everything reads as cargo-culting.",
  },
  {
    id: "ss-pat-dip-strategy",
    kind: "pattern",
    topic: "L2.dip",
    level: 2,
    prompt: "A sorter must support several comparison orders chosen at run time, without the sorter knowing any of them. Which Patternling fits?",
    options: ["Chamelstrat (Strategy)", "Solo (Singleton)", "Facadeon (Facade)", "Clonewisp (Prototype)"],
    answer: [0],
    explain: "Strategy injects interchangeable algorithms behind one interface, so the sorter depends only on the abstraction (DIP) and new orders add classes (OCP). Singleton, Facade and Prototype address instance count, simplification and copying.",
  },
];
