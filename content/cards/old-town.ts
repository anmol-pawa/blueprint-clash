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
  {
    id: "ot-mcq-struct",
    kind: "mcq",
    topic: "L1.classes",
    level: 1,
    prompt: "In C++, what is the only language-level difference between `struct` and `class`?",
    options: ["Default access: struct members are public, class members are private", "Only classes can have member functions", "Only structs can be copied", "Only classes can be inherited from"],
    answer: [0],
    explain: "Both can have functions, constructors, inheritance and everything else. The default access (and default inheritance access) differs. By convention, struct signals a plain bag of data and class signals a type that protects an invariant.",
  },
  {
    id: "ot-mcq-invariant",
    kind: "mcq",
    topic: "L1.encapsulation",
    level: 1,
    prompt: "Why does a BankAccount keep its balance private instead of exposing a public `balance` field?",
    options: ["So every change goes through code that can enforce rules such as 'never below zero'", "Private fields are faster to read", "Public fields cannot be const", "The compiler requires it for classes with constructors"],
    answer: [0],
    explain: "Encapsulation is about invariants: if any caller can write the field, no single place can guarantee the rule. Funnel writes through deposit() and withdraw() and the invariant lives in one spot, which also makes it testable.",
  },
  {
    id: "ot-mcq-initlist",
    kind: "mcq",
    topic: "L1.constructors",
    level: 1,
    prompt: "Which statements about member initialiser lists are true? Choose all that apply.",
    options: [
      "They construct members directly, rather than default-constructing then assigning",
      "They are required to initialise const members and reference members",
      "Members are initialised in the order the list is written",
      "They can only be used with primitive types",
    ],
    answer: [0, 1],
    explain: "A const or reference member cannot be assigned later, so it must be initialised in the list. Members are initialised in declaration order, not list order, which is why a mismatched order triggers a -Wreorder warning and can read an uninitialised member.",
  },
  {
    id: "ot-mcq-explicit",
    kind: "mcq",
    topic: "L1.constructors",
    level: 2,
    prompt: "What does marking a single-argument constructor `explicit` prevent?",
    options: ["Silent implicit conversions, such as passing an int where a Buffer is expected", "Copying of the class", "Calling the constructor with braces", "Deriving from the class"],
    answer: [0],
    explain: "Without explicit, `void f(Buffer); f(64);` quietly builds a Buffer from 64. That is almost never intended. Make single-argument constructors explicit unless the conversion is truly natural (like string from a literal).",
  },
  {
    id: "ot-mcq-const",
    kind: "mcq",
    topic: "L1.const",
    level: 1,
    prompt: "What does the trailing `const` in `int size() const;` promise?",
    options: ["The function does not modify the object's observable state, so it is callable on const objects", "The return value cannot be changed", "The function runs at compile time", "The function cannot throw"],
    answer: [0],
    explain: "A const member function gets a `const this`, so it can be called through a const reference and cannot assign to ordinary members. Mark every read-only function const; otherwise callers holding a const& cannot use your class.",
  },
  {
    id: "ot-mcq-static",
    kind: "mcq",
    topic: "L1.static",
    level: 2,
    prompt: "A class counts how many instances were created with a `static int count;`. Which is true?",
    options: ["One copy is shared by all instances and it needs a single out-of-class definition (or `inline`)", "Each object gets its own copy", "It can only be read inside constructors", "It is destroyed when the first object dies"],
    answer: [0],
    explain: "A static data member belongs to the class, not to any object. Declare it in the class and define it once (or write `inline static int count = 0;` in C++17). Remember it is shared mutable state, so it needs care in multithreaded code.",
  },
  {
    id: "ot-mcq-weak",
    kind: "mcq",
    topic: "L1.smart-pointers",
    level: 2,
    prompt: "A Child needs to refer back to its Parent, and the Parent owns the Child through a shared_ptr. What should the Child hold?",
    options: ["std::weak_ptr<Parent>", "std::shared_ptr<Parent>", "std::unique_ptr<Parent>", "Parent by value"],
    answer: [0],
    explain: "If both sides hold shared_ptrs, the reference counts never reach zero and both objects leak (a cycle). A weak_ptr observes without owning and can be checked with lock() before use.",
  },
  {
    id: "ot-mcq-optional",
    kind: "mcq",
    topic: "L1.optional",
    level: 2,
    prompt: "`findUser(id)` may legitimately find nothing. Which return type states that best?",
    options: ["std::optional<User>", "User with a magic 'empty' value", "User* where nullptr means 'ownership transferred'", "int status code plus an output parameter"],
    answer: [0],
    explain: "optional makes 'maybe a value' part of the type, so callers must handle the empty case. Magic values are easy to forget to check, and a status code with an out-parameter is noisier. Use an error type when callers also need to know why it failed.",
  },
  {
    id: "ot-mcq-enum",
    kind: "mcq",
    topic: "L1.enum-class",
    level: 1,
    prompt: "Why prefer `enum class Color { Red, Green }` over a plain `enum`?",
    options: ["Enumerators are scoped (Color::Red) and do not convert silently to int", "It makes the enum smaller than one byte", "It allows more than 256 values", "Plain enums cannot be used in switch statements"],
    answer: [0],
    explain: "Plain enum leaks its names into the enclosing scope and converts to int implicitly, so unrelated enums can collide or be compared by mistake. enum class fixes both and can name its underlying type.",
  },
  {
    id: "ot-mcq-ownview",
    kind: "mcq",
    topic: "L1.ownership",
    level: 2,
    prompt: "A function only reads a Widget and does not keep it. How should it take the parameter?",
    options: ["const Widget&", "std::unique_ptr<Widget>", "std::shared_ptr<Widget>", "Widget*, which the function deletes"],
    answer: [0],
    explain: "A reference (or raw pointer) is the non-owning view: the caller keeps ownership. Taking a smart pointer parameter says 'I take part in ownership', which is the wrong message and, for shared_ptr, costs an atomic increment.",
  },
  {
    id: "ot-smell-public",
    kind: "smell",
    topic: "L1.encapsulation",
    level: 1,
    prompt: "What is wrong with this class?",
    code: `class Temperature {
 public:
  double kelvin;
};
// elsewhere: t.kelvin = -40;`,
    options: [
      "A public mutable field lets anyone break the invariant 'kelvin >= 0'",
      "Doubles cannot be class members",
      "It needs a virtual destructor",
      "It should be a struct, because it has no functions",
    ],
    answer: [0],
    explain: "Nothing stops callers writing an impossible value. Make the field private and set it through a constructor or setter that validates. (Even a plain struct is fine for data with no invariant; this one has one.)",
  },
  {
    id: "ot-smell-const",
    kind: "smell",
    topic: "L1.const",
    level: 2,
    prompt: "This will not compile when `print` is called with a const reference. Why, and what is the fix?",
    code: `class Account {
 public:
  int balance() { return balance_; }
 private:
  int balance_ = 0;
};
void print(const Account& a) { std::cout << a.balance(); }`,
    options: [
      "balance() is not const; declare it `int balance() const`",
      "balance_ must be public",
      "print must take Account by value",
      "balance() must be static",
    ],
    answer: [0],
    explain: "A const Account& can only call const member functions. A getter that does not modify state should always be const. Taking the object by value would only hide the problem by copying.",
  },
  {
    id: "ot-smell-shared",
    kind: "smell",
    topic: "L1.ownership",
    level: 2,
    prompt: "What is questionable about this design?",
    code: `class Document {
 public:
  explicit Document(std::shared_ptr<Font> f) : font_(std::move(f)) {}
 private:
  std::shared_ptr<Font> font_;   // only Document ever uses this Font
};`,
    options: [
      "shared_ptr claims shared ownership nobody needs; unique_ptr (or a plain member) is clearer and cheaper",
      "Fonts must always be stored by raw pointer",
      "The constructor should not take its argument by value",
      "std::move on a shared_ptr is undefined behaviour",
    ],
    answer: [0],
    explain: "Reach for unique_ptr first and escalate to shared_ptr only when ownership genuinely has several owners, such as a cache shared by many users. Over-using shared_ptr hides the real ownership story and adds atomic reference counting.",
  },
  {
    id: "ot-pred-order",
    kind: "predict",
    topic: "L1.constructors",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
struct A { A() { std::cout << "A "; } };
struct B { B() { std::cout << "B "; } };
struct Holder {
  B b;
  A a;
  Holder() : a(), b() { std::cout << "H\\n"; }
};

int main() { Holder h; }
`,
    output: "B A H",
    options: ["B A H", "A B H", "H A B", "A B"],
    answer: [0],
    explain: "Members are initialised in the order they are declared in the class (b, then a), not the order written in the initialiser list. The constructor body runs after all members exist.",
  },
  {
    id: "ot-pred-copy",
    kind: "predict",
    topic: "L1.copy",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
struct Tracer {
  Tracer() { std::cout << "ctor "; }
  Tracer(const Tracer&) { std::cout << "copy "; }
  ~Tracer() { std::cout << "dtor "; }
};
void byValue(Tracer) {}
void byRef(const Tracer&) {}

int main() {
  Tracer t;
  byValue(t);
  byRef(t);
  std::cout << "end\\n";
}
`,
    output: "ctor copy dtor end\ndtor",
    options: ["ctor copy dtor end\ndtor", "ctor end\ndtor", "ctor copy copy end\ndtor dtor", "ctor copy end\ndtor dtor"],
    answer: [0],
    explain: "Passing by value copy-constructs a temporary, which dies when the call returns, before 'end'. Passing by const reference copies nothing. The original t dies at the end of main.",
  },
  {
    id: "ot-pred-static",
    kind: "predict",
    topic: "L1.static",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
struct Ticket {
  Ticket() : id(++next) {}
  int id;
  static inline int next = 0;
};

int main() {
  Ticket a, b;
  { Ticket c; }
  Ticket d;
  std::cout << a.id << b.id << d.id << " " << Ticket::next << "\\n";
}
`,
    output: "124 4",
    options: ["124 4", "123 3", "124 3", "121 1"],
    answer: [0],
    explain: "The counter is shared by the whole class and never decrements: c took id 3 and was destroyed, so d gets 4 and next ends at 4. A static member is class state, not object state.",
  },
  {
    id: "ot-pred-sharedcount",
    kind: "predict",
    topic: "L1.smart-pointers",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>

int main() {
  auto a = std::make_shared<int>(5);
  std::weak_ptr<int> w = a;
  {
    auto b = a;
    std::cout << a.use_count() << " ";
  }
  std::cout << a.use_count() << " " << w.use_count() << " ";
  a.reset();
  std::cout << (w.expired() ? "expired" : "alive") << "\\n";
}
`,
    output: "2 1 1 expired",
    options: ["2 1 1 expired", "2 1 2 alive", "2 2 1 expired", "1 1 1 alive"],
    answer: [0],
    explain: "A copy of a shared_ptr bumps the strong count; leaving the scope drops it. A weak_ptr does not add to the strong count, so w.use_count() reports the one remaining owner. After reset() there are none, so w is expired.",
  },
  {
    id: "ot-pred-delegate",
    kind: "predict",
    topic: "L1.constructors",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
struct Window {
  Window() : Window(80, 24) { std::cout << "default\\n"; }
  Window(int w, int h) : w_(w), h_(h) { std::cout << "sized " << w_ << "x" << h_ << "\\n"; }
 private:
  int w_, h_;
};

int main() { Window w; }
`,
    output: "sized 80x24\ndefault",
    options: ["sized 80x24\ndefault", "default\nsized 80x24", "default", "sized 80x24"],
    answer: [0],
    explain: "A delegating constructor hands construction to another constructor, which runs completely first. Only then does the delegating constructor's own body execute. This avoids duplicating initialisation logic.",
  },
  {
    id: "ot-pred-moveout",
    kind: "predict",
    topic: "L1.move",
    level: 3,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

int main() {
  std::vector<std::string> v;
  std::string s(40, 'x');
  v.push_back(s);
  v.push_back(std::move(s));
  std::cout << v.size() << " " << v[0].size() << " " << v[1].size() << " " << s.size() << "\\n";
}
`,
    output: "2 40 40 0",
    options: ["2 40 40 0", "2 40 40 40", "2 40 0 0", "2 0 40 0"],
    answer: [0],
    explain: "The first push_back copies s. The second moves it into the vector, which steals its buffer. This is a long string, so there is no small-string optimisation, and the moved-from s is left empty. (Moved-from strings are valid but unspecified in general; empty is what every mainstream implementation does, so never rely on the content, only reuse after assigning.)",
  },
];
