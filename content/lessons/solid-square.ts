import type { Lesson } from "@/lib/lessons/model";

/**
 * SOLID Square lessons (CURRICULUM L2). Original wording. Every `before`/`after` program is compiled and run
 * natively by content:verify, and every `after` must pass Senior Review with no blocker or major.
 */
export const SOLID_SQUARE_LESSONS: Lesson[] = [
  {
    id: "srp",
    level: "L2",
    title: "Single Responsibility: one reason to change",
    oneLiner: "A class should answer to one actor: if two different teams can force edits to it, split it.",
    cardTopic: "L2.srp",
    intro: `SRP is about **axes of change**, not method counts. Ask: who would ask me to edit this class? If finance, the reporting team and the storage team all do, three unrelated reasons share one file, and each team can break the others.

Cohesion is the practical test: do the fields and methods change together? If half the fields are used by half the methods, you probably have two classes wearing one coat.`,
    smell: `- A class name ending in \`Manager\`, \`Helper\` or \`Processor\` that does calculation, formatting and I/O.
- Methods that touch disjoint subsets of the fields.
- A change to the report layout forces a retest of the tax maths.
- Unit tests need a database or a console just to check an arithmetic rule.`,
    before: `#include <iostream>
#include <string>
#include <vector>

// One class, three reasons to change: pricing rules, text layout, and where output goes.
class Invoice {
public:
    void addLine(const std::string& name, int cents) { names_.push_back(name); cents_.push_back(cents); }
    int totalCents() const {
        int sum = 0;
        for (int c : cents_) sum += c;
        return sum + sum / 10;  // 10% tax baked in
    }
    void print() const {
        for (size_t i = 0; i < names_.size(); ++i) std::cout << names_[i] << ": " << cents_[i] << "\\n";
        std::cout << "total: " << totalCents() << "\\n";  // layout and destination fixed here
    }
private:
    std::vector<std::string> names_;
    std::vector<int> cents_;
};

int main() {
    Invoice inv;
    inv.addLine("pen", 200);
    inv.addLine("book", 1000);
    inv.print();
}
`,
    after: `#include <iostream>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

struct Line {
    std::string name;
    int cents;
};

// Reason to change 1: the pricing rules.
class Invoice {
public:
    void addLine(std::string name, int cents) { lines_.push_back({std::move(name), cents}); }
    int totalCents() const {
        int sum = 0;
        for (const Line& l : lines_) sum += l.cents;
        return sum + sum / 10;
    }
    const std::vector<Line>& lines() const { return lines_; }
private:
    std::vector<Line> lines_;
};

// Reason to change 2: the text layout. Pure function of the invoice, no I/O.
class InvoiceFormatter {
public:
    std::string format(const Invoice& inv) const {
        std::ostringstream out;
        for (const Line& l : inv.lines()) out << l.name << ": " << l.cents << "\\n";
        out << "total: " << inv.totalCents() << "\\n";
        return out.str();
    }
};

// Reason to change 3: where the text goes. The caller chooses; tests can pass a stringstream.
void write(std::ostream& os, const std::string& text) { os << text; }

int main() {
    Invoice inv;
    inv.addLine("pen", 200);
    inv.addLine("book", 1000);
    write(std::cout, InvoiceFormatter().format(inv));
}
`,
    beforeOutput: "pen: 200\nbook: 1000\ntotal: 1320",
    afterOutput: "pen: 200\nbook: 1000\ntotal: 1320",
    refactorNotes: `The arithmetic, the layout and the destination now change independently. The tax rule is testable with no stream at all, and a JSON formatter is a new class instead of an edit to \`Invoice\`.

**Trade-off:** three small types are more to navigate than one. For a 40-line script that never grows, the original is fine. Split when you can name two different people who would ask for edits.`,
    interviewSignal: `Say the actor out loud: "this class changes when finance changes tax, and when design changes the receipt, so I'll separate them". Interviewers at SDE II look for you naming the reason to change, not reciting the acronym. At Senior and above, also say what you did **not** split and why.`,
    overApplication: `Splitting by method count produces dozens of one-method classes that all have to be wired together, which spreads one change across many files (shotgun surgery) and makes the flow hard to read. If two pieces always change together, they are one responsibility; keep them together.`,
  },
  {
    id: "ocp",
    level: "L2",
    title: "Open/Closed: extend without editing",
    oneLiner: "Add behaviour by adding code, not by reopening code that already works.",
    cardTopic: "L2.ocp",
    intro: `A module is **open for extension** when new behaviour can be plugged in, and **closed for modification** when plugging it in does not edit tested code. In C++ the usual tool is an abstract interface with a virtual destructor; the alternatives are templates (compile-time, no virtual call) and \`std::function\`.

This is exactly what a Change Storm measures: a new requirement arrives, and your score depends on how many existing files you must touch.`,
    smell: `- A \`switch\` or \`if/else\` chain on a type tag or enum that grows with every feature.
- The same enum switch repeated in several functions.
- Adding a variant means editing pricing, logging and serialisation code.`,
    before: `#include <iostream>

enum class Customer { Regular, Student };

// Every new customer type reopens this function.
int priceCents(Customer c, int base) {
    switch (c) {
        case Customer::Regular: return base;
        case Customer::Student: return base - base / 5;
    }
    return base;
}

int main() {
    std::cout << priceCents(Customer::Regular, 1000) << " " << priceCents(Customer::Student, 1000) << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>

class DiscountPolicy {
public:
    virtual ~DiscountPolicy() = default;
    virtual int apply(int baseCents) const = 0;
};

class NoDiscount : public DiscountPolicy {
public:
    int apply(int baseCents) const override { return baseCents; }
};

class PercentOff : public DiscountPolicy {
public:
    explicit PercentOff(int percent) : percent_(percent) {}
    int apply(int baseCents) const override { return baseCents - baseCents * percent_ / 100; }
private:
    int percent_;
};

// Closed: never edited for a new discount.
int priceCents(const DiscountPolicy& policy, int base) { return policy.apply(base); }

int main() {
    std::unique_ptr<DiscountPolicy> regular = std::make_unique<NoDiscount>();
    std::unique_ptr<DiscountPolicy> student = std::make_unique<PercentOff>(20);
    std::cout << priceCents(*regular, 1000) << " " << priceCents(*student, 1000) << "\\n";
}
`,
    beforeOutput: "1000 800",
    afterOutput: "1000 800",
    refactorNotes: `A new discount is a new class (\`PercentOff\`, \`BuyTwoGetOne\`, ...) and \`priceCents\` is untouched. The seam is the \`DiscountPolicy\` interface.

**Trade-off:** you can only be closed against the axis you predicted. If requirements instead add a new operation across a fixed set of types (price, tax, export), the switch (or \`std::variant\` + \`std::visit\`) is easier to extend, because you add one function rather than editing every class. This is the expression problem; neither side is free.`,
    interviewSignal: `Name the axis of variation before you design: "discount rules will vary, so that is my seam". Then show one new rule added with zero edits to existing code. Seniors are expected to say where the design is **not** open and why that is acceptable.`,
    overApplication: `Putting an interface in front of every class "just in case" is speculative generality: more indirection, more files, and the guessed axis is usually the wrong one. Wait for the second variant (rule of three), then introduce the seam. A closed, stable \`switch\` over a truly fixed set is fine.`,
  },
  {
    id: "lsp",
    level: "L2",
    title: "Liskov Substitution: honour the contract",
    oneLiner: "A subtype must keep every promise its base type makes, so callers never need to know which one they hold.",
    cardTopic: "L2.lsp",
    intro: `Substitutability is about **contracts**, not syntax. A derived class may **weaken preconditions** (accept more) and **strengthen postconditions** (promise more), and must preserve the base's **invariants**. If code written against \`Base&\` can be broken by passing a \`Derived\`, inheritance was the wrong tool.

The classic trap: a mutable \`Square\` derived from \`Rectangle\`. Geometrically a square is a rectangle, but \`Rectangle\` promises "setting the width leaves the height alone", and \`Square\` cannot keep that promise.`,
    smell: `- An override that throws \`not supported\` or silently does nothing.
- Callers that check \`dynamic_cast\` or a type tag before calling a base method.
- A derived class that tightens an argument range the base accepted.
- Documentation that says "except for subclass X".`,
    before: `#include <iostream>

class Rectangle {
public:
    virtual ~Rectangle() = default;
    virtual void setWidth(int w) { w_ = w; }
    virtual void setHeight(int h) { h_ = h; }
    int area() const { return w_ * h_; }
protected:
    int w_ = 0;
    int h_ = 0;
};

// Breaks Rectangle's promise that width and height are independent.
class Square : public Rectangle {
public:
    void setWidth(int w) override { w_ = h_ = w; }
    void setHeight(int h) override { w_ = h_ = h; }
};

int stretchTo2x3(Rectangle& r) {
    r.setWidth(2);
    r.setHeight(3);
    return r.area();  // callers expect 6
}

int main() {
    Rectangle r;
    Square s;
    std::cout << stretchTo2x3(r) << " " << stretchTo2x3(s) << "\\n";
}
`,
    after: `#include <iostream>

// No inheritance between them: each type states its own contract.
class Shape {
public:
    virtual ~Shape() = default;
    virtual int area() const = 0;
};

class Rectangle : public Shape {
public:
    Rectangle(int w, int h) : w_(w), h_(h) {}
    int area() const override { return w_ * h_; }
private:
    int w_;
    int h_;
};

class Square : public Shape {
public:
    explicit Square(int side) : side_(side) {}
    int area() const override { return side_ * side_; }
private:
    int side_;
};

// Immutable values: callers build new shapes instead of mutating through a base reference.
int main() {
    Rectangle r(2, 3);
    Square s(3);
    std::cout << r.area() << " " << s.area() << "\\n";
}
`,
    beforeOutput: "6 9",
    afterOutput: "6 9",
    refactorNotes: `The mutation that made the hierarchy unsound is gone: shapes are immutable, so there is no "set one dimension" promise to break. Both types satisfy the one contract they really share, \`area()\`.

**Trade-off:** immutability means "resize" produces a new object. If you truly need mutation, keep \`Rectangle\` and \`Square\` as separate unrelated classes, or model \`Square\` as a \`Rectangle\` factory function, not a subtype.`,
    interviewSignal: `Phrase it as a contract check: "can every caller of the base type survive this subtype?". Naming preconditions, postconditions and invariants unprompted is a clear SDE II to Senior signal. Spotting an LSP break in the candidate's own hierarchy mid-interview and fixing it is a strong one.`,
    overApplication: `Treating every inheritance relationship as suspect leads to avoiding polymorphism you genuinely need. The rule bites on behavioural subtyping; sharing code between related types is better done with composition, and a base class with a well-defined contract and a few overrides is fine.`,
  },
  {
    id: "isp",
    level: "L2",
    title: "Interface Segregation: small, role-shaped interfaces",
    oneLiner: "No client should depend on methods it does not use; split fat interfaces by role.",
    cardTopic: "L2.isp",
    intro: `A fat interface couples every implementer and every client to the union of all roles. Implementers are forced to write stubs; clients get a recompile whenever an unrelated method changes.

Segregate by **client need**: the code that reads a document wants \`Readable\`; the code that saves one wants \`Writable\`. A concrete class may implement several small interfaces.`,
    smell: `- Overrides that are empty, return a dummy value, or throw \`unsupported\`.
- A mock in tests with twenty methods when the test uses two.
- A change to one method forces unrelated implementers to recompile.`,
    before: `#include <iostream>
#include <stdexcept>

class Storage {
public:
    virtual ~Storage() = default;
    virtual int read() const = 0;
    virtual void write(int v) = 0;
    virtual void erase() = 0;
};

// A read-only snapshot is forced to fake the mutators.
class Snapshot : public Storage {
public:
    explicit Snapshot(int v) : v_(v) {}
    int read() const override { return v_; }
    void write(int) override { throw std::logic_error("read-only"); }
    void erase() override { throw std::logic_error("read-only"); }
private:
    int v_;
};

int show(const Storage& s) { return s.read(); }

int main() {
    Snapshot s(7);
    std::cout << show(s) << "\\n";
}
`,
    after: `#include <iostream>

class Reader {
public:
    virtual ~Reader() = default;
    virtual int read() const = 0;
};

class Writer {
public:
    virtual ~Writer() = default;
    virtual void write(int v) = 0;
};

class Snapshot : public Reader {
public:
    explicit Snapshot(int v) : v_(v) {}
    int read() const override { return v_; }
private:
    int v_;
};

class Cell : public Reader, public Writer {
public:
    int read() const override { return v_; }
    void write(int v) override { v_ = v; }
private:
    int v_ = 0;
};

// Depends only on the role it needs.
int show(const Reader& r) { return r.read(); }

int main() {
    Snapshot snap(7);
    Cell cell;
    cell.write(9);
    std::cout << show(snap) << " " << show(cell) << "\\n";
}
`,
    beforeOutput: "7",
    afterOutput: "7 9",
    refactorNotes: `\`Snapshot\` no longer promises mutation it cannot deliver, so the "throws at runtime" trap is a compile error instead. \`Cell\` implements both roles through multiple inheritance of **pure interfaces**, which is safe in C++ because neither base carries state.

**Trade-off:** more names to learn, and a function needing both roles takes two parameters or a combined interface. Combine roles only where a real client needs them together.`,
    interviewSignal: `Frame it by the client: "the checkout code only needs to charge, so it takes a \`Charger\`". Interviewers listen for roles named after what callers need, and for test doubles that stay tiny as a result.`,
    overApplication: `One interface per method (a "role" with a single function) fragments the design and pushes assembly work onto every caller. If every client uses the same three methods together, one interface with three methods is the right granularity.`,
  },
  {
    id: "dip",
    level: "L2",
    title: "Dependency Inversion: depend on abstractions you own",
    oneLiner: "High-level policy should not construct or know low-level details; both depend on an interface the policy owns.",
    cardTopic: "L2.dip",
    intro: `When \`OrderService\` creates its own \`SmtpMailer\`, you cannot test the service without a mail server, and you cannot change the transport without editing the service. Invert it: the service declares the interface it needs (\`Notifier\`), and the concrete detail is handed in, typically through the **constructor**.

Dependency injection is the mechanism; dependency inversion is the design rule that the abstraction belongs to the high-level module.`,
    smell: `- \`new\` or a concrete member of an I/O class inside business logic.
- Business logic that includes a driver or client header.
- Tests that need the network, a clock or the file system.
- A singleton reached from deep inside a method.`,
    before: `#include <iostream>
#include <string>

class ConsoleMailer {
public:
    void send(const std::string& msg) const { std::cout << "mail: " << msg << "\\n"; }
};

// Welded to ConsoleMailer: cannot test without printing, cannot swap the transport.
class OrderService {
public:
    void place(const std::string& item) const { mailer_.send("ordered " + item); }
private:
    ConsoleMailer mailer_;
};

int main() {
    OrderService svc;
    svc.place("pen");
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

// Owned by the high-level module: expressed in its own vocabulary.
class Notifier {
public:
    virtual ~Notifier() = default;
    virtual void notify(const std::string& msg) = 0;
};

class ConsoleNotifier : public Notifier {
public:
    void notify(const std::string& msg) override { std::cout << "mail: " << msg << "\\n"; }
};

// A test double: records instead of sending.
class RecordingNotifier : public Notifier {
public:
    void notify(const std::string& msg) override { sent_.push_back(msg); }
    const std::vector<std::string>& sent() const { return sent_; }
private:
    std::vector<std::string> sent_;
};

class OrderService {
public:
    explicit OrderService(std::unique_ptr<Notifier> notifier) : notifier_(std::move(notifier)) {}
    void place(const std::string& item) { notifier_->notify("ordered " + item); }
private:
    std::unique_ptr<Notifier> notifier_;
};

int main() {
    OrderService svc(std::make_unique<ConsoleNotifier>());
    svc.place("pen");
}
`,
    beforeOutput: "mail: ordered pen",
    afterOutput: "mail: ordered pen",
    refactorNotes: `\`OrderService\` now states what it needs and owns the dependency through \`unique_ptr\`. Production wires \`ConsoleNotifier\`; tests wire \`RecordingNotifier\` and assert on \`sent()\`. Constructor injection also makes the dependency impossible to forget.

**Trade-off:** one more interface and explicit wiring in \`main\`. Use a reference (non-owning) when the caller keeps ownership, \`unique_ptr\` for exclusive ownership, and \`shared_ptr\` only for genuinely shared lifetime.`,
    interviewSignal: `"I'll inject the clock and the store through constructors so I can unit-test the rules" is the sentence that separates an SDE II from a Senior who also says where the wiring lives (a composition root) and why a global singleton would hurt.`,
    overApplication: `Wrapping every library class (\`std::string\`, \`std::vector\`) behind your own interface is noise. Invert only across a real boundary: I/O, time, randomness, external services, or a part you expect to swap. A DI framework for a 300-line program is overkill; plain constructors do the job.`,
  },
  {
    id: "heuristics",
    level: "L2",
    title: "DRY, KISS, YAGNI, Demeter and tell-don't-ask",
    oneLiner: "Cheap rules that stop designs from rotting: one source of truth, no speculation, short dependency chains, behaviour next to data.",
    cardTopic: "L2.demeter",
    intro: `These heuristics are weaker than the SOLID principles and often pull against each other, so treat them as prompts to think, not laws.

- **DRY:** one source of truth for each piece of knowledge (not each piece of text).
- **KISS:** the simplest design that meets today's requirements.
- **YAGNI:** do not build for requirements you only imagine.
- **Law of Demeter:** talk to your neighbours, not their neighbours: avoid \`a.getB().getC().doIt()\`.
- **Tell, don't ask:** tell an object what to do instead of pulling out its state and deciding for it.`,
    smell: `- \`order.getCustomer().getAddress().getCity()\` chains in callers.
- Code that reads three getters and then applies a rule that belongs to that object.
- The same business rule written in two places that must stay in step.
- An abstract factory for something with one implementation.`,
    before: `#include <iostream>

class Account {
public:
    explicit Account(int balance) : balance_(balance) {}
    int getBalance() const { return balance_; }
    void setBalance(int b) { balance_ = b; }
private:
    int balance_;
};

// Asks for state, decides outside, writes it back: the rule leaks into every caller.
bool withdraw(Account& a, int amount) {
    if (a.getBalance() >= amount) {
        a.setBalance(a.getBalance() - amount);
        return true;
    }
    return false;
}

int main() {
    Account a(100);
    std::cout << withdraw(a, 70) << withdraw(a, 70) << " " << a.getBalance() << "\\n";
}
`,
    after: `#include <iostream>

class Account {
public:
    explicit Account(int balance) : balance_(balance) {}
    // The rule lives with the data it protects.
    bool withdraw(int amount) {
        if (amount > balance_) return false;
        balance_ -= amount;
        return true;
    }
    int balance() const { return balance_; }
private:
    int balance_;
};

int main() {
    Account a(100);
    std::cout << a.withdraw(70) << a.withdraw(70) << " " << a.balance() << "\\n";
}
`,
    beforeOutput: "10 30",
    afterOutput: "10 30",
    refactorNotes: `The overdraft rule exists once, inside \`Account\`, so no caller can forget it and the balance can no longer be set to an arbitrary value. This is tell-don't-ask and DRY at once: one source of truth for "can we withdraw".

**Trade-off:** keep plain data carriers (DTOs, config) as simple structs. Tell-don't-ask applies to objects with behaviour and invariants, not to every record.`,
    interviewSignal: `Use these as one-line justifications while coding: "I'll keep the rule inside \`Account\` so there's one place to change" or "I'm not adding a factory yet, there's one implementation (YAGNI)". Contradicting yourself (an interface for everything, yet claiming YAGNI) is a common red flag.`,
    overApplication: `DRY applied to coincidental similarity couples unrelated features: two functions that look alike but change for different reasons should stay separate (a little duplication is cheaper than the wrong abstraction). Demeter applied mechanically creates piles of one-line forwarding methods; stop when a chain crosses a stable value type like \`std::string\`.`,
  },
];
