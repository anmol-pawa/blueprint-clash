import type { Card } from "@/lib/battle/cards";

/**
 * Structural Bridges concept deck (CURRICULUM L4: Adapter, Bridge, Composite, Decorator, Facade,
 * Flyweight, Proxy). Original wording. Predict cards are compiled and run natively by content:verify.
 */
export const STRUCTURAL_BRIDGES_DECK: Card[] = [
  // ---- Adapter ---------------------------------------------------------
  {
    id: "sb-mcq-ad-intent",
    kind: "mcq",
    topic: "L4.adapter",
    level: 1,
    prompt: "What problem does the Adapter pattern solve?",
    options: [
      "An existing class has the behaviour you need but the wrong interface, so a wrapper translates it to the interface your code expects",
      "It lets an object change behaviour when its internal state changes",
      "It guarantees only one instance of a class exists",
      "It lets many objects share one copy of common data",
    ],
    answer: [0],
    explain: "Adapter changes the shape of an interface, not the behaviour behind it. It is the tool for third-party or legacy code you cannot edit. State, Singleton and Flyweight solve unrelated problems.",
  },
  {
    id: "sb-pat-ad-sdk",
    kind: "pattern",
    topic: "L4.adapter",
    level: 1,
    prompt: "Your app talks to a `PaymentGateway` interface. A vendor SDK offers `charge(cents, currencyCode)` with different names and types, and you cannot change it. Which Patternling fits?",
    options: ["Axolink (Adapter)", "Flytile (Flyweight)", "Facadeon (Facade)", "Shellcrab (Decorator)"],
    answer: [0],
    explain: "You have one target interface and one incompatible class: Adapter. A Facade would simplify a whole subsystem behind a new interface of its own choosing, and a Decorator keeps the interface the same while adding behaviour.",
  },
  {
    id: "sb-pred-ad-temp",
    kind: "predict",
    topic: "L4.adapter",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>

struct Celsius {
  virtual ~Celsius() = default;
  virtual double read() const = 0;
};

class FahrenheitSensor {
 public:
  explicit FahrenheitSensor(double f) : f_(f) {}
  double fahrenheit() const { return f_; }

 private:
  double f_;
};

class SensorAdapter : public Celsius {
 public:
  explicit SensorAdapter(const FahrenheitSensor& s) : sensor_(s) {}
  double read() const override { return (sensor_.fahrenheit() - 32.0) * 5.0 / 9.0; }

 private:
  const FahrenheitSensor& sensor_;
};

int main() {
  FahrenheitSensor boiling(212.0);
  FahrenheitSensor freezing(32.0);
  std::unique_ptr<Celsius> a = std::make_unique<SensorAdapter>(boiling);
  std::unique_ptr<Celsius> b = std::make_unique<SensorAdapter>(freezing);
  std::cout << a->read() << " " << b->read() << "\\n";
}
`,
    output: "100 0",
    options: ["100 0", "212 32", "100 32", "0 100"],
    answer: [0],
    explain: "The client only sees Celsius::read(). The adapter converts on every call: (212-32)*5/9 = 100 and (32-32)*5/9 = 0. Note the adapter stores a const reference, so the sensor must outlive it; owning a copy or a shared_ptr is the safer choice when lifetimes are unclear.",
  },
  {
    id: "sb-mcq-ad-object-class",
    kind: "mcq",
    topic: "L4.adapter",
    level: 2,
    prompt: "In C++ you can build an adapter by composition (holding the adaptee) or by private inheritance from the adaptee. Which is the better default and why?",
    options: [
      "Composition: the adapter depends only on the adaptee's public interface, can wrap a subclass or a fake, and cannot accidentally expose adaptee internals",
      "Private inheritance: it is always faster because there is no pointer",
      "Public inheritance from both: it keeps every method available",
      "Neither works in C++ because adapters need interfaces from Java",
    ],
    answer: [0],
    explain: "Composition is the object adapter and is easier to test and to extend. Private inheritance (class adapter) is legitimate when you must override a virtual of the adaptee or need empty-base optimisation, but it ties you to one concrete class. Public inheritance leaks the wrong interface.",
  },
  {
    id: "sb-smell-ad-leak",
    kind: "smell",
    topic: "L4.adapter",
    level: 3,
    prompt: "Name the smell and the principle it strains.",
    code: `class OrderService {
 public:
  void pay(const Order& o) {
    VendorClient c;                       // third-party type
    VendorResult r = c.charge(o.totalCents(), "USD");
    if (r.code == VendorResult::kDeclinedSoft) {
      retryLater(o);
    }
  }
};`,
    options: [
      "Vendor types and error codes leak into domain code; Dependency Inversion (and the Adapter that should hide them is missing)",
      "A class does too many unrelated things; Interface Segregation",
      "A subclass strengthens a precondition; Liskov Substitution",
      "A switch on type; Open/Closed",
    ],
    answer: [0],
    explain: "The business logic now compiles against the vendor SDK and its codes. Define a PaymentGateway interface in your own terms and put the vendor mapping, including error translation, in one adapter. Swapping vendors then touches one file.",
  },

  // ---- Bridge ----------------------------------------------------------
  {
    id: "sb-mcq-br-intent",
    kind: "mcq",
    topic: "L4.bridge",
    level: 1,
    prompt: "What is the core idea of the Bridge pattern?",
    options: [
      "Split an abstraction and its implementation into two hierarchies joined by composition, so each can vary independently",
      "Wrap an object so it can be used where a different interface is required",
      "Let several objects share state to save memory",
      "Provide one simple entry point to a complicated subsystem",
    ],
    answer: [0],
    explain: "Bridge is chosen up front when two dimensions of variation exist. Adapter fixes a mismatch after the fact. The other options describe Flyweight and Facade.",
  },
  {
    id: "sb-pat-br-notify",
    kind: "pattern",
    topic: "L4.bridge",
    level: 2,
    prompt: "You send Alerts and Reminders (message kinds) over Email, SMS and Push (channels). Subclassing each pair would create 6 classes, and 8 after one more channel. Which Patternling fits?",
    options: ["Bridgeback (Bridge)", "Shellcrab (Decorator)", "Axolink (Adapter)", "Fractree (Composite)"],
    answer: [0],
    explain: "Two independent dimensions, message kind and channel, multiply into a class explosion. Bridge keeps two small hierarchies (kinds x channels = 2 + 3 classes) and lets a kind hold a Channel. Decorator also avoids explosion, but for stackable behaviour on one interface.",
  },
  {
    id: "sb-pred-br-shape",
    kind: "predict",
    topic: "L4.bridge",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <string>
#include <utility>

struct Renderer {
  virtual ~Renderer() = default;
  virtual std::string circle(int r) const = 0;
};
struct Vector : Renderer {
  std::string circle(int r) const override { return "vec(" + std::to_string(r) + ")"; }
};
struct Raster : Renderer {
  std::string circle(int r) const override { return "px(" + std::to_string(r * 2) + ")"; }
};

class Shape {
 public:
  explicit Shape(std::shared_ptr<Renderer> r) : r_(std::move(r)) {}
  virtual ~Shape() = default;
  virtual std::string draw() const = 0;

 protected:
  std::shared_ptr<Renderer> r_;
};
class Circle : public Shape {
 public:
  Circle(std::shared_ptr<Renderer> r, int radius) : Shape(std::move(r)), radius_(radius) {}
  std::string draw() const override { return r_->circle(radius_); }

 private:
  int radius_;
};

int main() {
  auto v = std::make_shared<Vector>();
  auto p = std::make_shared<Raster>();
  Circle a(v, 3), b(p, 3);
  std::cout << a.draw() << " " << b.draw() << "\\n";
}
`,
    output: "vec(3) px(6)",
    options: ["vec(3) px(6)", "vec(3) px(3)", "px(6) vec(3)", "vec(6) px(6)"],
    answer: [0],
    explain: "Circle is the abstraction; Renderer is the implementor it holds. The same Circle class produces two outputs depending on which renderer was bridged in, with no Vector/Raster subclasses of Circle. Adding a Square or a new renderer never touches the other side.",
  },
  {
    id: "sb-mcq-br-vs-strategy",
    kind: "mcq",
    topic: "L4.bridge",
    level: 3,
    prompt: "Bridge and Strategy have nearly the same class diagram: an object holding a pointer to an interface. How do you tell them apart in an interview?",
    options: [
      "By intent: Bridge separates a whole abstraction hierarchy from an implementation hierarchy, while Strategy swaps one algorithm inside a single class",
      "Bridge uses inheritance and Strategy uses templates",
      "Strategy can only be chosen at compile time",
      "There is no difference and interviewers accept either name",
    ],
    answer: [0],
    explain: "Same structure, different intent. If both sides have their own growing hierarchy (shapes x renderers) you are describing a Bridge. If one class just takes a replaceable policy (a sort order, a retry rule), it is a Strategy. Naming the intent shows you know patterns are about problems, not diagrams.",
  },
  {
    id: "sb-smell-br-explosion",
    kind: "smell",
    topic: "L4.bridge",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `class Message { /* ... */ };
class EmailAlert    : public Message { /* ... */ };
class SmsAlert      : public Message { /* ... */ };
class PushAlert     : public Message { /* ... */ };
class EmailReminder : public Message { /* ... */ };
class SmsReminder   : public Message { /* ... */ };
class PushReminder  : public Message { /* ... */ };
// next sprint: add a WhatsApp channel...`,
    options: [
      "A class per combination of two independent axes (a class explosion); Open/Closed, fixed by composing a Channel into the message",
      "A fat interface forcing unused methods; Interface Segregation",
      "A god class with many responsibilities; Single Responsibility",
      "A derived class that cannot replace its base; Liskov Substitution",
    ],
    answer: [0],
    explain: "Every new channel adds a class per message kind, and every new kind adds a class per channel. Inheritance is being used for two jobs at once. Hold a Channel by composition and the matrix collapses to a sum.",
  },

  // ---- Composite -------------------------------------------------------
  {
    id: "sb-mcq-co-intent",
    kind: "mcq",
    topic: "L4.composite",
    level: 1,
    prompt: "When is the Composite pattern the right fit?",
    options: [
      "When you have a tree of parts and wholes and want clients to treat a single item and a group of items through the same interface",
      "When you need to undo a sequence of operations",
      "When a class must hide a third-party API behind a new one",
      "When object creation is expensive and should be pooled",
    ],
    answer: [0],
    explain: "File systems, UI widget trees, org charts and expression trees are classic composites. The recursion lives in the composite node, so the client has no if-leaf-else-folder branches.",
  },
  {
    id: "sb-pat-co-folder",
    kind: "pattern",
    topic: "L4.composite",
    level: 1,
    prompt: "A file manager must report the size of a file, and of a folder that can hold files and other folders, using the same call. Which Patternling fits?",
    options: ["Fractree (Composite)", "Proxifox (Proxy)", "Flytile (Flyweight)", "Bridgeback (Bridge)"],
    answer: [0],
    explain: "A folder is a node that holds children of the same interface, and its size() sums theirs. That recursive part-whole structure is Composite.",
  },
  {
    id: "sb-pred-co-size",
    kind: "predict",
    topic: "L4.composite",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <vector>

struct Node {
  virtual ~Node() = default;
  virtual int size() const = 0;
};
struct File : Node {
  explicit File(int n) : n_(n) {}
  int size() const override { return n_; }

 private:
  int n_;
};
struct Folder : Node {
  void add(std::unique_ptr<Node> c) { kids_.push_back(std::move(c)); }
  int size() const override {
    int total = 1;  // the folder entry itself
    for (const auto& k : kids_) total += k->size();
    return total;
  }

 private:
  std::vector<std::unique_ptr<Node>> kids_;
};

int main() {
  auto root = std::make_unique<Folder>();
  root->add(std::make_unique<File>(10));
  auto sub = std::make_unique<Folder>();
  sub->add(std::make_unique<File>(5));
  sub->add(std::make_unique<File>(7));
  root->add(std::move(sub));
  std::cout << root->size() << "\\n";
}
`,
    output: "24",
    options: ["24", "22", "23", "25"],
    answer: [0],
    explain: "sub = 1 + 5 + 7 = 13. root = 1 + 10 + 13 = 24. Each Folder adds 1 for itself, which is why 22 (forgetting both folders) and 23 (counting only one) are wrong. The client calls root->size() once and recursion does the rest.",
  },
  {
    id: "sb-mcq-co-safety",
    kind: "mcq",
    topic: "L4.composite",
    level: 3,
    prompt: "Where should `add(child)` live: on the common Node interface (transparency) or only on Folder (safety)? What is the honest trade-off?",
    options: [
      "On the interface gives uniform client code but lets you call add on a File at runtime; only on Folder is type-safe but clients must downcast or know which node they hold",
      "It must always be on the interface or the pattern is not Composite",
      "It must always be on Folder only, since leaves never have children",
      "It does not matter because C++ ignores unused virtuals",
    ],
    answer: [0],
    explain: "GoF discuss exactly this tension. A common pragmatic design keeps child management off the shared interface and builds trees through a Folder or a builder, so leaves cannot be misused, while operations that make sense on both (size, render) stay on Node.",
  },
  {
    id: "sb-smell-co-branch",
    kind: "smell",
    topic: "L4.composite",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `int totalSize(const Entry& e) {
  if (e.isFile) {
    return e.bytes;
  }
  int sum = 0;
  for (const Entry& child : e.children) {
    sum += totalSize(child);
  }
  return sum;
}
// every new operation (count, search, render) repeats this isFile branch`,
    options: [
      "Clients branch on leaf versus group, so every new operation re-implements the traversal; Open/Closed (use Composite with a shared interface)",
      "Global mutable state; Dependency Inversion",
      "A subclass that throws on a base method; Liskov Substitution",
      "A constructor doing I/O; Single Responsibility",
    ],
    answer: [0],
    explain: "One struct plays both leaf and folder, and a flag tells them apart. That scatters the leaf/group decision across every function. A Node interface with File and Folder implementations puts each behaviour next to its data.",
  },

  // ---- Decorator -------------------------------------------------------
  {
    id: "sb-mcq-de-intent",
    kind: "mcq",
    topic: "L4.decorator",
    level: 1,
    prompt: "What does the Decorator pattern do?",
    options: [
      "Wraps an object in another that has the same interface and adds behaviour before or after delegating, and wrappers can be stacked",
      "Converts one interface into a different one",
      "Defers the creation of an expensive object until it is used",
      "Lets a subclass override one step of a fixed algorithm",
    ],
    answer: [0],
    explain: "Because the wrapper has the same interface, clients cannot tell, and wrappers compose in any order at run time. Adapter changes the interface, Proxy controls access, and Template Method is the last option.",
  },
  {
    id: "sb-pat-de-coffee",
    kind: "pattern",
    topic: "L4.decorator",
    level: 1,
    prompt: "A coffee can get any mix of milk, sugar and whip, each adding to the price and description. Subclassing every combination is hopeless. Which Patternling fits?",
    options: ["Shellcrab (Decorator)", "Bridgeback (Bridge)", "Fractree (Composite)", "Solo (Singleton)"],
    answer: [0],
    explain: "Each topping wraps the drink and adds to cost() and description(), so any combination is built at run time. Shellcrab gains a shell per wrapper.",
  },
  {
    id: "sb-pred-de-coffee",
    kind: "predict",
    topic: "L4.decorator",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <string>
#include <utility>

struct Drink {
  virtual ~Drink() = default;
  virtual int cost() const = 0;
  virtual std::string name() const = 0;
};
struct Espresso : Drink {
  int cost() const override { return 200; }
  std::string name() const override { return "espresso"; }
};
class Topping : public Drink {
 public:
  explicit Topping(std::unique_ptr<Drink> d) : inner_(std::move(d)) {}

 protected:
  std::unique_ptr<Drink> inner_;
};
struct Milk : Topping {
  using Topping::Topping;
  int cost() const override { return inner_->cost() + 50; }
  std::string name() const override { return inner_->name() + "+milk"; }
};
struct Sugar : Topping {
  using Topping::Topping;
  int cost() const override { return inner_->cost() + 10; }
  std::string name() const override { return inner_->name() + "+sugar"; }
};

int main() {
  std::unique_ptr<Drink> d = std::make_unique<Espresso>();
  d = std::make_unique<Milk>(std::move(d));
  d = std::make_unique<Sugar>(std::move(d));
  d = std::make_unique<Milk>(std::move(d));
  std::cout << d->name() << " " << d->cost() << "\\n";
}
`,
    output: "espresso+milk+sugar+milk 310",
    options: ["espresso+milk+sugar+milk 310", "espresso+milk+sugar+milk 260", "espresso+milk 250", "espresso+sugar+milk+milk 310"],
    answer: [0],
    explain: "Wrappers apply inside-out: the innermost is the espresso, and each outer layer appends its own suffix after delegating. Cost is 200 + 50 + 10 + 50 = 310; the second milk is a separate wrapper, not a no-op. Reassigning d after std::move(d) is safe because the moved-from pointer is overwritten.",
  },
  {
    id: "sb-pred-de-order",
    kind: "predict",
    topic: "L4.decorator",
    level: 3,
    prompt: "Wrapper order matters. What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <string>
#include <utility>

struct Sink {
  virtual ~Sink() = default;
  virtual std::string write(const std::string& s) = 0;
};
struct Plain : Sink {
  std::string write(const std::string& s) override { return s; }
};
struct Cut3 : Sink {
  explicit Cut3(std::unique_ptr<Sink> n) : next(std::move(n)) {}
  std::string write(const std::string& s) override { return next->write(s.substr(0, 3)); }
  std::unique_ptr<Sink> next;
};
struct Bracket : Sink {
  explicit Bracket(std::unique_ptr<Sink> n) : next(std::move(n)) {}
  std::string write(const std::string& s) override { return next->write("[" + s + "]"); }
  std::unique_ptr<Sink> next;
};

int main() {
  Cut3 a(std::make_unique<Bracket>(std::make_unique<Plain>()));
  Bracket b(std::make_unique<Cut3>(std::make_unique<Plain>()));
  std::cout << a.write("abcd") << " " << b.write("abcd") << "\\n";
}
`,
    output: "[abc] [ab",
    options: ["[abc] [ab", "[abc] [abc]", "[abcd] [ab", "[ab [abc]"],
    answer: [0],
    explain: "a cuts first, then brackets: 'abcd' becomes 'abc', then '[abc]'. b brackets first: '[abcd]', and then Cut3 keeps only the first three characters, '[ab', so the closing bracket is lost. Same two decorators, different order, different result: that is why a decorator stack needs a documented order.",
  },
  {
    id: "sb-mcq-de-vs-inherit",
    kind: "mcq",
    topic: "L4.decorator",
    level: 2,
    prompt: "Why prefer Decorator over subclassing for optional features such as logging, caching and retry on a client?",
    options: [
      "Features are added or removed per object at run time and in any order, and each lives in one small class, instead of a subclass for every combination",
      "Decorators are always faster than virtual calls",
      "Subclassing is not allowed for classes with virtual destructors",
      "It lets the compiler inline every layer",
    ],
    answer: [0],
    explain: "Inheritance fixes the combination at compile time and multiplies classes. The cost of Decorator is real too: many tiny objects, a deeper call stack, and identity confusion (the decorated object is not the original). Say both sides.",
  },
  {
    id: "sb-smell-de-subclass",
    kind: "smell",
    topic: "L4.decorator",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `class Stream { /* read/write */ };
class BufferedStream            : public Stream { /* ... */ };
class EncryptedStream           : public Stream { /* ... */ };
class BufferedEncryptedStream   : public Stream { /* ... */ };
class CompressedStream          : public Stream { /* ... */ };
class BufferedCompressedStream  : public Stream { /* ... */ };
class EncryptedCompressedStream : public Stream { /* ... */ };
// ...and the buffered + encrypted + compressed one`,
    options: [
      "Inheritance used to combine optional features, so classes multiply per combination; Open/Closed, fixed by Decorator",
      "Interface bloat on a single class; Interface Segregation",
      "Constructor with many parameters; Single Responsibility",
      "Hidden global state; Dependency Inversion",
    ],
    answer: [0],
    explain: "n optional features need up to 2^n subclasses. Three small wrappers (Buffered, Encrypted, Compressed) over a Stream interface cover all eight combinations and a fourth feature costs one class.",
  },

  // ---- Facade ----------------------------------------------------------
  {
    id: "sb-mcq-fa-intent",
    kind: "mcq",
    topic: "L4.facade",
    level: 1,
    prompt: "What is a Facade?",
    options: [
      "A simple class that offers a small, task-oriented interface to a larger subsystem and coordinates its parts",
      "A copy of an object created through a base pointer",
      "A stand-in with the same interface that controls access to another object",
      "A tree node that can contain other nodes",
    ],
    answer: [0],
    explain: "A Facade hides complexity from the caller without forbidding access to the subsystem, so advanced users can still go underneath. Proxy keeps the same interface and Composite builds trees.",
  },
  {
    id: "sb-pat-fa-checkout",
    kind: "pattern",
    topic: "L4.facade",
    level: 1,
    prompt: "Placing an order means calling Inventory, Payment, Shipping and Email in a precise sequence. Callers keep getting the order wrong. Which Patternling fits?",
    options: ["Facadeon (Facade)", "Axolink (Adapter)", "Flytile (Flyweight)", "Shellcrab (Decorator)"],
    answer: [0],
    explain: "A single placeOrder() that owns the sequence is a Facade. It does not change any subsystem interface (not Adapter) and does not wrap one object to add behaviour (not Decorator).",
  },
  {
    id: "sb-pred-fa-home",
    kind: "predict",
    topic: "L4.facade",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <string>

struct Lights {
  std::string dim(int pct) const { return "L" + std::to_string(pct); }
};
struct Screen {
  std::string lower() const { return "S"; }
};
struct Projector {
  std::string on() const { return "P"; }
};

class MovieNight {
 public:
  std::string start() const {
    return lights_.dim(20) + screen_.lower() + projector_.on();
  }
  std::string stop() const { return lights_.dim(100); }

 private:
  Lights lights_;
  Screen screen_;
  Projector projector_;
};

int main() {
  MovieNight m;
  std::cout << m.start() << " " << m.stop() << "\\n";
}
`,
    output: "L20SP L100",
    options: ["L20SP L100", "PSL20 L100", "L20 S P L100", "L20SP L20"],
    answer: [0],
    explain: "The facade fixes the order: dim, then lower, then on. The caller gets one start() call and cannot get the sequence wrong. In real code the facade would call the subsystem and return a result or throw, not build strings; the strings here make the order visible.",
  },
  {
    id: "sb-mcq-fa-godclass",
    kind: "mcq",
    topic: "L4.facade",
    level: 3,
    prompt: "A reviewer says your OrderFacade has grown to 40 methods and contains pricing rules. What is the right response?",
    options: [
      "A facade should only orchestrate: move the business rules into domain classes, and split the facade by use case if it is still large",
      "Add more methods; facades are meant to be big",
      "Make it a Singleton so there is only one",
      "Replace it with inheritance from every subsystem",
    ],
    answer: [0],
    explain: "A Facade that accumulates logic becomes a god class that violates Single Responsibility and is hard to test. Keep it thin, delegate rules to the subsystem, and prefer several focused facades (checkout, returns) over one for everything.",
  },
  {
    id: "sb-mcq-fa-vs-adapter",
    kind: "mcq",
    topic: "L4.facade",
    level: 2,
    prompt: "Facade or Adapter: you are wrapping one legacy class to match an interface your code already defines. Which is it?",
    options: [
      "Adapter, because the target interface already exists and you are converting to it; a Facade defines a new simplified interface over several classes",
      "Facade, because it wraps something",
      "Both are identical in intent",
      "Neither; use a Singleton",
    ],
    answer: [0],
    explain: "Direction matters. Adapter conforms to an interface that is given. Facade invents a new, simpler one, usually over several collaborators. Both are wrappers, but the intent differs.",
  },

  // ---- Flyweight -------------------------------------------------------
  {
    id: "sb-mcq-fl-intent",
    kind: "mcq",
    topic: "L4.flyweight",
    level: 1,
    prompt: "What does the Flyweight pattern save, and how?",
    options: [
      "Memory: it shares the intrinsic (identical, immutable) part of many objects and passes the extrinsic (per-use) part in from outside",
      "CPU time: it caches the result of every function call",
      "Disk space: it compresses files on write",
      "Network calls: it batches requests",
    ],
    answer: [0],
    explain: "A million tree objects can share a handful of TreeType objects (mesh, texture) while each stores only position. The shared part must be immutable, or sharing becomes a bug.",
  },
  {
    id: "sb-pat-fl-glyphs",
    kind: "pattern",
    topic: "L4.flyweight",
    level: 2,
    prompt: "A text editor stores one object per character, 5 million of them. Font, size and glyph shape repeat constantly, and only the position differs. Which Patternling fits?",
    options: ["Flytile (Flyweight)", "Clonewisp (Prototype)", "Fractree (Composite)", "Proxifox (Proxy)"],
    answer: [0],
    explain: "Share the repeated glyph/style data and keep only position per character: Flyweight. Prototype is about copying, which would duplicate that data instead.",
  },
  {
    id: "sb-pred-fl-pool",
    kind: "predict",
    topic: "L4.flyweight",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <map>
#include <memory>
#include <string>

struct TreeType {
  std::string species;
};

class TreeFactory {
 public:
  std::shared_ptr<const TreeType> get(const std::string& species) {
    auto it = cache_.find(species);
    if (it != cache_.end()) return it->second;
    auto t = std::make_shared<const TreeType>(TreeType{species});
    cache_[species] = t;
    return t;
  }
  std::size_t distinct() const { return cache_.size(); }

 private:
  std::map<std::string, std::shared_ptr<const TreeType>> cache_;
};

struct Tree {
  int x, y;
  std::shared_ptr<const TreeType> type;
};

int main() {
  TreeFactory f;
  Tree a{1, 1, f.get("oak")};
  Tree b{2, 5, f.get("pine")};
  Tree c{9, 3, f.get("oak")};
  std::cout << f.distinct() << " " << (a.type == c.type) << " " << (a.type == b.type) << "\\n";
}
`,
    output: "2 1 0",
    options: ["2 1 0", "3 0 0", "2 0 0", "3 1 0"],
    answer: [0],
    explain: "Three trees, two species, so the factory holds two TreeType objects. a and c point at the very same oak (pointer equality is 1); a and b differ. Position (x, y) is the extrinsic state kept per tree. The shared type is const because mutation would leak across all users.",
  },
  {
    id: "sb-mcq-fl-when",
    kind: "mcq",
    topic: "L4.flyweight",
    level: 3,
    prompt: "A teammate wants to apply Flyweight to a few hundred `Customer` objects that each have a unique name and email. What do you say?",
    options: [
      "Not worth it: there is little repeated intrinsic state and the factory, lookup and indirection add cost and complexity for a negligible saving",
      "Yes, Flyweight always reduces memory",
      "Yes, but make the shared objects mutable",
      "Use Singleton instead for each customer",
    ],
    answer: [0],
    explain: "Flyweight pays off with huge counts and a high ratio of shared to unique state. Measure first. With unique data per object there is nothing to share, and the indirection costs both clarity and cache locality.",
  },
  {
    id: "sb-smell-fl-dup",
    kind: "smell",
    topic: "L4.flyweight",
    level: 2,
    prompt: "Name the smell and the principle it strains (look at memory, not only correctness).",
    code: `struct Particle {
  float x, y, vx, vy;
  std::string spriteName;     // "spark" for 1M particles
  std::vector<uint8_t> image; // 4 KB, identical for every "spark"
};
std::vector<Particle> particles(1'000'000);`,
    options: [
      "Identical heavy data is copied into every object (about 4 GB here); share the immutable part with Flyweight",
      "A virtual call in a hot loop; Liskov Substitution",
      "A method that does two jobs; Single Responsibility",
      "A missing virtual destructor; Open/Closed",
    ],
    answer: [0],
    explain: "A million copies of the same 4 KB image cost about 4 GB. Keep one shared immutable Sprite and let each Particle hold a pointer or id plus its own position and velocity. This is a resource problem as much as a design one.",
  },

  // ---- Proxy -----------------------------------------------------------
  {
    id: "sb-mcq-px-intent",
    kind: "mcq",
    topic: "L4.proxy",
    level: 1,
    prompt: "What is a Proxy?",
    options: [
      "A stand-in with the same interface as the real object that controls access to it (lazy creation, permission checks, caching, remote calls)",
      "A wrapper that always changes the interface of the object",
      "A way to build objects step by step",
      "A tree of objects handled as one",
    ],
    answer: [0],
    explain: "Because it keeps the interface, the client cannot tell the difference. The proxy decides whether, when and how to forward the call. Adapter changes the interface; Decorator adds behaviour but is not about controlling access.",
  },
  {
    id: "sb-pat-px-lazy",
    kind: "pattern",
    topic: "L4.proxy",
    level: 1,
    prompt: "A gallery must show 500 thumbnails but only load a full image when one is opened. Callers should use one Image interface throughout. Which Patternling fits?",
    options: ["Proxifox (Proxy)", "Flytile (Flyweight)", "Facadeon (Facade)", "Bridgeback (Bridge)"],
    answer: [0],
    explain: "A virtual proxy implements Image, holds the filename, and loads the real image on first use. Flyweight shares identical data; this is about deferring creation.",
  },
  {
    id: "sb-pred-px-lazy",
    kind: "predict",
    topic: "L4.proxy",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <string>

struct Image {
  virtual ~Image() = default;
  virtual void show() const = 0;
};
struct RealImage : Image {
  explicit RealImage(std::string f) : file_(std::move(f)) { std::cout << "load " << file_ << "\\n"; }
  void show() const override { std::cout << "show " << file_ << "\\n"; }

 private:
  std::string file_;
};
class LazyImage : public Image {
 public:
  explicit LazyImage(std::string f) : file_(std::move(f)) {}
  void show() const override {
    if (!real_) real_ = std::make_unique<RealImage>(file_);
    real_->show();
  }

 private:
  std::string file_;
  mutable std::unique_ptr<RealImage> real_;
};

int main() {
  LazyImage img("a.png");
  std::cout << "created\\n";
  img.show();
  img.show();
}
`,
    output: "created\nload a.png\nshow a.png\nshow a.png",
    options: [
      "created\nload a.png\nshow a.png\nshow a.png",
      "load a.png\ncreated\nshow a.png\nshow a.png",
      "created\nload a.png\nshow a.png\nload a.png\nshow a.png",
      "load a.png\ncreated\nshow a.png\nload a.png\nshow a.png",
    ],
    answer: [0],
    explain: "Construction of the proxy is cheap, so 'created' prints first. The first show() builds the RealImage (which prints 'load') and later calls reuse it. mutable lets a const method fill the cache; it is the honest use of mutable, but note it makes this proxy unsafe to share between threads without a lock or std::call_once.",
  },
  {
    id: "sb-pred-px-guard",
    kind: "predict",
    topic: "L4.proxy",
    level: 3,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <string>

struct Vault {
  virtual ~Vault() = default;
  virtual int withdraw(int amount) = 0;
};
struct RealVault : Vault {
  int balance = 100;
  int withdraw(int amount) override {
    balance -= amount;
    return balance;
  }
};
class GuardedVault : public Vault {
 public:
  GuardedVault(std::unique_ptr<Vault> v, bool admin) : v_(std::move(v)), admin_(admin) {}
  int withdraw(int amount) override {
    if (!admin_ || amount > 80) return -1;
    return v_->withdraw(amount);
  }

 private:
  std::unique_ptr<Vault> v_;
  bool admin_;
};

int main() {
  GuardedVault user(std::make_unique<RealVault>(), false);
  GuardedVault admin(std::make_unique<RealVault>(), true);
  std::cout << user.withdraw(10) << " " << admin.withdraw(30) << " " << admin.withdraw(90) << " " << admin.withdraw(30) << "\\n";
}
`,
    output: "-1 70 -1 40",
    options: ["-1 70 -1 40", "-1 70 10 -20", "90 70 -1 40", "-1 70 -1 70"],
    answer: [0],
    explain: "The protection proxy rejects the non-admin (-1) and over-limit requests (90 > 80, -1), and the rejected call never reaches the real vault. The admin's two successful withdrawals take the balance 100 to 70 to 40. Using the order of evaluation inside one cout expression is unspecified before C++17; in C++17 the << chain is sequenced left to right, which this program relies on.",
  },
  {
    id: "sb-mcq-px-vs-deco",
    kind: "mcq",
    topic: "L4.proxy",
    level: 3,
    prompt: "Proxy and Decorator both implement the same interface and hold the real object. What most reliably separates them?",
    options: [
      "Intent and lifecycle: a proxy controls access to (and often creates or locates) its subject, while a decorator is composed by the client to add responsibilities and can be stacked freely",
      "A proxy never forwards calls",
      "A decorator must be a singleton",
      "A proxy can only be written in Java",
    ],
    answer: [0],
    explain: "The structure is the same, so name the purpose: lazy loading, access control, caching, remote stub (Proxy) versus layering behaviour such as compression or logging (Decorator). A caching proxy sits on the boundary; decorators are the client's choice.",
  },
  {
    id: "sb-smell-px-cache",
    kind: "smell",
    topic: "L4.proxy",
    level: 3,
    prompt: "Name the smell and the principle it strains.",
    code: `class WeatherClient {
 public:
  Forecast get(const City& c) {
    if (auto it = cache_.find(c.id); it != cache_.end()) return it->second;
    Forecast f = httpGet("https://api.example/weather/" + c.id);
    cache_[c.id] = f;
    return f;
  }
 private:
  std::unordered_map<std::string, Forecast> cache_;
};`,
    options: [
      "Caching and remote access are tangled in one class; Single Responsibility (a caching Proxy over a plain client would separate them)",
      "A fat interface; Interface Segregation",
      "A subclass breaking its base contract; Liskov Substitution",
      "An unnecessary abstract class; Open/Closed",
    ],
    answer: [0],
    explain: "The client both talks to the network and manages cache policy (expiry is missing too). A CachingWeather proxy implementing the same Weather interface keeps each concern testable, and the cache can be added, removed or swapped without touching the HTTP code.",
  },
  {
    id: "sb-mcq-px-kinds",
    kind: "mcq",
    topic: "L4.proxy",
    level: 2,
    prompt: "Which of these is a protection proxy rather than a virtual, caching or remote proxy?",
    options: [
      "A wrapper that checks the caller's role before forwarding a delete request",
      "A wrapper that loads a large file on first access",
      "A local stub that serialises calls and sends them to a server",
      "A wrapper that remembers the result of an expensive call",
    ],
    answer: [0],
    explain: "Access control is the protection proxy's job. The others are, in order, a virtual proxy, a remote proxy and a caching proxy. Naming the kind in an interview shows you are choosing the pattern, not reciting it.",
  },

  // ---- Cross-pattern judgement -----------------------------------------
  {
    id: "sb-mcq-x-wrapper-pick",
    kind: "mcq",
    topic: "L4.compare",
    level: 3,
    prompt: "You wrap an object with the same interface and forward calls. Which question best chooses between Decorator, Proxy and Adapter?",
    options: [
      "Do I change the interface (Adapter), add behaviour the caller opts into (Decorator), or control access to the subject (Proxy)?",
      "Which one has the fewest lines of code?",
      "Which one is mentioned first in the GoF book?",
      "Whether the class has a virtual destructor",
    ],
    answer: [0],
    explain: "All three are wrappers, which is why interviews love this question. Answer with the axis that distinguishes them: interface change, added responsibility or access control. Then give one concrete example of each.",
  },
  {
    id: "sb-mcq-x-over-engineer",
    kind: "mcq",
    topic: "L4.compare",
    level: 3,
    prompt: "In a 45-minute machine-coding round you need to add logging to one service call. What is the pragmatic choice?",
    options: [
      "Add the log line directly or one small decorator if several services need it; do not build a framework of wrappers for one call site",
      "Create a Decorator, Proxy and Facade hierarchy to show you know patterns",
      "Rewrite the service as a Composite",
      "Skip logging; interviewers never care",
    ],
    answer: [0],
    explain: "Patterns exist to remove a real pain. One call site has no pain. Strong candidates say what they would extract once a second use appears, and keep the first version obvious. Over-application is a common SDE II to Senior differentiator in feedback.",
  },
  {
    id: "sb-pat-x-ui-tree",
    kind: "pattern",
    topic: "L4.compare",
    level: 2,
    prompt: "A UI toolkit lets a Panel contain Buttons and other Panels, and calling render() on the root draws everything. Which Patternling fits?",
    options: ["Fractree (Composite)", "Facadeon (Facade)", "Bridgeback (Bridge)", "Flytile (Flyweight)"],
    answer: [0],
    explain: "A panel holds children of the same Widget interface and renders them recursively: Composite. If many buttons shared one icon bitmap you might add Flyweight on top, but the container structure is Composite.",
  },
];
