import type { Card } from "@/lib/battle/cards";

/** Old Town, second half (CURRICULUM L1/L2: polymorphism, virtual destructors, slicing, variant, LSP). Original wording. */
export const OLD_TOWN_POLY_DECK: Card[] = [
  {
    id: "ot2-mcq-dispatch",
    kind: "mcq",
    topic: "L1.polymorphism",
    level: 1,
    prompt: "When does a call to a virtual function pick the derived override at run time?",
    options: ["Through a pointer or reference to the base, when the object really is a Derived", "Only when the object is passed by value", "Only inside constructors", "Whenever the function is declared in a header"],
    answer: [0],
    explain: "Virtual dispatch looks at the dynamic type of the object behind a pointer or reference. Passing by value copies only the Base part (slicing), so the dynamic type is lost, and inside a constructor the object is still only a Base.",
  },
  {
    id: "ot2-mcq-vdtor",
    kind: "mcq",
    topic: "L1.virtual-destructor",
    level: 1,
    prompt: "Why must a base class meant for polymorphic use have a virtual destructor?",
    options: [
      "Deleting a Derived through a Base* with a non-virtual destructor is undefined behaviour",
      "Without it, the derived class cannot override other virtual functions",
      "It makes the class abstract",
      "It stops the compiler generating a copy constructor",
    ],
    answer: [0],
    explain: "delete on a Base* must run the most-derived destructor, and only a virtual destructor guarantees that. Skipping it typically leaks the Derived members and is formally undefined. It does not make a class abstract (only a pure virtual does).",
  },
  {
    id: "ot2-pred-dtor-order",
    kind: "predict",
    topic: "L1.virtual-destructor",
    level: 1,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>

struct Base {
  virtual ~Base() { std::cout << "~Base "; }
};
struct Derived : Base {
  ~Derived() override { std::cout << "~Derived "; }
};

int main() {
  std::unique_ptr<Base> p = std::make_unique<Derived>();
  p.reset();
  std::cout << "\\n";
}
`,
    output: "~Derived ~Base",
    options: ["~Derived ~Base", "~Base ~Derived", "~Base", "~Derived"],
    answer: [0],
    explain: "Destruction runs from the most-derived class back up to the base, the reverse of construction. Because ~Base is virtual, resetting a unique_ptr<Base> reaches ~Derived first and then ~Base.",
  },
  {
    id: "ot2-pred-slice-vector",
    kind: "predict",
    topic: "L1.slicing",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <vector>

struct Animal {
  virtual const char* sound() const { return "..."; }
  virtual ~Animal() = default;
};
struct Dog : Animal {
  const char* sound() const override { return "woof"; }
};

int main() {
  std::vector<Animal> byValue;
  byValue.push_back(Dog{});
  Dog d;
  const Animal& ref = d;
  std::cout << byValue[0].sound() << " " << ref.sound() << "\\n";
}
`,
    output: "... woof",
    options: ["... woof", "woof woof", "woof ...", "... ..."],
    answer: [0],
    explain: "vector<Animal> stores Animal objects, so pushing a Dog copies only its Animal part: the element is a plain Animal and says '...'. A reference keeps the real Dog, so dispatch finds the override. Use vector<unique_ptr<Animal>> to keep polymorphic objects.",
  },
  {
    id: "ot2-pred-nonvirtual-hide",
    kind: "predict",
    topic: "L1.polymorphism",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>

struct Base {
  void hello() const { std::cout << "Base "; }
  virtual void bye() const { std::cout << "Base\\n"; }
  virtual ~Base() = default;
};
struct Derived : Base {
  void hello() const { std::cout << "Derived "; }
  void bye() const override { std::cout << "Derived\\n"; }
};

int main() {
  Derived d;
  Base* b = &d;
  b->hello();
  b->bye();
}
`,
    output: "Base Derived",
    options: ["Base Derived", "Derived Derived", "Base Base", "Derived Base"],
    answer: [0],
    explain: "hello() is not virtual, so Derived::hello merely hides Base::hello, and a call through a Base* is resolved statically to Base. bye() is virtual, so the call dispatches to Derived. Hiding a non-virtual function is almost always a bug.",
  },
  {
    id: "ot2-pred-default-arg",
    kind: "predict",
    topic: "L2.virtual-pitfalls",
    level: 3,
    prompt: "What does this program print?",
    code: `#include <iostream>

struct Base {
  virtual void show(int x = 1) const { std::cout << "Base" << x << "\\n"; }
  virtual ~Base() = default;
};
struct Derived : Base {
  void show(int x = 2) const override { std::cout << "Derived" << x << "\\n"; }
};

int main() {
  Derived d;
  const Base& b = d;
  b.show();
}
`,
    output: "Derived1",
    options: ["Derived1", "Derived2", "Base1", "Base2"],
    answer: [0],
    explain: "Default arguments are filled in at compile time from the static type (Base), while the body is chosen at run time from the dynamic type (Derived). So you get Derived's body with Base's default. Never change a default argument in an override.",
  },
  {
    id: "ot2-mcq-override",
    kind: "mcq",
    topic: "L1.override",
    level: 1,
    prompt: "What does writing `override` on a member function buy you?",
    options: [
      "A compile error if it does not actually override a virtual function in a base class",
      "Faster calls because the compiler skips the vtable",
      "Permission to access private members of the base",
      "Nothing; it is only a comment",
    ],
    answer: [0],
    explain: "A signature typo (a missing const, a different parameter type) silently creates a brand-new function and the base version still runs. `override` turns that mistake into a compile error. It does not change speed or access.",
  },
  {
    id: "ot2-smell-no-override",
    kind: "smell",
    topic: "L1.override",
    level: 2,
    prompt: "Why does `render` never run through a `Widget&`?",
    code: `struct Widget {
  virtual void render() const { /* draw a box */ }
  virtual ~Widget() = default;
};

struct Button : Widget {
  void render() { /* draw a button */ }  // forgot const
};`,
    options: [
      "The signature differs by const, so Button::render hides rather than overrides; add `override` to catch it",
      "Widget::render must be pure virtual",
      "Button needs a virtual destructor of its own",
      "Virtual functions cannot be const",
    ],
    answer: [0],
    explain: "const is part of a member function's signature. render() and render() const are different functions, so Button's version is not an override and a Widget& still calls the base. Marking it `override` fails to compile and points straight at the mistake.",
  },
  {
    id: "ot2-mcq-abstract",
    kind: "mcq",
    topic: "L1.abstract",
    level: 1,
    prompt: "Which declaration makes `Shape` an abstract class that cannot be instantiated?",
    options: ["virtual double area() const = 0;", "virtual double area() const;", "double area() const = delete;", "static double area();"],
    answer: [0],
    explain: "`= 0` declares a pure virtual function: derived classes must override it before they can be created. A plain virtual has a body (or a link error), `= delete` removes a function rather than abstracting it, and a static function is not virtual at all.",
  },
  {
    id: "ot2-mcq-interface-shape",
    kind: "mcq",
    topic: "L1.interfaces",
    level: 2,
    prompt: "Which is the best shape for a C++ interface class? Choose all that apply.",
    options: [
      "Only pure virtual member functions, no data members",
      "A virtual destructor (usually `= default`)",
      "Copy construction left public so values can be sliced into it",
      "Non-owning use through references or smart pointers",
    ],
    answer: [0, 1, 3],
    explain: "An interface is a contract: pure virtuals, no state, and a virtual destructor so deleting through it is safe. Callers hold it by reference or smart pointer. Leaving public copying invites slicing, so polymorphic bases usually delete copy or expose a virtual clone().",
  },
  {
    id: "ot2-pred-clone",
    kind: "predict",
    topic: "L2.clone",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <memory>

struct Shape {
  virtual std::unique_ptr<Shape> clone() const = 0;
  virtual const char* name() const = 0;
  virtual ~Shape() = default;
};
struct Circle : Shape {
  std::unique_ptr<Shape> clone() const override { return std::make_unique<Circle>(*this); }
  const char* name() const override { return "circle"; }
};

int main() {
  std::unique_ptr<Shape> a = std::make_unique<Circle>();
  std::unique_ptr<Shape> b = a->clone();
  std::cout << b->name() << " " << (a.get() == b.get()) << "\\n";
}
`,
    output: "circle 0",
    options: ["circle 0", "circle 1", "shape 0", "does not compile"],
    answer: [0],
    explain: "A virtual clone() copies an object through its base interface without slicing: the Circle override makes a Circle. The copy lives at a different address, so the pointers differ. This is the polymorphic substitute for a copy constructor.",
  },
  {
    id: "ot2-mcq-final",
    kind: "mcq",
    topic: "L2.final",
    level: 2,
    prompt: "What does marking a class or an override `final` mean?",
    options: [
      "No further class may derive from it, or no further override of that function is allowed",
      "Its destructor is called last in the program",
      "It cannot be copied",
      "It is allocated in static storage",
    ],
    answer: [0],
    explain: "final closes a hierarchy at that point. It documents intent and lets the compiler devirtualise calls it can now resolve statically. It says nothing about copying or storage.",
  },
  {
    id: "ot2-mcq-ctor-virtual",
    kind: "mcq",
    topic: "L2.virtual-pitfalls",
    level: 2,
    prompt: "A Base constructor calls a virtual function that Derived overrides. Which function runs when you construct a Derived?",
    options: ["Base's version, because the Derived part does not exist yet", "Derived's version", "Whichever was declared last", "It does not compile"],
    answer: [0],
    explain: "During Base's constructor the dynamic type is Base, so dispatch stays in Base. Otherwise the override could touch Derived members that have not been initialised. Destructors behave the same way in reverse. Use a factory or an explicit init step for such cases.",
  },
  {
    id: "ot2-smell-switch-type",
    kind: "smell",
    topic: "L2.ocp",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `double pay(const Employee& e) {
  if (auto* m = dynamic_cast<const Manager*>(&e)) return m->salary() + m->bonus();
  if (auto* d = dynamic_cast<const Developer*>(&e)) return d->salary() + d->oncallPay();
  return e.salary();
}`,
    options: [
      "A chain of dynamic_casts; Open/Closed (every new role edits this function)",
      "Singleton abuse; Dependency Inversion",
      "Fat interface; Interface Segregation",
      "Missing virtual destructor; Liskov Substitution",
    ],
    answer: [0],
    explain: "Asking 'what concrete type are you?' re-creates a type-code switch with casts. Put pay() behind a virtual function (or a Strategy) on Employee so a new role is a new class and this function never changes.",
  },
  {
    id: "ot2-mcq-dyncast-ok",
    kind: "mcq",
    topic: "L2.rtti",
    level: 3,
    prompt: "When is dynamic_cast a defensible choice?",
    options: [
      "At a boundary where an optional capability is probed, such as asking a Widget for an optional Scrollable interface",
      "Everywhere you would otherwise write a virtual function",
      "To avoid writing a virtual destructor",
      "To convert unrelated types, such as int* to a class pointer",
    ],
    answer: [0],
    explain: "Probing for an optional capability is a legitimate, contained use, and it must be paired with a null check. Using it to branch on concrete types across the codebase is the OCP smell. It needs a polymorphic type and does not replace the virtual destructor.",
  },
  {
    id: "ot2-mcq-lsp",
    kind: "mcq",
    topic: "L2.lsp",
    level: 2,
    prompt: "`Square` inherits `Rectangle`, and `setWidth` on a Square also changes its height. What principle does this break?",
    options: [
      "Liskov Substitution: code that sets width and height independently gets surprised",
      "Single Responsibility",
      "Open/Closed",
      "Dependency Inversion",
    ],
    answer: [0],
    explain: "A subtype must keep the promises of its base. Code written against Rectangle can reasonably expect setWidth to leave height alone, and a Square breaks that. 'Is-a' in geometry is not 'substitutable-for' in behaviour; model them as separate immutable shapes or share an interface instead.",
  },
  {
    id: "ot2-smell-inherit-reuse",
    kind: "smell",
    topic: "L2.composition",
    level: 2,
    prompt: "What is the design problem here?",
    code: `class Stack : public std::vector<int> {
 public:
  void push(int x) { push_back(x); }
  int pop() { int v = back(); pop_back(); return v; }
};`,
    options: [
      "Public inheritance for reuse exposes insert, erase and the rest, so callers can break the stack invariant; prefer composition",
      "vector has no virtual destructor, so push_back is unsafe",
      "pop must be const",
      "Stacks must be abstract",
    ],
    answer: [0],
    explain: "Public inheritance says 'a Stack is a vector', and the whole vector interface leaks out, letting callers insert in the middle. Hold a vector as a private member (composition) and expose only push and pop. Inherit to substitute, not to reuse code.",
  },
  {
    id: "ot2-mcq-isp",
    kind: "mcq",
    topic: "L2.isp",
    level: 2,
    prompt: "A `Printer` interface has print(), scan() and fax(); a basic printer must stub out the last two. What should you do?",
    options: [
      "Split it into small role interfaces (Printable, Scannable, Faxable) so each class implements only what it supports",
      "Make the stubs throw and document them",
      "Add a boolean saying which methods work",
      "Make the base class a singleton",
    ],
    answer: [0],
    explain: "Interface Segregation: clients should not depend on methods they do not use. Throwing stubs also break Liskov (the base promised scan() works). Role interfaces keep each contract honest, and a multifunction device just implements several.",
  },
  {
    id: "ot2-pat-strategy",
    kind: "pattern",
    topic: "L3.strategy",
    level: 1,
    prompt: "A checkout must pick a shipping-cost rule (flat, weight-based, free-over-50) that can be swapped per order without editing checkout code. Which Patternling answers?",
    options: ["Swapwing (Strategy)", "Owlserver (Observer)", "Shellcrab (Decorator)", "Solo (Singleton)"],
    answer: [0],
    explain: "A family of interchangeable algorithms behind one interface, chosen by the caller: Strategy. Observer notifies, Decorator layers extra behaviour on the same object, and Singleton controls instance count.",
  },
  {
    id: "ot2-pat-template-method",
    kind: "pattern",
    topic: "L3.template-method",
    level: 2,
    prompt: "Report exporters always run open, write rows, close in that order, but each format writes rows differently. Which pattern puts the fixed skeleton in the base class?",
    options: ["Templar (Template Method)", "Forgebot (Factory Method)", "Clonewisp (Prototype)", "Facadeon (Facade)"],
    answer: [0],
    explain: "Template Method fixes the order of steps in a base class and lets subclasses fill in the variable steps. Compare Strategy, which achieves a similar split by composition instead of inheritance and swaps at run time.",
  },
  {
    id: "ot2-mcq-nvi",
    kind: "mcq",
    topic: "L2.nvi",
    level: 3,
    prompt: "What is the Non-Virtual Interface idiom?",
    options: [
      "Public non-virtual functions that call private virtual hooks, so the base controls pre- and post-conditions around the customisation point",
      "Making every function non-virtual for speed",
      "Using only static functions in interfaces",
      "A way to avoid virtual destructors",
    ],
    answer: [0],
    explain: "The base keeps the public API stable and wraps the virtual step with checks, locking or logging in one place. Derived classes override only the private hook. It is Template Method applied to a single operation.",
  },
  {
    id: "ot2-mcq-variant",
    kind: "mcq",
    topic: "L2.variant",
    level: 2,
    prompt: "When is std::variant a better fit than an inheritance hierarchy? Choose all that apply.",
    options: [
      "The set of alternatives is closed and known at compile time",
      "You want value semantics with no heap allocation per object",
      "New alternatives will be added later by other teams in separate libraries",
      "You often add new operations over the same fixed set of alternatives",
    ],
    answer: [0, 1, 3],
    explain: "variant stores the value inline and makes adding an operation easy (write one more visitor), but adding an alternative means touching every visitor. Inheritance is the opposite trade: adding a type is easy, adding an operation edits every class. When outsiders must add types, choose the open hierarchy.",
  },
  {
    id: "ot2-pred-visit",
    kind: "predict",
    topic: "L2.variant",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <string>
#include <variant>

struct Visitor {
  std::string operator()(int i) const { return "int" + std::to_string(i); }
  std::string operator()(const std::string& s) const { return "str" + s; }
};

int main() {
  std::variant<int, std::string> v = 7;
  std::cout << std::visit(Visitor{}, v) << " ";
  v = std::string("x");
  std::cout << std::visit(Visitor{}, v) << " " << v.index() << "\\n";
}
`,
    output: "int7 strx 1",
    options: ["int7 strx 1", "int7 strx 0", "int7 int7 0", "str7 strx 1"],
    answer: [0],
    explain: "std::visit calls the overload that matches the alternative currently held, and the compiler checks you covered every alternative. index() reports the zero-based position of the held type: string is the second alternative, so 1.",
  },
  {
    id: "ot2-pred-variant-default",
    kind: "predict",
    topic: "L2.variant",
    level: 3,
    prompt: "What does this program print?",
    code: `#include <iostream>
#include <string>
#include <variant>

int main() {
  std::variant<std::string, int> v;
  std::cout << v.index() << " " << std::holds_alternative<std::string>(v)
            << " " << std::get<std::string>(v).size() << "\\n";
}
`,
    output: "0 1 0",
    options: ["0 1 0", "1 0 0", "0 0 0", "throws bad_variant_access"],
    answer: [0],
    explain: "A default-constructed variant holds a value-initialised first alternative, here an empty string, so index() is 0. If the first type were not default-constructible you would need std::monostate as a placeholder alternative.",
  },
  {
    id: "ot2-pred-slice-param",
    kind: "predict",
    topic: "L1.slicing",
    level: 2,
    prompt: "What does this program print?",
    code: `#include <iostream>

struct Base {
  virtual const char* who() const { return "Base"; }
  virtual ~Base() = default;
};
struct Derived : Base {
  const char* who() const override { return "Derived"; }
};

void byValue(Base b) { std::cout << b.who() << " "; }
void byRef(const Base& b) { std::cout << b.who() << "\\n"; }

int main() {
  Derived d;
  byValue(d);
  byRef(d);
}
`,
    output: "Base Derived",
    options: ["Base Derived", "Derived Derived", "Base Base", "Derived Base"],
    answer: [0],
    explain: "Passing by value copy-constructs a Base from the Derived, slicing off the Derived part and its vtable identity. Taking const Base& keeps the original object. Slicing is why polymorphic parameters are references or pointers.",
  },
  {
    id: "ot2-mcq-virtual-cost",
    kind: "mcq",
    topic: "L2.virtual-cost",
    level: 3,
    prompt: "What is the honest cost of a virtual call, and when does it matter?",
    options: [
      "A vtable pointer per object and an indirect call that blocks inlining; usually negligible, but it can matter in a hot inner loop over millions of tiny objects",
      "Virtual calls are always an order of magnitude slower, so avoid them everywhere",
      "Virtual calls cost nothing because the compiler always devirtualises them",
      "They allocate memory on the heap for every call",
    ],
    answer: [0],
    explain: "Each polymorphic object carries a hidden pointer, and the call goes through a table lookup the optimiser often cannot inline. For ordinary application code the flexibility wins. In a profiled hot loop consider final classes, templates, or a variant, and measure first.",
  },
];
