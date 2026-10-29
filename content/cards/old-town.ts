import type { Card } from "@/lib/battle/cards";

/** Old Town concept deck (CURRICULUM L1: classes, RAII, ownership, polymorphism). Original wording. */
export const OLD_TOWN_DECK: Card[] = [
  {
    id: "ot-mcq-raii",
    kind: "mcq",
    topic: "L1.raii",
    level: 1,
    prompt: "What does RAII tie to an object's lifetime?",
    options: ["Ownership of a resource: acquired in the constructor, released in the destructor", "The number of virtual functions it has", "The order in which headers are included", "Whether it may be copied across threads"],
    answer: [0],
    explain: "RAII makes releasing a resource automatic: the destructor runs on every exit path, including early returns and exceptions, so a lock, file or allocation cannot leak because someone forgot a cleanup call.",
  },
  {
    id: "ot-mcq-unique",
    kind: "mcq",
    topic: "L1.ownership",
    level: 1,
    prompt: "A class owns exactly one heap object that nobody else shares. Which member type states that most clearly?",
    options: ["T*", "std::unique_ptr<T>", "std::shared_ptr<T>", "T&"],
    answer: [1],
    explain: "unique_ptr says 'sole owner' in the type and deletes the object for you. shared_ptr pays for shared ownership you do not have (a control block and atomic counts), and a raw pointer or reference says nothing about who deletes.",
  },
  {
    id: "ot-mcq-rule",
    kind: "mcq",
    topic: "L1.rule-of-zero",
    level: 2,
    prompt: "Which are true of the Rule of Zero? Choose all that apply.",
    options: [
      "Prefer members that manage themselves (vector, string, unique_ptr) so you write no special members",
      "Every class should define all five special member functions explicitly",
      "A class that owns a raw resource directly should wrap it in a small RAII type",
      "It forbids classes from having destructors in any circumstance",
    ],
    answer: [0, 2],
    explain: "The Rule of Zero pushes resource management into dedicated types so most classes need none of the special members. It does not ban destructors: the small RAII wrapper is exactly where a destructor belongs.",
  },
  {
    id: "ot-pat-notify",
    kind: "pattern",
    topic: "L3.observer",
    level: 1,
    prompt: "A stock ticker must tell any number of screens when a price changes, without knowing what the screens do with it. Which Patternling answers?",
    options: ["Owlserver (Observer)", "Shapeshift (State)", "Templar (Template Method)", "Solo (Singleton)"],
    answer: [0],
    explain: "One subject, many dependents that subscribe and get notified: Observer. State changes behaviour of one object by its mode, Template Method fixes an algorithm skeleton, and Singleton is about instance count, not notification.",
  },
  {
    id: "ot-pat-wrap",
    kind: "pattern",
    topic: "L3.decorator",
    level: 2,
    prompt: "You need optional logging, compression and encryption around a byte stream, combinable in any order at run time. Which Patternling fits best?",
    options: ["Shellcrab (Decorator)", "Forgebot (Factory Method)", "Facadeon (Facade)", "Clonewisp (Prototype)"],
    answer: [0],
    explain: "Each wrapper has the same interface as the stream and adds one behaviour, so they stack in any combination. A Facade would simplify a subsystem rather than layer behaviour, and subclassing every combination explodes (2^n classes).",
  },
  {
    id: "ot-smell-switch",
    kind: "smell",
    topic: "L2.ocp",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `double area(const Shape& s) {
  switch (s.kind) {
    case Kind::Circle: return 3.14159 * s.r * s.r;
    case Kind::Rect:   return s.w * s.h;
  }
  return 0;
}`,
    options: ["Type-code switch; Open/Closed (adding a shape edits this function)", "God class; Single Responsibility", "Fat interface; Interface Segregation", "Feature envy; Liskov Substitution"],
    answer: [0],
    explain: "Every new shape forces an edit to each switch like this one. A virtual area() on a Shape hierarchy lets you add a shape by adding a class and leaving existing code alone, which is what Open/Closed asks for.",
  },
  {
    id: "ot-smell-delete",
    kind: "smell",
    topic: "L1.ownership",
    level: 1,
    prompt: "What is wrong with this class?",
    code: `class Buffer {
 public:
  explicit Buffer(size_t n) : data_(new char[n]) {}
  ~Buffer() { delete[] data_; }
 private:
  char* data_;
};`,
    options: [
      "Copying it double-deletes data_ (it breaks the Rule of Three)",
      "The destructor must be virtual",
      "delete[] is never valid for char arrays",
      "Constructors may not be explicit",
    ],
    answer: [0],
    explain: "The compiler-generated copy duplicates the pointer, so two Buffers delete the same array. Fix it by making the type non-copyable, writing copy/move properly, or (best) holding a std::vector<char> or unique_ptr<char[]>.",
  },
  {
    id: "ot-pred-slice",
    kind: "predict",
    topic: "L1.slicing",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
struct Animal { virtual const char* speak() const { return "..."; } };
struct Dog : Animal { const char* speak() const override { return "woof"; } };

int main() {
  Dog d;
  Animal a = d;
  const Animal& r = d;
  std::cout << a.speak() << " " << r.speak() << "\\n";
}
`,
    output: "... woof",
    options: ["... woof", "woof woof", "... ...", "woof ..."],
    answer: [0],
    explain: "Copying a Dog into an Animal object slices off the Dog part, and the copy is a real Animal, so its speak() is Animal's. The reference still names the original Dog, so virtual dispatch finds Dog::speak.",
  },
  {
    id: "ot-pred-ctor",
    kind: "predict",
    topic: "L1.virtual-ctor",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
struct Base {
  Base() { who(); }
  virtual void who() const { std::cout << "Base\\n"; }
  virtual ~Base() = default;
};
struct Derived : Base {
  void who() const override { std::cout << "Derived\\n"; }
};

int main() { Derived d; d.who(); }
`,
    output: "Base\nDerived",
    options: ["Base\nDerived", "Derived\nDerived", "Derived\nBase", "Base\nBase"],
    answer: [0],
    explain: "While Base's constructor runs, the object's dynamic type is Base (the Derived part does not exist yet), so the virtual call resolves to Base::who. Never rely on virtual dispatch inside constructors or destructors.",
  },
  {
    id: "ot-pred-dtor",
    kind: "predict",
    topic: "L1.raii",
    level: 1,
    prompt: "What does this program print?",
    code: `#include <iostream>
struct Member { ~Member() { std::cout << "~Member\\n"; } };
struct Base { virtual ~Base() { std::cout << "~Base\\n"; } };
struct Derived : Base {
  Member m;
  ~Derived() override { std::cout << "~Derived\\n"; }
};

int main() {
  Base* p = new Derived;
  delete p;
}
`,
    output: "~Derived\n~Member\n~Base",
    options: ["~Derived\n~Member\n~Base", "~Base\n~Member\n~Derived", "~Derived\n~Base\n~Member", "~Base"],
    answer: [0],
    explain: "Because ~Base is virtual, delete through a Base* runs the most-derived destructor first. Then members are destroyed, then the base: construction order in reverse. Without virtual, this delete would be undefined behaviour.",
  },
  {
    id: "ot-pred-move",
    kind: "predict",
    topic: "L1.move",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>
#include <utility>

int main() {
  auto a = std::make_unique<int>(7);
  auto b = std::move(a);
  std::cout << (a ? "a owns" : "a null") << " " << (b ? *b : -1) << "\\n";
}
`,
    output: "a null 7",
    options: ["a null 7", "a owns 7", "a null -1", "does not compile"],
    answer: [0],
    explain: "Moving a unique_ptr transfers ownership and leaves the source null (this one is guaranteed by the standard, unlike most moved-from types). Copying it would be the compile error.",
  },
];
