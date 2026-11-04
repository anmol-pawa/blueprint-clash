import type { Card } from "@/lib/battle/cards";

/**
 * Smell cards for Foreman Corvo's last phase. Each shows a short C++ fragment and asks for the smell, the cost, or
 * the right call. Original wording; the wrong options are the tempting neighbours, and two cards test restraint
 * (a pattern that is not earned) rather than a violation.
 */
export const CREATIONAL_FOUNDRY_MASTER_SMELLS: Card[] = [
  {
    id: "cfm-smell-telescoping",
    kind: "smell",
    topic: "L3.builder",
    level: 2,
    prompt: "Callers keep passing the wrong argument in the wrong slot. Name the smell and the usual fix.",
    code: `class Request {
 public:
  Request(std::string url, std::string method, int timeoutMs,
          bool followRedirects, int retries, std::string body);
};
Request r("https://x.test", "POST", 5000, true, 0, "{}");`,
    options: [
      "A long positional constructor with same-typed parameters; use a builder (or a named options struct) and validate in build()",
      "Missing virtual destructor; make Request polymorphic",
      "A singleton is missing; share one Request everywhere",
      "Feature envy; move the fields into std::tuple",
    ],
    answer: [0],
    explain:
      "Six positional parameters, two bools or ints that look alike, and no names at the call site: the compiler cannot catch a swapped timeout and retry count. A builder gives each value a name and a place to check invariants once. For a handful of optional fields a plain options struct with designated initialisers is the lighter fix, so say which you would pick and why.",
  },
  {
    id: "cfm-smell-global-clock",
    kind: "smell",
    topic: "L3.singleton",
    level: 2,
    prompt: "This test passes on its own and fails in the full suite. What is the root cause?",
    code: `class Config {
 public:
  static Config& instance() { static Config c; return c; }
  void set(const std::string& k, std::string v) { values_[k] = std::move(v); }
  std::string get(const std::string& k) const { return values_.at(k); }
 private:
  std::map<std::string, std::string> values_;
};
TEST(Fee, UsesRate) { Config::instance().set("rate", "5"); /* ... */ }
TEST(Fee, Default)  { /* expects rate unset */ }`,
    options: [
      "Hidden mutable global state survives between tests; inject a Config reference so each test builds its own",
      "The static local is not thread safe before C++11, so use a mutex",
      "std::map is unordered; switch to a hash map",
      "The tests need virtual functions to be isolated",
    ],
    answer: [0],
    explain:
      "A Meyers singleton is safe to construct, but its state lives for the whole process, so one test leaks into the next and the order of tests starts to matter. The cost of a singleton is rarely the creation; it is the hidden dependency. Pass a Config& (or an interface) into the code that needs it, and let main() own the single real instance.",
  },
  {
    id: "cfm-smell-factory-for-one",
    kind: "smell",
    topic: "L3.factory-method",
    level: 3,
    prompt: "A reviewer asks you to justify this design. What is the strongest honest answer?",
    code: `class MailerFactory {
 public:
  virtual ~MailerFactory() = default;
  virtual std::unique_ptr<Mailer> create() const = 0;
};
class SmtpMailerFactory : public MailerFactory {
 public:
  std::unique_ptr<Mailer> create() const override { return std::make_unique<SmtpMailer>(); }
};
// There is exactly one Mailer implementation, and no test double.`,
    options: [
      "It is speculative generality: with one product and no test double the factory is pure indirection. Construct it directly and add the seam when a second one is real",
      "It is correct as written; every class should be created through a factory",
      "It violates Liskov because create() returns a pointer",
      "It should be a singleton instead of a factory",
    ],
    answer: [0],
    explain:
      "Patterns are tools with a price: extra types, extra files, an extra hop when reading. A factory earns that price when creation varies or must be hidden from callers. With a single implementation and nothing to substitute in tests, you are paying for flexibility nobody uses. The senior move is to name the trigger that would justify it (a second backend, a fake in tests) and wait for it.",
  },
  {
    id: "cfm-smell-shallow-clone",
    kind: "smell",
    topic: "L3.prototype",
    level: 2,
    prompt: "Editing a copied slide changes the original. Name the bug.",
    code: `class Slide : public Node {
 public:
  std::unique_ptr<Node> clone() const override {
    auto copy = std::make_unique<Slide>();
    copy->title_ = title_;
    copy->items_ = items_;   // std::vector<Item*>, owned elsewhere
    return copy;
  }
 private:
  std::string title_;
  std::vector<Item*> items_;
};`,
    options: [
      "A shallow clone: the copy shares the same Item objects. Own the children with unique_ptr and clone each one",
      "clone() must be static, not virtual",
      "The title should be a std::string_view so it is not copied",
      "unique_ptr cannot be returned from a function",
    ],
    answer: [0],
    explain:
      "Copying a vector of raw pointers copies the addresses, not the objects, so both slides point at the same items. A prototype's whole job is to give an independent copy. Make ownership explicit (vector<unique_ptr<Item>>) and have clone() copy each child, which also makes the compiler refuse the accidental shallow copy.",
  },
  {
    id: "cfm-smell-pool-leak",
    kind: "smell",
    topic: "L3.object-pool",
    level: 3,
    prompt: "Under load the pool runs dry even though no request is still running. What is the smell?",
    code: `Buffer* BufferPool::acquire() { /* pop a free buffer */ }
void   BufferPool::release(Buffer* b) { /* push it back */ }

void handle(BufferPool& pool) {
  Buffer* b = pool.acquire();
  if (!parse(*b)) return;      // early return
  respond(*b);
  pool.release(b);
}`,
    options: [
      "Manual release on every path: an early return (or an exception) leaks the buffer. Hand out an RAII lease whose destructor returns it",
      "The pool should be a singleton so there is only one",
      "The pool should allocate a new buffer each time, so remove it",
      "release() must be virtual",
    ],
    answer: [0],
    explain:
      "Any pairing of acquire and release by hand fails on the path nobody tested. The lease type makes giving the buffer back automatic, and making it move-only stops two owners returning the same buffer. A pool is also only worth having when creation is expensive; measure before you add one.",
  },
  {
    id: "cfm-smell-family-mix",
    kind: "smell",
    topic: "L3.abstract-factory",
    level: 3,
    prompt: "The dark theme occasionally shows a light-theme checkbox. What design change prevents that class of bug?",
    code: `Button   makeButton  (Theme t);   // switches on t
Checkbox makeCheckbox(Theme t);   // switches on t
Slider   makeSlider  (Theme t);   // switches on t
void buildForm(Theme t) {
  add(makeButton(t));
  add(makeCheckbox(isDark ? Theme::Dark : Theme::Light)); // typo-prone
  add(makeSlider(t));
}`,
    options: [
      "Choose the family once: an abstract factory object per theme creates every widget, so callers cannot mix families",
      "Add a fourth switch that checks the other three agree",
      "Make Theme a global variable",
      "Replace the switches with a Builder",
    ],
    answer: [0],
    explain:
      "The invariant is that products come from one family. Scattered switches each re-decide it, so one slip breaks it. An abstract factory moves the decision to a single place (which factory object you were handed) and makes a mismatched product a type error rather than a visual bug. The price is that adding a new product kind touches every factory.",
  },
];
