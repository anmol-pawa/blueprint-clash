import type { Card } from "@/lib/battle/cards";

/**
 * Smell cards for Provost Marlow's last phase. Each shows a short C++ fragment and asks for the smell plus the
 * principle it strains, or the right trade-off. Original wording; the wrong options are the tempting neighbours,
 * and two cards test over-application (the senior signal) rather than a violation.
 */
export const SOLID_SQUARE_MASTER_SMELLS: Card[] = [
  {
    id: "ssm-smell-two-actors",
    kind: "smell",
    topic: "L2.srp",
    level: 2,
    prompt: "Payroll and the tax office both ask for edits to this class. Name the smell and the first refactor.",
    code: `class Employee {
 public:
  Money pay() const;            // used by payroll
  Money taxableAmount() const;  // used by the tax office
 private:
  Money regularHours() const;   // shared by both
};`,
    options: [
      "Two actors share one class and a helper; SRP. Split the policies and keep the shared data in a plain type each calls",
      "Feature envy; move both methods into Money",
      "Missing const on the data members; make everything immutable",
      "Interface bloat; add an IEmployee interface with both methods",
    ],
    answer: [0],
    explain:
      "A change for payroll to regularHours() silently changes the tax figure. That is the SRP failure: two axes of change in one class, joined by a shared helper. Move each calculation to its own class that reads the same Employee data. An interface would not separate the actors; it would only rename the coupling.",
  },
  {
    id: "ssm-smell-type-switch",
    kind: "smell",
    topic: "L2.ocp",
    level: 2,
    prompt: "A new payment method arrives every quarter. Name the smell.",
    code: `double fee(const Payment& p) {
  switch (p.kind) {
    case Kind::Card:   return p.amount * 0.029 + 0.30;
    case Kind::Bank:   return 0.80;
    case Kind::Wallet: return p.amount * 0.015;
  }
  return 0;
}`,
    options: [
      "A switch on a type tag that every new kind must edit; Open/Closed. Give each kind a FeeRule object behind one interface",
      "Magic numbers; the only problem is the missing constants",
      "Dependency Inversion; inject the amount instead of reading it",
      "Liskov Substitution; Card must not be a subtype of Payment",
    ],
    answer: [0],
    explain:
      "Every quarter this function is reopened and every switch like it elsewhere must be found. A rule per kind behind an interface makes adding a kind an addition, not an edit. The honest cost: if kinds are stable and operations keep growing, a switch or std::variant with visit is the better axis. Open/Closed is a bet on which axis changes.",
  },
  {
    id: "ssm-smell-throwing-override",
    kind: "smell",
    topic: "L2.lsp",
    level: 2,
    prompt: "Which rule does this override break?",
    code: `class Stack {
 public:
  virtual ~Stack() = default;
  virtual void push(int v) { items_.push_back(v); }
 protected:
  std::vector<int> items_;
};

class FullStack : public Stack {
 public:
  void push(int v) override {
    if (items_.size() >= 8) throw std::length_error("full");
    Stack::push(v);
  }
};`,
    options: [
      "Strengthened precondition: callers of Stack::push never expected a failure, so code written against Stack breaks",
      "Weakened postcondition: push now accepts too many values",
      "History constraint: items_ should be private",
      "None; throwing is always allowed in an override",
    ],
    answer: [0],
    explain:
      "The base contract has no failure path, so the derived type demands more from callers (room must exist). Fix the contract, not the override: make capacity part of the base interface (a bool or an error return) or make the bounded type a separate abstraction. 'It compiles and the types match' is exactly what LSP says is not enough.",
  },
  {
    id: "ssm-smell-fat-interface",
    kind: "smell",
    topic: "L2.isp",
    level: 2,
    prompt: "A read-only report class implements this interface. What is the smell?",
    code: `class Storage {
 public:
  virtual ~Storage() = default;
  virtual std::string read(const std::string& key) const = 0;
  virtual void write(const std::string& key, const std::string& v) = 0;
  virtual void erase(const std::string& key) = 0;
};

class ReportStorage : public Storage {
  void write(const std::string&, const std::string&) override { throw std::logic_error("read-only"); }
  void erase(const std::string&) override { throw std::logic_error("read-only"); }
  // read() implemented
};`,
    options: [
      "A fat interface forcing stub methods that throw; ISP. Split into a Reader and a Writer role the client actually needs",
      "Single Responsibility; Storage should only have one method",
      "Open/Closed; add a virtual method for every future operation",
      "No smell; throwing from unsupported methods is the standard solution",
    ],
    answer: [0],
    explain:
      "Methods that exist only to throw tell you the interface bundles roles. Clients that only read should depend on a Reader; a type that does both implements both. This also removes an LSP problem hiding in the throwing stubs.",
  },
  {
    id: "ssm-smell-new-in-ctor",
    kind: "smell",
    topic: "L2.dip",
    level: 2,
    prompt: "You cannot unit-test this without sending real email. Name the smell and the fix.",
    code: `class SignupService {
 public:
  SignupService() : mailer_(new SmtpMailer("mail.example.com")) {}
  ~SignupService() { delete mailer_; }
  void signup(const User& u) { mailer_->send(u.email(), "welcome"); }
 private:
  SmtpMailer* mailer_;
};`,
    options: [
      "High-level policy constructs a concrete detail (and owns it by hand); DIP. Take a Mailer& or unique_ptr<Mailer> through the constructor",
      "Open/Closed; the class should be a template over the mailer type",
      "Law of Demeter; signup chains two calls",
      "The only issue is the raw delete; switch to shared_ptr<SmtpMailer>",
    ],
    answer: [0],
    explain:
      "The policy ('welcome new users') depends on SMTP and the host name, so a test cannot swap it. Define an abstract Mailer the service owns, and inject an implementation. Passing it as unique_ptr<Mailer> also fixes the manual delete and copy hazards, but replacing the delete alone leaves the dependency exactly where it was.",
  },
  {
    id: "ssm-smell-ask-dont-tell",
    kind: "smell",
    topic: "L2.heuristics",
    level: 2,
    prompt: "Name the smell in the caller.",
    code: `if (order.customer().account().balance() >= order.total()) {
  order.customer().account().debit(order.total());
  order.markPaid();
}`,
    options: [
      "Reaching through a chain and deciding for the object; Law of Demeter / tell, don't ask. Ask the customer to pay the order",
      "Premature optimisation; cache the balance in a local",
      "Dependency Inversion; the Account should be an interface",
      "Liskov Substitution; markPaid must be virtual",
    ],
    answer: [0],
    explain:
      "The caller knows the structure Order → Customer → Account and re-implements the 'enough funds' rule that belongs to the account. Tell the owner what you want (customer.pay(order)) and let it enforce its own invariant, which also removes a check-then-act gap.",
  },
  {
    id: "ssm-smell-speculative-interface",
    kind: "smell",
    topic: "L2.heuristics",
    level: 3,
    prompt: "Review this pull request. What is the most accurate comment?",
    code: `class IClock { public: virtual ~IClock() = default; virtual long now() const = 0; };
class SystemClock : public IClock { public: long now() const override; };

class IClockFactory { public: virtual ~IClockFactory() = default; virtual std::unique_ptr<IClock> make() const = 0; };
class SystemClockFactory : public IClockFactory { /* returns SystemClock */ };

// Only caller:
Session s(SystemClockFactory().make());`,
    options: [
      "IClock earns its place if tests need a fake time, but the factory has a single implementation and a single caller: speculative generality (YAGNI)",
      "Both interfaces are required by Dependency Inversion, so approve",
      "Remove IClock and the factory and call std::time directly everywhere",
      "Make SystemClock a singleton so no factory is needed",
    ],
    answer: [0],
    explain:
      "A clock seam is usually worth it: it makes expiry logic testable. A factory for that clock, with no second implementation and no caller that needs a fresh one, adds files and indirection and removes no coupling. Principles justify a seam when it has a second user; this review separates the useful abstraction from the decorative one. Singletons and global time calls make the testing problem worse.",
  },
  {
    id: "ssm-smell-inheritance-for-reuse",
    kind: "smell",
    topic: "L2.heuristics",
    level: 3,
    prompt: "What is the design smell, and which is the better shape?",
    code: `class Logger {
 public:
  void log(const std::string& s);
  void setLevel(int level);
  void rotateFiles();
};

class OrderService : public Logger {   // "so I can call log()"
 public:
  void place(const Order& o) { log("placing"); }
};`,
    options: [
      "Inheritance used for code reuse, not an is-a relationship; prefer composition: OrderService holds a Logger (or a narrow LogSink&)",
      "Missing virtual destructor on Logger; add one and the design is fine",
      "OrderService should inherit privately from Logger and be done",
      "Logger must be a singleton so every class can derive from it",
    ],
    answer: [0],
    explain:
      "An OrderService is not a Logger, yet clients can now call rotateFiles() on it and any Logger change leaks into the service's public face. Hold the dependency instead, ideally through the narrow interface the service uses. Private inheritance can model 'implemented in terms of' but gives you the coupling without the substitution, so composition is the default.",
  },
];
