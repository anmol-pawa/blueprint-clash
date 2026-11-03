/** SOLID Square lessons (CUR L2). Original wording. Every `before`/`after` snippet is compiled natively by `content/verify/lessons.verify.ts`. */
export interface Lesson {
  id: string;
  title: string;
  topic: string;
  /** One-line version, shown on the lesson list. */
  summary: string;
  smell: string;
  idea: string;
  before: string;
  after: string;
  interview: string;
  overApply: string;
}

export const SOLID_LESSONS: readonly Lesson[] = [
  {
    id: "srp",
    title: "SRP: one reason to change",
    topic: "L2.srp",
    summary: "Group code by who asks for changes, not by how many lines it has.",
    smell: "A class whose change history mixes unrelated requests: a tax rule edit, a new email wording and a new file format all touch the same file. Tell-tale names: `Manager`, `Processor`, `Helper`.",
    idea: "A **responsibility** is a reason to change, owned by one stakeholder or concern. SRP does not say \"one method\". It says the things that change together live together, and things that change for different reasons are separated. The payoff is smaller blast radius: a pricing change cannot break receipt printing.",
    before: `#include <iostream>
#include <string>
#include <vector>

class Order {
 public:
  void add(const std::string& name, double price) { items_.push_back({name, price}); }
  double total() const {                       // pricing rules
    double t = 0;
    for (const auto& i : items_) t += i.second;
    return t > 100 ? t * 0.9 : t;
  }
  void print() const {                         // presentation
    for (const auto& i : items_) std::cout << i.first << " " << i.second << "\\n";
    std::cout << "total " << total() << "\\n";
  }
 private:
  std::vector<std::pair<std::string, double>> items_;
};`,
    after: `#include <iostream>
#include <string>
#include <vector>

struct Line { std::string name; double price; };

class Order {                                  // data and invariants only
 public:
  void add(std::string name, double price) { lines_.push_back({std::move(name), price}); }
  const std::vector<Line>& lines() const { return lines_; }
 private:
  std::vector<Line> lines_;
};

class DiscountPolicy {                         // pricing rules change here
 public:
  double total(const Order& o) const {
    double t = 0;
    for (const auto& l : o.lines()) t += l.price;
    return t > 100 ? t * 0.9 : t;
  }
};

class ReceiptPrinter {                         // wording and format change here
 public:
  explicit ReceiptPrinter(const DiscountPolicy& p) : policy_(p) {}
  void print(const Order& o, std::ostream& out) const {
    for (const auto& l : o.lines()) out << l.name << " " << l.price << "\\n";
    out << "total " << policy_.total(o) << "\\n";
  }
 private:
  const DiscountPolicy& policy_;
};`,
    interview: "Interviewers listen for the *actors*: \"Pricing is owned by finance, the receipt by support, so they change independently.\" Name the axis of change out loud before you split. Candidates who split first and justify later look like they are pattern-matching.",
    overApply: "Splitting by method count produces dozens of one-method classes that must all be wired together, with the real logic scattered across files. If two pieces always change together, keeping them in one class is correct. Split when you can name two different reasons to change, not before.",
  },
  {
    id: "ocp",
    title: "OCP: extend without editing",
    topic: "L2.ocp",
    summary: "Put the likely-to-change part behind an interface, so a new case is a new class.",
    smell: "A growing `switch` or `if/else` chain on a type tag, repeated in several functions. Each new variant means hunting down every switch.",
    idea: "Code is **open for extension** when new behaviour arrives as new code, and **closed for modification** when the tested core stays untouched. The mechanism in C++ is usually an abstract class (or a template parameter) at the point where variation is expected. OCP is a bet about where change will come from; a Change Storm is exactly that bet being tested.",
    before: `#include <string>

class ShippingCalculator {
 public:
  double cost(const std::string& method, double kg) const {
    if (method == "ground") return 5 + kg * 0.5;
    if (method == "air") return 12 + kg * 2.0;
    return -1;                                  // every new method edits this function
  }
};`,
    after: `#include <memory>
#include <vector>

class ShippingMethod {
 public:
  virtual ~ShippingMethod() = default;
  virtual double cost(double kg) const = 0;
};

class Ground final : public ShippingMethod {
 public:
  double cost(double kg) const override { return 5 + kg * 0.5; }
};

class Air final : public ShippingMethod {
 public:
  double cost(double kg) const override { return 12 + kg * 2.0; }
};

// A new method (say Drone) is a new class; this function never changes.
double cheapest(const std::vector<std::unique_ptr<ShippingMethod>>& ms, double kg) {
  double best = ms.front()->cost(kg);
  for (const auto& m : ms) best = m->cost(kg) < best ? m->cost(kg) : best;
  return best;
}`,
    interview: "Say what you expect to vary and why (\"carriers come and go, so shipping is the extension point\"). Then show the new case being added without touching existing code. Saying \"I would not abstract the tax rate: it has changed once in ten years\" is a senior signal.",
    overApply: "An interface per class, built before a second implementation exists, is speculative generality: more files, indirection and virtual calls for variation that never comes. Wait for the second case (the rule of three), or for a requirement that clearly signals it. A `switch` over a closed set, for example a protocol with four fixed message types, is fine, and `std::variant` can even make it exhaustive.",
  },
  {
    id: "lsp",
    title: "LSP: substitutes keep the contract",
    topic: "L2.lsp",
    summary: "A subclass may require less and promise more, never the reverse.",
    smell: "Overrides that throw \"not supported\", callers that check the dynamic type before calling, subclasses that silently ignore an argument, or `Square : Rectangle`.",
    idea: "Think in **contracts**. A base class promises preconditions (what callers must provide), postconditions (what it guarantees) and invariants (always true). A subtype may weaken preconditions and strengthen postconditions. `Square::setWidth` also changing the height breaks the postcondition \"height is unchanged\" that `Rectangle` users rely on. The fix is usually to remove the claimed is-a relationship, not to patch the override.",
    before: `class Rectangle {
 public:
  virtual ~Rectangle() = default;
  virtual void setWidth(int w) { w_ = w; }
  virtual void setHeight(int h) { h_ = h; }
  int area() const { return w_ * h_; }
 protected:
  int w_ = 0, h_ = 0;
};

class Square : public Rectangle {              // breaks "setWidth leaves height alone"
 public:
  void setWidth(int w) override { w_ = h_ = w; }
  void setHeight(int h) override { w_ = h_ = h; }
};`,
    after: `class Shape {
 public:
  virtual ~Shape() = default;
  virtual int area() const = 0;                // the contract every shape can honour
};

class Rectangle final : public Shape {
 public:
  Rectangle(int w, int h) : w_(w), h_(h) {}
  int area() const override { return w_ * h_; }
 private:
  int w_, h_;
};

class Square final : public Shape {            // immutable value types: no setter contract to break
 public:
  explicit Square(int side) : side_(side) {}
  int area() const override { return side_ * side_; }
 private:
  int side_;
};`,
    interview: "Quote the rule as \"a caller written against the base must keep working\". If you spot an override that throws or a `dynamic_cast` in a caller, name it as an LSP violation and offer two fixes: split the interface, or drop inheritance for composition.",
    overApply: "Treating every behavioural difference as a violation leads to flat, featureless hierarchies. Subtypes may add behaviour and may differ in unspecified details. The test is the *documented* contract, so write the contract down (even as a comment) before judging the subclass.",
  },
  {
    id: "isp",
    title: "ISP: small, client-shaped interfaces",
    topic: "L2.isp",
    summary: "No client should depend on methods it does not call.",
    smell: "Implementations full of empty or throwing methods, mocks that need ten stubs for a one-method use, or a change to one method forcing recompilation of unrelated clients.",
    idea: "Shape interfaces around what **clients need**, not what implementers can do. A fat interface couples every client to every method. In C++ this also costs build time, since each change to the header recompiles all includers. Small role interfaces can still be implemented by one class through multiple inheritance.",
    before: `class Machine {
 public:
  virtual ~Machine() = default;
  virtual void print() = 0;
  virtual void scan() = 0;
  virtual void fax() = 0;
};

class BasicPrinter : public Machine {
 public:
  void print() override {}
  void scan() override { throw 1; }            // forced to lie
  void fax() override { throw 1; }
};`,
    after: `class Printer {
 public:
  virtual ~Printer() = default;
  virtual void print() = 0;
};

class Scanner {
 public:
  virtual ~Scanner() = default;
  virtual void scan() = 0;
};

class BasicPrinter final : public Printer {
 public:
  void print() override {}
};

class OfficeMachine final : public Printer, public Scanner {
 public:
  void print() override {}
  void scan() override {}
};`,
    interview: "Tie it to a concrete pain: \"the report job only needs `read`, so it should not see `write` and `delete`\". It also makes testing cheaper, because a one-method fake is trivial.",
    overApply: "One interface per method is as bad as a god interface: clients need three of them and the names stop meaning anything. Group methods that clients use together. Start with roles that you can name in the domain (`Reader`, `Notifier`).",
  },
  {
    id: "dip",
    title: "DIP: depend on abstractions you own",
    topic: "L2.dip",
    summary: "High-level policy should not construct its own low-level details.",
    smell: "`new SmtpClient()` or a global singleton inside business logic, tests that need the network, and a policy class that includes a vendor header.",
    idea: "Policy code (what to do) should depend on an interface it defines. Detail code (how) implements that interface. The detail is handed in from outside, typically through the constructor, which is **dependency injection**. Ownership matters in C++: take a `std::unique_ptr` if the class owns the dependency, or a reference/`shared_ptr` if it borrows or shares it, and make the lifetime visible in the signature.",
    before: `#include <iostream>
#include <string>

class SmtpClient {
 public:
  void send(const std::string& to, const std::string& body) { std::cout << to << body; }
};

class Reminder {
 public:
  void remind(const std::string& user) {
    SmtpClient smtp;                           // hard-wired detail, untestable
    smtp.send(user, "pay up");
  }
};`,
    after: `#include <memory>
#include <string>
#include <utility>

class Notifier {                               // owned by the policy side
 public:
  virtual ~Notifier() = default;
  virtual void notify(const std::string& to, const std::string& body) = 0;
};

class Reminder {
 public:
  explicit Reminder(std::unique_ptr<Notifier> n) : notifier_(std::move(n)) {}
  void remind(const std::string& user) { notifier_->notify(user, "pay up"); }
 private:
  std::unique_ptr<Notifier> notifier_;
};

class SmtpNotifier final : public Notifier {   // detail, swapped freely and faked in tests
 public:
  void notify(const std::string&, const std::string&) override {}
};`,
    interview: "Show the seam: \"`Reminder` takes a `Notifier`, so email, SMS and a test fake are interchangeable, and `main` is the only place that knows the concrete type.\" Mention constructor injection over setters so the object is never half-built.",
    overApply: "Wrapping every standard-library call or stable value type in an interface is noise. Inject things that do I/O, vary by environment or are slow, random or non-deterministic (clocks, network, storage). A DI framework in a 90-minute round is almost never worth it: plain constructors are enough.",
  },
  {
    id: "heuristics",
    title: "Heuristics: DRY, KISS, YAGNI, Demeter, composition",
    topic: "L2.heuristics",
    summary: "The small rules that stop SOLID turning into over-engineering.",
    smell: "Copy-pasted rules that drift apart, three layers where one would do, features nobody asked for, and chains like `a.b().c().d()` that reach through objects.",
    idea: "**DRY**: one source of truth for each *piece of knowledge* (accidental similarity is not duplication). **KISS** and **YAGNI** push back on SOLID: build the simplest thing that meets the stated requirements and clear extension points. **Law of Demeter**: talk to your direct collaborators, and **tell, don't ask**: tell an object what to do instead of pulling its state out and deciding for it. **Prefer composition** to inheritance unless there is a true is-a with a shared contract.",
    before: `#include <string>

struct Address { std::string city; };
struct Customer { Address address; };
struct Order { Customer customer; };

// Reaches through three objects: breaks if any shape changes.
bool isLocal(const Order& o) { return o.customer.address.city == "Pune"; }`,
    after: `#include <string>

class Customer {
 public:
  explicit Customer(std::string city) : city_(std::move(city)) {}
  bool livesIn(const std::string& city) const { return city_ == city; }   // tell, don't ask
 private:
  std::string city_;
};

class Order {
 public:
  explicit Order(Customer c) : customer_(std::move(c)) {}
  bool shipsTo(const std::string& city) const { return customer_.livesIn(city); }
 private:
  Customer customer_;
};`,
    interview: "Use these as the brakes. When the interviewer asks \"would you add a plugin system?\", the senior answer is \"not until a second consumer exists; here is the seam that would let us\". State the cost of the extra abstraction, not just its benefit.",
    overApply: "Demeter applied mechanically gives piles of forwarding methods, and value-type data structures (a plain `struct Point`) are fine to read through. DRY applied to coincidental similarity couples unrelated features. Judge by what would change together.",
  },
];

export function getLesson(id: string): Lesson | undefined {
  return SOLID_LESSONS.find((l) => l.id === id);
}
