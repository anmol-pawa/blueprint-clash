import type { Card } from "@/lib/battle/cards";

/**
 * Creational Foundry concept deck (CURRICULUM L3: Factory Method, Abstract Factory, Builder, Prototype,
 * Singleton, Object Pool, dependency injection). Original wording. Predict cards are compiled and run
 * natively by content:verify.
 */
export const CREATIONAL_FOUNDRY_DECK: Card[] = [
  // ---- Factory Method --------------------------------------------------
  {
    id: "cf-mcq-fm-intent",
    kind: "mcq",
    topic: "L3.factory-method",
    level: 1,
    prompt: "What is the core idea of the Factory Method pattern?",
    options: [
      "A base class calls an overridable creation function, so each subclass decides which concrete product to build",
      "A single global function with a big switch that builds every type",
      "A class that can only ever have one instance",
      "A way to copy an existing object through a base pointer",
    ],
    answer: [0],
    explain: "The creator holds the workflow and defers one step, 'make the product', to subclasses. The switch-in-one-function version is the simple factory, which is useful but is not the GoF pattern. Singleton and Prototype solve different problems.",
  },
  {
    id: "cf-pat-fm-importer",
    kind: "pattern",
    topic: "L3.factory-method",
    level: 1,
    prompt: "An Importer runs the same steps for every file, but the parser it needs (JSON, CSV, XML) depends on the importer subclass. Which Patternling fits?",
    options: ["Forgebot (Factory Method)", "Solo (Singleton)", "Clonewisp (Prototype)", "Beaverbuild (Builder)"],
    answer: [0],
    explain: "The workflow is fixed in the base class and one creation step is overridden: Factory Method. Builder assembles one complex object step by step, which is not what is happening here.",
  },
  {
    id: "cf-pred-fm-importer",
    kind: "predict",
    topic: "L3.factory-method",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <string>

struct Parser {
  virtual ~Parser() = default;
  virtual std::string name() const = 0;
};
struct JsonParser : Parser {
  std::string name() const override { return "json"; }
};
struct CsvParser : Parser {
  std::string name() const override { return "csv"; }
};

class Importer {
 public:
  virtual ~Importer() = default;
  void run() const {
    std::unique_ptr<Parser> p = makeParser();
    std::cout << p->name() << " ";
  }

 protected:
  virtual std::unique_ptr<Parser> makeParser() const = 0;
};
struct JsonImporter : Importer {
 protected:
  std::unique_ptr<Parser> makeParser() const override { return std::make_unique<JsonParser>(); }
};
struct CsvImporter : Importer {
 protected:
  std::unique_ptr<Parser> makeParser() const override { return std::make_unique<CsvParser>(); }
};

int main() {
  std::unique_ptr<Importer> a = std::make_unique<CsvImporter>();
  a->run();
  JsonImporter().run();
  std::cout << "\\n";
}
`,
    output: "csv json",
    options: ["csv json", "json csv", "csv csv", "json json"],
    answer: [0],
    explain: "run() is written once in Importer, yet each call reaches the subclass's makeParser() by virtual dispatch. The caller never names JsonParser or CsvParser. Returning unique_ptr makes ownership of the new object explicit.",
  },
  {
    id: "cf-smell-fm-switch",
    kind: "smell",
    topic: "L3.factory-method",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `class ReportService {
 public:
  void export_(const std::string& kind, const Data& d) {
    if (kind == "pdf") {
      PdfWriter w;
      w.write(d);
    } else if (kind == "csv") {
      CsvWriter w;
      w.write(d);
    } else if (kind == "xlsx") {
      XlsxWriter w;
      w.write(d);
    }
  }
};`,
    options: [
      "The client names every concrete writer and branches on a type string; Open/Closed and Dependency Inversion",
      "Fat interface; Interface Segregation",
      "Covariant return; Liskov Substitution",
      "Global state; Single Responsibility",
    ],
    answer: [0],
    explain: "Each new format edits ReportService, and the service depends on every concrete writer. Put creation behind a factory (a function, a registry or a Factory Method) that returns a Writer interface, and let the service use only that interface.",
  },
  {
    id: "cf-mcq-fm-simple",
    kind: "mcq",
    topic: "L3.factory-method",
    level: 2,
    prompt: "Your code has one `makeShape(kind)` function with a switch and 4 shapes that rarely change. In an interview, what is the honest assessment?",
    options: [
      "A simple factory is fine here; reach for the full Factory Method hierarchy only when creation must vary by subclass",
      "It is wrong; all factories must be abstract class hierarchies",
      "It must be replaced by a Singleton",
      "It violates RAII",
    ],
    answer: [0],
    explain: "A plain function is the cheapest creation seam and is easy to test. A parallel creator hierarchy costs one class per product, which only pays off when an existing workflow needs a subclass to choose the product. Saying so shows judgement about YAGNI.",
  },
  {
    id: "cf-mcq-fm-plugin",
    kind: "mcq",
    topic: "L3.factory-method",
    level: 3,
    prompt: "New payment methods are added by other teams as plugins, without recompiling the checkout. Which creation approach scales best?",
    options: [
      "A registry mapping a key to a creator function, filled by each plugin at start-up",
      "A switch in the checkout that grows with every plugin",
      "A Singleton that stores every payment ever made",
      "Copy-pasting the checkout per payment method",
    ],
    answer: [0],
    explain: "A registry (a map from key to std::function<std::unique_ptr<Payment>()>) keeps the checkout closed to modification. The trade-off is that registration order and missing keys become run-time concerns, so validate the key and give a clear error.",
  },

  // ---- Abstract Factory ------------------------------------------------
  {
    id: "cf-mcq-af-intent",
    kind: "mcq",
    topic: "L3.abstract-factory",
    level: 1,
    prompt: "What problem does Abstract Factory solve that Factory Method alone does not?",
    options: [
      "Creating whole families of related products that must be used together, behind one interface",
      "Ensuring only one instance of a class exists",
      "Making an object immutable after construction",
      "Avoiding virtual functions entirely",
    ],
    answer: [0],
    explain: "An Abstract Factory has one creation function per product in the family (button, checkbox, scrollbar) and each concrete factory returns a consistent set. Factory Method creates a single product.",
  },
  {
    id: "cf-pat-af-theme",
    kind: "pattern",
    topic: "L3.abstract-factory",
    level: 2,
    prompt: "A UI toolkit must produce a matching set of widgets (button, checkbox, menu) for a dark or a light theme, and never mix the two. Which Patternling fits?",
    options: ["Forgebot (Factory Method / Abstract Factory)", "Swapwing (Strategy)", "Solo (Singleton)", "Shellcrab (Decorator)"],
    answer: [0],
    explain: "Related products created together under one theme are the Abstract Factory case, which is the family-sized relative of Factory Method. Strategy swaps one algorithm, and Decorator layers behaviour onto one object.",
  },
  {
    id: "cf-pred-af-family",
    kind: "predict",
    topic: "L3.abstract-factory",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <string>

struct Button {
  virtual ~Button() = default;
  virtual std::string draw() const = 0;
};
struct Checkbox {
  virtual ~Checkbox() = default;
  virtual std::string draw() const = 0;
};

struct Theme {
  virtual ~Theme() = default;
  virtual std::unique_ptr<Button> makeButton() const = 0;
  virtual std::unique_ptr<Checkbox> makeCheckbox() const = 0;
};

struct DarkButton : Button {
  std::string draw() const override { return "dark-btn"; }
};
struct DarkCheckbox : Checkbox {
  std::string draw() const override { return "dark-box"; }
};
struct LightButton : Button {
  std::string draw() const override { return "light-btn"; }
};
struct LightCheckbox : Checkbox {
  std::string draw() const override { return "light-box"; }
};

struct DarkTheme : Theme {
  std::unique_ptr<Button> makeButton() const override { return std::make_unique<DarkButton>(); }
  std::unique_ptr<Checkbox> makeCheckbox() const override { return std::make_unique<DarkCheckbox>(); }
};
struct LightTheme : Theme {
  std::unique_ptr<Button> makeButton() const override { return std::make_unique<LightButton>(); }
  std::unique_ptr<Checkbox> makeCheckbox() const override { return std::make_unique<LightCheckbox>(); }
};

void render(const Theme& t) {
  std::cout << t.makeButton()->draw() << " " << t.makeCheckbox()->draw() << " ";
}

int main() {
  render(DarkTheme());
  render(LightTheme());
  std::cout << "\\n";
}
`,
    output: "dark-btn dark-box light-btn light-box",
    options: [
      "dark-btn dark-box light-btn light-box",
      "dark-btn light-box light-btn dark-box",
      "light-btn light-box dark-btn dark-box",
      "dark-btn dark-box dark-btn dark-box",
    ],
    answer: [0],
    explain: "render() is given one factory, so both widgets it creates come from the same family. The compiler cannot mix a DarkButton with a LightCheckbox through this interface, which is the consistency guarantee the pattern sells.",
  },
  {
    id: "cf-smell-af-mixed",
    kind: "smell",
    topic: "L3.abstract-factory",
    level: 2,
    prompt: "What is wrong with this creation code, and which pattern removes the risk?",
    code: `Toolbar buildToolbar(bool dark) {
  std::unique_ptr<Button> btn;
  if (dark) btn = std::make_unique<DarkButton>();
  else btn = std::make_unique<LightButton>();
  auto box = std::make_unique<LightCheckbox>();   // forgot the theme
  return Toolbar(std::move(btn), std::move(box));
}`,
    options: [
      "Each product is chosen separately, so a dark button can be paired with a light checkbox; Abstract Factory enforces one family",
      "The Toolbar is not const-correct; add const everywhere",
      "std::move should be std::copy; Prototype fixes this",
      "The function should be a Singleton",
    ],
    answer: [0],
    explain: "Choosing each product independently lets a theme mismatch slip in. Pass one Theme factory in and ask it for every widget, so consistency is a property of the design instead of discipline.",
  },
  {
    id: "cf-mcq-af-cost",
    kind: "mcq",
    topic: "L3.abstract-factory",
    level: 3,
    prompt: "A family has 3 products and 2 factories. What is the main cost when you add a fourth product (a Slider)?",
    options: [
      "Every abstract and concrete factory must change, because the interface gained a new creation function",
      "Nothing; factories are open to any new product",
      "Only the client code changes",
      "The program must be rewritten without virtual functions",
    ],
    answer: [0],
    explain: "Abstract Factory is open to new families (add a factory) but closed to new product kinds (edit all factories). Know which axis your problem varies on before choosing it: if product kinds change often, a registry or a data-driven approach may be better.",
  },
  {
    id: "cf-mcq-af-vs-fm",
    kind: "mcq",
    topic: "L3.abstract-factory",
    level: 3,
    prompt: "How would you describe the relationship between Factory Method and Abstract Factory to an interviewer?",
    options: [
      "An Abstract Factory is usually a set of factory methods, one per product, grouped so they vary together",
      "They are unrelated and never appear in the same design",
      "Abstract Factory is Factory Method with a Singleton inside",
      "Factory Method is only for Java; C++ uses Abstract Factory",
    ],
    answer: [0],
    explain: "Each creation function on an Abstract Factory is itself a factory method. The extra structure is the guarantee that the products come from one family. Mentioning this link shows you understand the patterns instead of memorising class diagrams.",
  },

  // ---- Builder ---------------------------------------------------------
  {
    id: "cf-mcq-builder-intent",
    kind: "mcq",
    topic: "L3.builder",
    level: 1,
    prompt: "When is a Builder a better fit than a constructor?",
    options: [
      "When an object has many optional or order-dependent parts, so a long argument list would be unreadable and error-prone",
      "When the object has exactly one field",
      "When you want exactly one instance in the program",
      "When the object must be created on the stack",
    ],
    answer: [0],
    explain: "Builders give each part a name at the call site and let you validate the whole at build(). For three required arguments, a constructor (or an aggregate with designated initialisers in C++20) is simpler and a Builder is only ceremony.",
  },
  {
    id: "cf-smell-builder-ctor",
    kind: "smell",
    topic: "L3.builder",
    level: 1,
    prompt: "Name the smell in this call and a good fix.",
    code: `HttpRequest req("api.example.com", 443, true, false, 30, 3, true,
                "POST", "/v1/items", "", false);`,
    options: [
      "Long parameter list with anonymous flags (telescoping constructor); use a Builder or a named options struct",
      "God class; split it into two classes",
      "Singleton misuse; inject the request",
      "Slicing; pass by pointer",
    ],
    answer: [0],
    explain: "Nobody can tell which `true` is TLS and which is keep-alive, and swapping two adjacent arguments compiles fine. A fluent Builder (`.host().tls().timeoutSeconds()`) or a C++20 designated-initialiser options struct makes each value self-describing.",
  },
  {
    id: "cf-pat-builder-query",
    kind: "pattern",
    topic: "L3.builder",
    level: 1,
    prompt: "A search query has optional filters, sort order, paging and field selection. Callers should set only what they need and get a validated, ready-to-use object at the end. Which Patternling fits?",
    options: ["Beaverbuild (Builder)", "Clonewisp (Prototype)", "Solo (Singleton)", "Swapwing (Strategy)"],
    answer: [0],
    explain: "Step-by-step assembly of a complex object with optional parts, finished by a build() call that can check invariants, is Builder.",
  },
  {
    id: "cf-pred-builder-reuse",
    kind: "predict",
    topic: "L3.builder",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

class Pizza {
 public:
  std::string describe() const {
    std::string s = std::to_string(size_) + "cm:";
    for (std::size_t i = 0; i < toppings_.size(); ++i) {
      if (i > 0) s += "+";
      s += toppings_[i];
    }
    return s;
  }

 private:
  friend class PizzaBuilder;
  int size_ = 25;
  std::vector<std::string> toppings_;
};

class PizzaBuilder {
 public:
  PizzaBuilder& size(int cm) {
    p_.size_ = cm;
    return *this;
  }
  PizzaBuilder& topping(std::string t) {
    p_.toppings_.push_back(std::move(t));
    return *this;
  }
  Pizza build() const { return p_; }

 private:
  Pizza p_;
};

int main() {
  PizzaBuilder b;
  b.size(30).topping("olive").topping("basil");
  Pizza first = b.build();
  b.topping("ham");
  Pizza second = b.build();
  std::cout << first.describe() << " " << second.describe() << "\\n";
}
`,
    output: "30cm:olive+basil 30cm:olive+basil+ham",
    options: [
      "30cm:olive+basil 30cm:olive+basil+ham",
      "30cm:olive+basil 30cm:ham",
      "30cm:olive+basil+ham 30cm:olive+basil+ham",
      "25cm:olive+basil 25cm:olive+basil+ham",
    ],
    answer: [0],
    explain: "build() returns a copy, so `first` is unaffected by the later topping. The builder itself keeps its state, so the second pizza has all three toppings. A reusable builder needs a decision: either document that reuse accumulates, or reset the state in build().",
  },
  {
    id: "cf-mcq-builder-validate",
    kind: "mcq",
    topic: "L3.builder",
    level: 2,
    prompt: "Where should a Builder enforce 'a request must have a host and a positive timeout'?",
    options: [
      "In build(), failing there if the combination is invalid, so no half-valid object ever escapes",
      "Nowhere; the caller is responsible",
      "In every setter, by throwing as soon as one field is missing",
      "In the destructor of the product",
    ],
    answer: [0],
    explain: "Cross-field rules can only be checked once everything is set, so build() is the natural gate. Returning `std::optional` or an error result (or throwing, where exceptions are allowed) lets the product keep a strong invariant after construction.",
  },
  {
    id: "cf-mcq-builder-cpp20",
    kind: "mcq",
    topic: "L3.builder",
    level: 3,
    prompt: "In C++20, an options struct such as `Options{.timeout = 30, .retries = 3}` is sometimes used instead of a Builder. What is the trade-off?",
    options: [
      "It is lighter and has no extra class, but it cannot validate across fields or hide the product's representation",
      "It is slower in every case",
      "It cannot hold default values",
      "It only works with virtual functions",
    ],
    answer: [0],
    explain: "Designated initialisers give named arguments with defaults and zero ceremony. They allow any partially filled struct to exist and expose all fields, so use a Builder (or a validating factory taking the struct) when invariants or encapsulation matter.",
  },
  {
    id: "cf-mcq-builder-director",
    kind: "mcq",
    topic: "L3.builder",
    level: 3,
    prompt: "What does a 'director' add in the classic Builder structure?",
    options: [
      "A reusable recipe that drives a builder through a fixed sequence of steps, such as a 'standard meal'",
      "A global instance of the builder",
      "Automatic memory management",
      "Thread safety for all builders",
    ],
    answer: [0],
    explain: "The director captures common construction sequences so callers do not repeat them, and the same recipe can drive different builders (for example one that builds HTML and one that builds plain text). Many real designs skip it and just provide named helper functions.",
  },

  // ---- Prototype -------------------------------------------------------
  {
    id: "cf-mcq-proto-intent",
    kind: "mcq",
    topic: "L3.prototype",
    level: 1,
    prompt: "Why does Prototype give objects a virtual clone() instead of letting callers write `Base copy = *ptr;`?",
    options: [
      "Copying through a base type slices off the derived part; a virtual clone() copies the real dynamic type",
      "Copy constructors are not allowed in C++",
      "clone() is always faster than a copy constructor",
      "Because Base is always abstract",
    ],
    answer: [0],
    explain: "`Base copy = *ptr;` copies only the Base subobject. A virtual clone() runs inside the derived class, where the full type is known, and returns a new heap object of the same dynamic type.",
  },
  {
    id: "cf-pred-proto-clone",
    kind: "predict",
    topic: "L3.prototype",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <string>

struct Shape {
  Shape() = default;
  Shape(const Shape&) = default;
  virtual ~Shape() = default;
  virtual std::unique_ptr<Shape> clone() const = 0;
  virtual std::string name() const = 0;
  int tag = 0;
};
struct Circle : Shape {
  std::unique_ptr<Shape> clone() const override { return std::make_unique<Circle>(*this); }
  std::string name() const override { return "circle"; }
};
struct Square : Shape {
  std::unique_ptr<Shape> clone() const override { return std::make_unique<Square>(*this); }
  std::string name() const override { return "square"; }
};

int main() {
  std::unique_ptr<Shape> a = std::make_unique<Square>();
  a->tag = 7;
  std::unique_ptr<Shape> b = a->clone();
  b->tag = 9;
  std::cout << a->name() << a->tag << " " << b->name() << b->tag << "\\n";
}
`,
    output: "square7 square9",
    options: ["square7 square9", "square7 circle9", "square9 square9", "shape7 shape9"],
    answer: [0],
    explain: "clone() on a Square returns a Square copy that already carries tag 7, then the copy is edited independently. Callers only ever held Shape pointers, yet the dynamic type survived the copy.",
  },
  {
    id: "cf-pred-proto-slice",
    kind: "predict",
    topic: "L3.prototype",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <string>

struct Animal {
  virtual ~Animal() = default;
  virtual std::string sound() const { return "..."; }
};
struct Dog : Animal {
  std::string sound() const override { return "woof"; }
};

int main() {
  std::unique_ptr<Animal> p = std::make_unique<Dog>();
  Animal copy = *p;
  std::cout << p->sound() << " " << copy.sound() << "\\n";
}
`,
    output: "woof ...",
    options: ["woof ...", "woof woof", "... ...", "... woof"],
    answer: [0],
    explain: "The original is still a Dog, but `Animal copy = *p;` builds a plain Animal from the base subobject, so the override is lost. This is exactly the bug a virtual clone() prevents.",
  },
  {
    id: "cf-mcq-proto-covariant",
    kind: "mcq",
    topic: "L3.prototype",
    level: 3,
    prompt: "You want `Circle::clone()` to return `std::unique_ptr<Circle>` while `Shape::clone()` returns `std::unique_ptr<Shape>`. What happens?",
    options: [
      "It does not compile: covariant returns work for raw pointers and references, not for smart pointers",
      "It compiles and works as covariant return",
      "It compiles only with a Singleton",
      "It works only if Shape is final",
    ],
    answer: [0],
    explain: "Covariance requires the return types to be pointers or references to related classes, and unique_ptr<Circle> is an unrelated class type to the compiler. The usual workaround is a protected virtual doClone() returning unique_ptr<Shape>, plus a non-virtual public clone() in each class that wraps it with the precise type (or a CRTP helper).",
  },
  {
    id: "cf-smell-proto-shallow",
    kind: "smell",
    topic: "L3.prototype",
    level: 2,
    prompt: "What is the bug in cloning this class by its default copy?",
    code: `class Document {
 public:
  Document(std::string t) : title_(std::move(t)), style_(new Style()) {}
  ~Document() { delete style_; }
  // no copy constructor declared
 private:
  std::string title_;
  Style* style_;
};`,
    options: [
      "A shallow copy duplicates the raw pointer, so two Documents delete the same Style (double free); follow the Rule of Three/Five or use unique_ptr",
      "The title will be sliced",
      "The destructor should be virtual-free",
      "Nothing; default copies are always deep",
    ],
    answer: [0],
    explain: "The implicitly generated copy copies the pointer value. Both documents then delete one Style. Prefer value members or `std::unique_ptr<Style>` (with an explicit deep-copy constructor), so the compiler stops you from copying by accident.",
  },
  {
    id: "cf-pat-proto-sprite",
    kind: "pattern",
    topic: "L3.prototype",
    level: 2,
    prompt: "A game spawns hundreds of enemies from a handful of fully configured templates (stats, sprite, AI settings). Copying a template is much cheaper than re-reading the config. Which Patternling fits?",
    options: ["Clonewisp (Prototype)", "Beaverbuild (Builder)", "Solo (Singleton)", "Forgebot (Factory Method)"],
    answer: [0],
    explain: "A configured exemplar copied to make new objects is Prototype. Check that a copy is genuinely cheaper than construction, and that mutable shared resources (textures, handles) are shared on purpose and not accidentally duplicated.",
  },

  // ---- Singleton -------------------------------------------------------
  {
    id: "cf-mcq-single-intent",
    kind: "mcq",
    topic: "L3.singleton",
    level: 1,
    prompt: "What are the two things a Singleton guarantees?",
    options: [
      "At most one instance exists, and there is a global access point to it",
      "The object is immutable and copyable",
      "The object is thread-local and reference counted",
      "The object lives on the heap and is never destroyed",
    ],
    answer: [0],
    explain: "One instance plus global access. The second half is what causes most of the trouble: any code can reach the object without declaring the dependency in its interface.",
  },
  {
    id: "cf-pred-single-meyers",
    kind: "predict",
    topic: "L3.singleton",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>

class Counter {
 public:
  static Counter& instance() {
    static Counter c;
    return c;
  }
  int next() { return ++n_; }

 private:
  Counter() { std::cout << "init "; }
  int n_ = 0;
};

int main() {
  std::cout << "start ";
  auto c = Counter::instance();
  c.next();
  c.next();
  std::cout << c.next() << " " << Counter::instance().next() << "\\n";
}
`,
    output: "start init 3 1",
    options: ["start init 3 1", "start init 3 4", "init start 3 1", "start init 3 3"],
    answer: [0],
    explain: "The function-local static is built on first use, after 'start' (a Meyers singleton). But `auto c = ...` deduces Counter, not Counter&, so it takes a copy through the implicitly public copy constructor. The copy reaches 3 while the real instance is still at 0, so its next() gives 1. A real Singleton deletes its copy operations.",
  },
  {
    id: "cf-mcq-single-threadsafe",
    kind: "mcq",
    topic: "L3.singleton",
    level: 2,
    prompt: "Since C++11, what does the language guarantee about `static Counter c;` inside `instance()`?",
    options: [
      "Concurrent first calls are safe: exactly one thread runs the initialiser and the others wait",
      "Nothing; you must always add your own mutex",
      "The initialiser may run once per thread",
      "It is initialised before main() starts",
    ],
    answer: [0],
    explain: "Function-local statics are initialised thread-safely on first use. That protects construction only. Calls to member functions like next() are still data races unless the object guards its own state, for example with a mutex or std::atomic.",
  },
  {
    id: "cf-smell-single-hidden",
    kind: "smell",
    topic: "L3.singleton",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `class OrderService {
 public:
  void place(const Order& o) {
    if (!Config::instance().isOpen()) return;
    Logger::instance().log("placing " + o.id());
    Database::instance().save(o);
  }
};`,
    options: [
      "Hidden dependencies on three global singletons; Dependency Inversion (and the class cannot be unit-tested in isolation)",
      "Fat interface; Interface Segregation",
      "Primitive obsession; Open/Closed",
      "Slicing; Liskov Substitution",
    ],
    answer: [0],
    explain: "The constructor says OrderService needs nothing, yet place() touches config, logs and the database. Tests cannot substitute fakes, and state leaks between tests. Inject interfaces through the constructor and let main (the composition root) wire the real ones.",
  },
  {
    id: "cf-mcq-single-testing",
    kind: "mcq",
    topic: "L3.singleton",
    level: 3,
    prompt: "What is the standard way to keep 'only one instance' while avoiding global access?",
    options: [
      "Create one object in main() (the composition root) and pass it by reference or pointer to the classes that need it",
      "Make all its data members static",
      "Mark it `volatile` so it cannot be copied",
      "Create it in a header-only global variable",
    ],
    answer: [0],
    explain: "Single instance is a lifetime decision; global access is a visibility decision. Dependency injection keeps the first and drops the second, so each class states what it needs and tests can pass a fake. Reserve a true Singleton for things that are genuinely process-wide.",
  },
  {
    id: "cf-mcq-single-order",
    kind: "mcq",
    topic: "L3.singleton",
    level: 3,
    prompt: "What is the 'static initialisation order fiasco', and why does a Meyers singleton avoid part of it?",
    options: [
      "Globals in different translation units are initialised in unspecified order, so one may use another before it exists; a function-local static is built on first use",
      "Statics are destroyed before they are constructed in every program",
      "It means two threads can construct a static twice",
      "It only happens for objects stored on the heap",
    ],
    answer: [0],
    explain: "Construct-on-first-use removes the construction-order problem. Destruction order at exit can still bite: if a static's destructor uses another static that is already gone, behaviour is undefined. Keep singletons free of destructors that depend on other singletons.",
  },
  {
    id: "cf-pat-single-registry",
    kind: "pattern",
    topic: "L3.singleton",
    level: 2,
    prompt: "A process must hold exactly one handle to a hardware GPIO controller, because two owners would corrupt the device. Which Patternling is the textbook fit (with caveats)?",
    options: ["Solo (Singleton)", "Clonewisp (Prototype)", "Beaverbuild (Builder)", "Swapwing (Strategy)"],
    answer: [0],
    explain: "Exclusive access to a unique physical resource is the legitimate case. Even then, prefer creating it once in main and injecting it, and watch for the Global State debuff when Solo is used for convenience rather than necessity.",
  },

  // ---- Object Pool and DI ----------------------------------------------
  {
    id: "cf-mcq-pool-intent",
    kind: "mcq",
    topic: "L3.object-pool",
    level: 2,
    prompt: "When is an Object Pool worth its complexity?",
    options: [
      "When creating an object is expensive (connections, large buffers) and objects are reused at a measured, high rate",
      "Whenever you use new",
      "Only for objects smaller than a cache line",
      "When you need exactly one instance",
    ],
    answer: [0],
    explain: "A pool trades memory held idle and extra bookkeeping for lower creation cost and bounded resources (like a database connection limit). For cheap objects the allocator is usually faster than your pool. Measure first.",
  },
  {
    id: "cf-pred-pool-reuse",
    kind: "predict",
    topic: "L3.object-pool",
    level: 3,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <vector>

class Pool {
 public:
  int* acquire() {
    if (free_.empty()) {
      store_.push_back(std::make_unique<int>(nextId_++));
      return store_.back().get();
    }
    int* p = free_.back();
    free_.pop_back();
    return p;
  }
  void release(int* p) { free_.push_back(p); }

 private:
  std::vector<std::unique_ptr<int>> store_;
  std::vector<int*> free_;
  int nextId_ = 0;
};

int main() {
  Pool pool;
  int* a = pool.acquire();
  int* b = pool.acquire();
  pool.release(a);
  int* c = pool.acquire();
  int* d = pool.acquire();
  std::cout << *c << " " << *d << " " << (c == a) << " " << *b << "\\n";
}
`,
    output: "0 2 1 1",
    options: ["0 2 1 1", "1 2 0 0", "0 1 1 1", "2 0 1 1"],
    answer: [0],
    explain: "The first two acquires create objects 0 and 1. After release(a), the next acquire reuses object 0 (so c == a is true, printed as 1) and the one after that finds the free list empty and creates object 2. The pool never destroys its objects until it dies, which is the memory-for-speed trade. Releasing a pointer twice, or releasing one that is still in use, would corrupt this design; that is why real pools hand out RAII handles.",
  },
  {
    id: "cf-mcq-pool-raii",
    kind: "mcq",
    topic: "L3.object-pool",
    level: 3,
    prompt: "Callers sometimes forget to release pooled connections, and the pool slowly runs dry. What is the idiomatic C++ fix?",
    options: [
      "Return an RAII handle (for example a unique_ptr with a custom deleter) that gives the object back to the pool on destruction",
      "Ask callers to read the documentation more carefully",
      "Make the pool a Singleton",
      "Never release; allocate a new object each time",
    ],
    answer: [0],
    explain: "Tie release to scope exit so it happens on every path, including early returns and exceptions. Also make sure the handle cannot outlive the pool, and reset the object's state on release so the next user does not see stale data.",
  },
  {
    id: "cf-mcq-di-composition-root",
    kind: "mcq",
    topic: "L3.di",
    level: 2,
    prompt: "In dependency injection, what is the 'composition root'?",
    options: [
      "The one place near program start (often main) where concrete objects are created and wired together",
      "The base class of every service",
      "A global registry that classes query whenever they need something",
      "The destructor that runs at exit",
    ],
    answer: [0],
    explain: "Keeping `new` and make_unique for services in one place means the rest of the code depends only on interfaces. The result is easy to test with fakes, and the wiring is readable in one screen.",
  },
  {
    id: "cf-smell-di-locator",
    kind: "smell",
    topic: "L3.di",
    level: 3,
    prompt: "This looks like dependency injection but hides the same problem as a Singleton. What is it?",
    code: `class Checkout {
 public:
  explicit Checkout(ServiceLocator& sl) : sl_(sl) {}
  void pay(const Cart& c) {
    sl_.get<PaymentGateway>().charge(c.total());
    sl_.get<Mailer>().send(c.owner(), "paid");
  }
 private:
  ServiceLocator& sl_;
};`,
    options: [
      "Service Locator: the real dependencies are invisible in the signature and fail at run time if unregistered; inject PaymentGateway and Mailer directly",
      "Slicing of the Cart",
      "Missing virtual destructor on Checkout",
      "Over-use of const",
    ],
    answer: [0],
    explain: "A locator is global state with extra steps: you cannot see what Checkout needs without reading its body, and a missing registration shows up as a run-time failure. Constructor injection documents requirements and lets the compiler help.",
  },
  {
    id: "cf-mcq-di-container",
    kind: "mcq",
    topic: "L3.di",
    level: 3,
    prompt: "C++ projects rarely use a reflection-based DI container. Why, and what is the usual alternative?",
    options: [
      "C++ has no runtime reflection, so teams wire dependencies by hand in main or with small factory functions (compile-time libraries exist but are optional)",
      "Because C++ forbids passing objects to constructors",
      "Because dependency injection only works in garbage-collected languages",
      "Because containers are slower than raw pointers by a factor of 100",
    ],
    answer: [0],
    explain: "Manual constructor injection is explicit and cheap, and a long main() is a feature (it is the architecture, written down). A container starts to pay off only when object graphs are large and lifetimes (per request, per session) need managing.",
  },

  // ---- Choosing between them -------------------------------------------
  {
    id: "cf-mcq-choose-builder-factory",
    kind: "mcq",
    topic: "L3.builder",
    level: 3,
    prompt: "How do you explain the difference between Builder and Factory in one sentence?",
    options: [
      "A factory decides which type to create and returns it in one call; a builder assembles one complex object over several steps",
      "They are the same pattern with different names",
      "A factory is for stack objects and a builder is for heap objects",
      "A builder always returns a pointer; a factory always returns a value",
    ],
    answer: [0],
    explain: "Factories answer 'which class?' and builders answer 'how do I configure this one?'. Real designs combine them: a factory chooses a builder, or a builder's build() delegates to a factory for the correct product subtype.",
  },
  {
    id: "cf-pat-choose-config",
    kind: "pattern",
    topic: "L3.factory-method",
    level: 2,
    prompt: "A game reads a level file naming monster kinds as strings and must create the right class for each, without the loader knowing every class. Which Patternling is the closest fit?",
    options: ["Forgebot (Factory Method)", "Clonewisp (Prototype)", "Solo (Singleton)", "Shellcrab (Decorator)"],
    answer: [0],
    explain: "Mapping a key to a creator behind an interface is a factory (here a registry-based one). Prototype is a close second if each kind is a configured template that you copy, so state which you picked and why.",
  },
  {
    id: "cf-mcq-choose-overuse",
    kind: "mcq",
    topic: "L3.factory-method",
    level: 3,
    prompt: "In a review, you see a `FooFactoryFactory` that creates `FooFactory` objects for one concrete `Foo`. What is the right call?",
    options: [
      "Remove the layers; indirection with no varying axis is speculative generality and costs readability",
      "Add a third factory for symmetry",
      "Convert it to a Singleton",
      "Leave it; more patterns always mean better design",
    ],
    answer: [0],
    explain: "A pattern earns its place by absorbing a change you can name. If nothing varies, the factory is just a longer way to write `Foo{}`. Interviewers reward the candidate who can say when not to use a pattern.",
  },
];
