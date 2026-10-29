import type { PredictSource } from "@/lib/battle/types";

/** Predict-the-behaviour programs. Correct answers are NOT typed here: they come from running each program
 *  natively (`GEN_PREDICT=1 npm run content:verify` writes predict.generated.json; plain verify checks it). */
export const PREDICT_SOURCES: PredictSource[] = [
  {
    id: "predict-slicing",
    topic: "polymorphism",
    code: `#include <iostream>
struct Shape {
  virtual ~Shape() = default;
  virtual const char* name() const { return "Shape"; }
};
struct Circle : Shape {
  const char* name() const override { return "Circle"; }
};
void show(Shape s) { std::cout << s.name() << "\\n"; }
int main() {
  Circle c;
  show(c);
}`,
    distractors: ["Circle", "Shape\nCircle", "Compile error"],
    explain: "Passing a Circle by value copy-constructs a Shape from it, so the Circle part is sliced off. The copy is a plain Shape and name() dispatches on that. Take Shape& or const Shape& to keep polymorphism.",
  },
  {
    id: "predict-ctor-virtual",
    topic: "polymorphism",
    code: `#include <iostream>
struct Base {
  Base() { hello(); }
  virtual ~Base() = default;
  virtual void hello() const { std::cout << "Base\\n"; }
};
struct Derived : Base {
  void hello() const override { std::cout << "Derived\\n"; }
};
int main() {
  Derived d;
  d.hello();
}`,
    distractors: ["Derived\nDerived", "Derived", "Base\nBase"],
    explain: "While Base's constructor runs, the object's dynamic type is Base, because Derived has not been built yet. The virtual call inside the constructor resolves to Base::hello. Only the later d.hello() reaches Derived.",
  },
  {
    id: "predict-shared-deleter",
    topic: "ownership",
    code: `#include <iostream>
#include <memory>
struct Base {
  ~Base() { std::cout << "~Base\\n"; }
};
struct Derived : Base {
  ~Derived() { std::cout << "~Derived\\n"; }
};
int main() {
  std::shared_ptr<Base> p = std::make_shared<Derived>();
}`,
    distractors: ["~Base", "~Base\n~Derived", "~Derived"],
    explain: "shared_ptr captures the deleter for the real type at construction, so Derived is destroyed correctly even though Base has no virtual destructor. A raw Base* or unique_ptr<Base> holding a Derived would be undefined behaviour here. Prefer a virtual destructor anyway.",
  },
  {
    id: "predict-moved-unique",
    topic: "ownership",
    code: `#include <iostream>
#include <memory>
#include <utility>
int main() {
  auto a = std::make_unique<int>(7);
  auto b = std::move(a);
  std::cout << (a ? "a owns" : "a empty") << "\\n";
  std::cout << *b << "\\n";
}`,
    distractors: ["a owns\n7", "a empty\n0", "7"],
    explain: "Moving a unique_ptr transfers ownership and leaves the source null (this one is guaranteed, unlike most moved-from types). So a is empty and b owns the int.",
  },
  {
    id: "predict-copy-move-count",
    topic: "value-semantics",
    code: `#include <iostream>
#include <utility>
struct Tracer {
  Tracer() { std::cout << "ctor\\n"; }
  Tracer(const Tracer&) { std::cout << "copy\\n"; }
  Tracer(Tracer&&) noexcept { std::cout << "move\\n"; }
};
Tracer make() { return Tracer(); }
int main() {
  Tracer a = make();
  Tracer b = a;
  Tracer c = std::move(a);
}`,
    distractors: ["ctor\nmove\ncopy\nmove", "ctor\ncopy\ncopy", "ctor\nmove\nmove"],
    explain: "make() returns a prvalue, and since C++17 guaranteed elision constructs it directly in a: one ctor, no move. b copies from the lvalue a. std::move(a) casts it to an rvalue so c uses the move constructor.",
  },
];
