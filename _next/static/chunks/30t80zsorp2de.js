(()=>{"use strict";(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,24298,e=>{var t=e.i(43476),a=e.i(71645);let i={mcq:"CONCEPT",pattern:"WHICH PATTERN?",smell:"SMELL SPOTTER",predict:"PREDICT THE OUTPUT"};e.s(["e",0,function({label:e,hp:a,max:i,tone:o}){return(0,t.jsxs)("div",{className:"min-w-0 flex-1",children:[(0,t.jsxs)("div",{className:"font-display flex justify-between text-xs",children:[(0,t.jsx)("span",{children:e}),(0,t.jsxs)("span",{children:[a,"/",i]})]}),(0,t.jsx)("div",{className:"h-3 border-2 border-[#060d20] bg-[#060d20]",role:"progressbar","aria-label":`${e} HP`,"aria-valuenow":a,"aria-valuemax":i,children:(0,t.jsx)("div",{className:"h-full transition-[width] duration-500",style:{width:`${a/i*100}%`,background:o}})})]})},"a",0,function({card:e,phase:o,selected:s,result:n,counter:r,nextLabel:c,onToggle:l,onSubmit:d,onNext:p}){let h=(0,a.useRef)(null);(0,a.useEffect)(()=>{"feedback"===o&&h.current?.scrollIntoView({block:"end",behavior:"auto"})},[o]);let u=e.answer.length>1;return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("div",{className:"font-display flex justify-between text-xs text-[var(--accent-2)]",children:[(0,t.jsx)("span",{children:i[e.kind]}),(0,t.jsx)("span",{children:r})]}),(0,t.jsx)("p",{className:"shrink-0 text-base leading-snug",children:e.prompt}),"code"in e&&(0,t.jsx)("pre",{className:"max-h-48 shrink-0 overflow-auto rounded border-2 border-[#060d20] bg-[#07102a] p-2 text-xs leading-snug",tabIndex:0,children:(0,t.jsx)("code",{children:e.code})}),u&&(0,t.jsx)("p",{className:"text-xs text-white/60",children:"Choose all that apply."}),(0,t.jsx)("div",{className:"flex shrink-0 flex-col gap-2",role:u?"group":"radiogroup",children:e.options.map((a,i)=>{let n=s.includes(i),r=e.answer.includes(i),c="feedback"===o||"resolving"===o,d=c&&r?["#166534","#34d399"]:c&&n?["#7f1d1d","#f87171"]:n?["#0c4a6e","#38bdf8"]:null;return(0,t.jsxs)("button",{role:u?"checkbox":"radio","aria-checked":n,disabled:"answering"!==o,onClick:()=>l(i),style:{..."predict"===e.kind?{fontFamily:"ui-monospace, monospace"}:{},...d?{"--btn":d[0],"--btn-hi":d[1]}:{},...c&&d?{opacity:1}:{}},className:"px-btn min-h-11 px-3 py-2 text-left text-sm",children:[(0,t.jsx)("span",{className:"mr-2 text-white/50",children:i+1}),(0,t.jsx)("span",{className:"whitespace-pre-wrap",children:a})]},a)})}),"answering"===o&&(0,t.jsx)("button",{className:"px-btn px-btn-primary mt-1 min-h-11 px-4 py-2",disabled:0===s.length,onClick:d,children:"Attack!"}),"feedback"===o&&n&&(0,t.jsxs)("div",{ref:h,className:"mt-1 flex shrink-0 flex-col gap-2",role:"status",children:[(0,t.jsx)("div",{className:`font-display text-lg ${n.correct?"text-emerald-300":"text-red-300"}`,children:n.correct?n.damageToFoe>0?`Hit! −${n.damageToFoe}`:"Correct!":n.damageToPlayer>0?`Countered! −${n.damageToPlayer}`:"Not quite"}),(0,t.jsx)("p",{className:"text-sm leading-snug text-white/85",children:n.explain}),(0,t.jsx)("button",{className:"px-btn px-btn-primary min-h-11 px-4 py-2",onClick:p,children:c})]})]})}])},70073,94448,60517,18712,17092,31680,99658,34052,e=>{let t=[{id:"ot-mcq-raii",kind:"mcq",topic:"L1.raii",level:1,prompt:"What does RAII tie to an object's lifetime?",options:["Ownership of a resource: acquired in the constructor, released in the destructor","The number of virtual functions it has","The order in which headers are included","Whether it may be copied across threads"],answer:[0],explain:"RAII makes releasing a resource automatic: the destructor runs on every exit path, including early returns and exceptions, so a lock, file or allocation cannot leak because someone forgot a cleanup call."},{id:"ot-mcq-unique",kind:"mcq",topic:"L1.ownership",level:1,prompt:"A class owns exactly one heap object that nobody else shares. Which member type states that most clearly?",options:["T*","std::unique_ptr<T>","std::shared_ptr<T>","T&"],answer:[1],explain:"unique_ptr says 'sole owner' in the type and deletes the object for you. shared_ptr pays for shared ownership you do not have (a control block and atomic counts), and a raw pointer or reference says nothing about who deletes."},{id:"ot-mcq-rule",kind:"mcq",topic:"L1.rule-of-zero",level:2,prompt:"Which are true of the Rule of Zero? Choose all that apply.",options:["Prefer members that manage themselves (vector, string, unique_ptr) so you write no special members","Every class should define all five special member functions explicitly","A class that owns a raw resource directly should wrap it in a small RAII type","It forbids classes from having destructors in any circumstance"],answer:[0,2],explain:"The Rule of Zero pushes resource management into dedicated types so most classes need none of the special members. It does not ban destructors: the small RAII wrapper is exactly where a destructor belongs."},{id:"ot-pat-notify",kind:"pattern",topic:"L3.observer",level:1,prompt:"A stock ticker must tell any number of screens when a price changes, without knowing what the screens do with it. Which Patternling answers?",options:["Owlserver (Observer)","Shapeshift (State)","Templar (Template Method)","Solo (Singleton)"],answer:[0],explain:"One subject, many dependents that subscribe and get notified: Observer. State changes behaviour of one object by its mode, Template Method fixes an algorithm skeleton, and Singleton is about instance count, not notification."},{id:"ot-pat-wrap",kind:"pattern",topic:"L3.decorator",level:2,prompt:"You need optional logging, compression and encryption around a byte stream, combinable in any order at run time. Which Patternling fits best?",options:["Shellcrab (Decorator)","Forgebot (Factory Method)","Facadeon (Facade)","Clonewisp (Prototype)"],answer:[0],explain:"Each wrapper has the same interface as the stream and adds one behaviour, so they stack in any combination. A Facade would simplify a subsystem rather than layer behaviour, and subclassing every combination explodes (2^n classes)."},{id:"ot-smell-switch",kind:"smell",topic:"L2.ocp",level:2,prompt:"Name the smell and the principle it strains.",code:`double area(const Shape& s) {
  switch (s.kind) {
    case Kind::Circle: return 3.14159 * s.r * s.r;
    case Kind::Rect:   return s.w * s.h;
  }
  return 0;
}`,options:["Type-code switch; Open/Closed (adding a shape edits this function)","God class; Single Responsibility","Fat interface; Interface Segregation","Feature envy; Liskov Substitution"],answer:[0],explain:"Every new shape forces an edit to each switch like this one. A virtual area() on a Shape hierarchy lets you add a shape by adding a class and leaving existing code alone, which is what Open/Closed asks for."},{id:"ot-smell-delete",kind:"smell",topic:"L1.ownership",level:1,prompt:"What is wrong with this class?",code:`class Buffer {
 public:
  explicit Buffer(size_t n) : data_(new char[n]) {}
  ~Buffer() { delete[] data_; }
 private:
  char* data_;
};`,options:["Copying it double-deletes data_ (it breaks the Rule of Three)","The destructor must be virtual","delete[] is never valid for char arrays","Constructors may not be explicit"],answer:[0],explain:"The compiler-generated copy duplicates the pointer, so two Buffers delete the same array. Fix it by making the type non-copyable, writing copy/move properly, or (best) holding a std::vector<char> or unique_ptr<char[]>."},{id:"ot-pred-slice",kind:"predict",topic:"L1.slicing",level:2,prompt:"What does this program print?",code:`#include <iostream>
struct Animal { virtual const char* speak() const { return "..."; } };
struct Dog : Animal { const char* speak() const override { return "woof"; } };

int main() {
  Dog d;
  Animal a = d;
  const Animal& r = d;
  std::cout << a.speak() << " " << r.speak() << "\\n";
}
`,output:"... woof",options:["... woof","woof woof","... ...","woof ..."],answer:[0],explain:"Copying a Dog into an Animal object slices off the Dog part, and the copy is a real Animal, so its speak() is Animal's. The reference still names the original Dog, so virtual dispatch finds Dog::speak."},{id:"ot-pred-ctor",kind:"predict",topic:"L1.virtual-ctor",level:2,prompt:"What does this program print?",code:`#include <iostream>
struct Base {
  Base() { who(); }
  virtual void who() const { std::cout << "Base\\n"; }
  virtual ~Base() = default;
};
struct Derived : Base {
  void who() const override { std::cout << "Derived\\n"; }
};

int main() { Derived d; d.who(); }
`,output:"Base\nDerived",options:["Base\nDerived","Derived\nDerived","Derived\nBase","Base\nBase"],answer:[0],explain:"While Base's constructor runs, the object's dynamic type is Base (the Derived part does not exist yet), so the virtual call resolves to Base::who. Never rely on virtual dispatch inside constructors or destructors."},{id:"ot-pred-dtor",kind:"predict",topic:"L1.raii",level:1,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"~Derived\n~Member\n~Base",options:["~Derived\n~Member\n~Base","~Base\n~Member\n~Derived","~Derived\n~Base\n~Member","~Base"],answer:[0],explain:"Because ~Base is virtual, delete through a Base* runs the most-derived destructor first. Then members are destroyed, then the base: construction order in reverse. Without virtual, this delete would be undefined behaviour."},{id:"ot-pred-move",kind:"predict",topic:"L1.move",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <memory>
#include <utility>

int main() {
  auto a = std::make_unique<int>(7);
  auto b = std::move(a);
  std::cout << (a ? "a owns" : "a null") << " " << (b ? *b : -1) << "\\n";
}
`,output:"a null 7",options:["a null 7","a owns 7","a null -1","does not compile"],answer:[0],explain:"Moving a unique_ptr transfers ownership and leaves the source null (this one is guaranteed by the standard, unlike most moved-from types). Copying it would be the compile error."},{id:"ot-mcq-struct",kind:"mcq",topic:"L1.classes",level:1,prompt:"In C++, what is the only language-level difference between `struct` and `class`?",options:["Default access: struct members are public, class members are private","Only classes can have member functions","Only structs can be copied","Only classes can be inherited from"],answer:[0],explain:"Both can have functions, constructors, inheritance and everything else. The default access (and default inheritance access) differs. By convention, struct signals a plain bag of data and class signals a type that protects an invariant."},{id:"ot-mcq-invariant",kind:"mcq",topic:"L1.encapsulation",level:1,prompt:"Why does a BankAccount keep its balance private instead of exposing a public `balance` field?",options:["So every change goes through code that can enforce rules such as 'never below zero'","Private fields are faster to read","Public fields cannot be const","The compiler requires it for classes with constructors"],answer:[0],explain:"Encapsulation is about invariants: if any caller can write the field, no single place can guarantee the rule. Funnel writes through deposit() and withdraw() and the invariant lives in one spot, which also makes it testable."},{id:"ot-mcq-initlist",kind:"mcq",topic:"L1.constructors",level:1,prompt:"Which statements about member initialiser lists are true? Choose all that apply.",options:["They construct members directly, rather than default-constructing then assigning","They are required to initialise const members and reference members","Members are initialised in the order the list is written","They can only be used with primitive types"],answer:[0,1],explain:"A const or reference member cannot be assigned later, so it must be initialised in the list. Members are initialised in declaration order, not list order, which is why a mismatched order triggers a -Wreorder warning and can read an uninitialised member."},{id:"ot-mcq-explicit",kind:"mcq",topic:"L1.constructors",level:2,prompt:"What does marking a single-argument constructor `explicit` prevent?",options:["Silent implicit conversions, such as passing an int where a Buffer is expected","Copying of the class","Calling the constructor with braces","Deriving from the class"],answer:[0],explain:"Without explicit, `void f(Buffer); f(64);` quietly builds a Buffer from 64. That is almost never intended. Make single-argument constructors explicit unless the conversion is truly natural (like string from a literal)."},{id:"ot-mcq-const",kind:"mcq",topic:"L1.const",level:1,prompt:"What does the trailing `const` in `int size() const;` promise?",options:["The function does not modify the object's observable state, so it is callable on const objects","The return value cannot be changed","The function runs at compile time","The function cannot throw"],answer:[0],explain:"A const member function gets a `const this`, so it can be called through a const reference and cannot assign to ordinary members. Mark every read-only function const; otherwise callers holding a const& cannot use your class."},{id:"ot-mcq-static",kind:"mcq",topic:"L1.static",level:2,prompt:"A class counts how many instances were created with a `static int count;`. Which is true?",options:["One copy is shared by all instances and it needs a single out-of-class definition (or `inline`)","Each object gets its own copy","It can only be read inside constructors","It is destroyed when the first object dies"],answer:[0],explain:"A static data member belongs to the class, not to any object. Declare it in the class and define it once (or write `inline static int count = 0;` in C++17). Remember it is shared mutable state, so it needs care in multithreaded code."},{id:"ot-mcq-weak",kind:"mcq",topic:"L1.smart-pointers",level:2,prompt:"A Child needs to refer back to its Parent, and the Parent owns the Child through a shared_ptr. What should the Child hold?",options:["std::weak_ptr<Parent>","std::shared_ptr<Parent>","std::unique_ptr<Parent>","Parent by value"],answer:[0],explain:"If both sides hold shared_ptrs, the reference counts never reach zero and both objects leak (a cycle). A weak_ptr observes without owning and can be checked with lock() before use."},{id:"ot-mcq-optional",kind:"mcq",topic:"L1.optional",level:2,prompt:"`findUser(id)` may legitimately find nothing. Which return type states that best?",options:["std::optional<User>","User with a magic 'empty' value","User* where nullptr means 'ownership transferred'","int status code plus an output parameter"],answer:[0],explain:"optional makes 'maybe a value' part of the type, so callers must handle the empty case. Magic values are easy to forget to check, and a status code with an out-parameter is noisier. Use an error type when callers also need to know why it failed."},{id:"ot-mcq-enum",kind:"mcq",topic:"L1.enum-class",level:1,prompt:"Why prefer `enum class Color { Red, Green }` over a plain `enum`?",options:["Enumerators are scoped (Color::Red) and do not convert silently to int","It makes the enum smaller than one byte","It allows more than 256 values","Plain enums cannot be used in switch statements"],answer:[0],explain:"Plain enum leaks its names into the enclosing scope and converts to int implicitly, so unrelated enums can collide or be compared by mistake. enum class fixes both and can name its underlying type."},{id:"ot-mcq-ownview",kind:"mcq",topic:"L1.ownership",level:2,prompt:"A function only reads a Widget and does not keep it. How should it take the parameter?",options:["const Widget&","std::unique_ptr<Widget>","std::shared_ptr<Widget>","Widget*, which the function deletes"],answer:[0],explain:"A reference (or raw pointer) is the non-owning view: the caller keeps ownership. Taking a smart pointer parameter says 'I take part in ownership', which is the wrong message and, for shared_ptr, costs an atomic increment."},{id:"ot-smell-public",kind:"smell",topic:"L1.encapsulation",level:1,prompt:"What is wrong with this class?",code:`class Temperature {
 public:
  double kelvin;
};
// elsewhere: t.kelvin = -40;`,options:["A public mutable field lets anyone break the invariant 'kelvin >= 0'","Doubles cannot be class members","It needs a virtual destructor","It should be a struct, because it has no functions"],answer:[0],explain:"Nothing stops callers writing an impossible value. Make the field private and set it through a constructor or setter that validates. (Even a plain struct is fine for data with no invariant; this one has one.)"},{id:"ot-smell-const",kind:"smell",topic:"L1.const",level:2,prompt:"This will not compile when `print` is called with a const reference. Why, and what is the fix?",code:`class Account {
 public:
  int balance() { return balance_; }
 private:
  int balance_ = 0;
};
void print(const Account& a) { std::cout << a.balance(); }`,options:["balance() is not const; declare it `int balance() const`","balance_ must be public","print must take Account by value","balance() must be static"],answer:[0],explain:"A const Account& can only call const member functions. A getter that does not modify state should always be const. Taking the object by value would only hide the problem by copying."},{id:"ot-smell-shared",kind:"smell",topic:"L1.ownership",level:2,prompt:"What is questionable about this design?",code:`class Document {
 public:
  explicit Document(std::shared_ptr<Font> f) : font_(std::move(f)) {}
 private:
  std::shared_ptr<Font> font_;   // only Document ever uses this Font
};`,options:["shared_ptr claims shared ownership nobody needs; unique_ptr (or a plain member) is clearer and cheaper","Fonts must always be stored by raw pointer","The constructor should not take its argument by value","std::move on a shared_ptr is undefined behaviour"],answer:[0],explain:"Reach for unique_ptr first and escalate to shared_ptr only when ownership genuinely has several owners, such as a cache shared by many users. Over-using shared_ptr hides the real ownership story and adds atomic reference counting."},{id:"ot-pred-order",kind:"predict",topic:"L1.constructors",level:2,prompt:"What does this program print?",code:`#include <iostream>
struct A { A() { std::cout << "A "; } };
struct B { B() { std::cout << "B "; } };
struct Holder {
  B b;
  A a;
  Holder() : a(), b() { std::cout << "H\\n"; }
};

int main() { Holder h; }
`,output:"B A H",options:["B A H","A B H","H A B","A B"],answer:[0],explain:"Members are initialised in the order they are declared in the class (b, then a), not the order written in the initialiser list. The constructor body runs after all members exist."},{id:"ot-pred-copy",kind:"predict",topic:"L1.copy",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"ctor copy dtor end\ndtor",options:["ctor copy dtor end\ndtor","ctor end\ndtor","ctor copy copy end\ndtor dtor","ctor copy end\ndtor dtor"],answer:[0],explain:"Passing by value copy-constructs a temporary, which dies when the call returns, before 'end'. Passing by const reference copies nothing. The original t dies at the end of main."},{id:"ot-pred-static",kind:"predict",topic:"L1.static",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"124 4",options:["124 4","123 3","124 3","121 1"],answer:[0],explain:"The counter is shared by the whole class and never decrements: c took id 3 and was destroyed, so d gets 4 and next ends at 4. A static member is class state, not object state."},{id:"ot-pred-sharedcount",kind:"predict",topic:"L1.smart-pointers",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"2 1 1 expired",options:["2 1 1 expired","2 1 2 alive","2 2 1 expired","1 1 1 alive"],answer:[0],explain:"A copy of a shared_ptr bumps the strong count; leaving the scope drops it. A weak_ptr does not add to the strong count, so w.use_count() reports the one remaining owner. After reset() there are none, so w is expired."},{id:"ot-pred-delegate",kind:"predict",topic:"L1.constructors",level:2,prompt:"What does this program print?",code:`#include <iostream>
struct Window {
  Window() : Window(80, 24) { std::cout << "default\\n"; }
  Window(int w, int h) : w_(w), h_(h) { std::cout << "sized " << w_ << "x" << h_ << "\\n"; }
 private:
  int w_, h_;
};

int main() { Window w; }
`,output:"sized 80x24\ndefault",options:["sized 80x24\ndefault","default\nsized 80x24","default","sized 80x24"],answer:[0],explain:"A delegating constructor hands construction to another constructor, which runs completely first. Only then does the delegating constructor's own body execute. This avoids duplicating initialisation logic."},{id:"ot-pred-moveout",kind:"predict",topic:"L1.move",level:3,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"2 40 40 0",options:["2 40 40 0","2 40 40 40","2 40 0 0","2 0 40 0"],answer:[0],explain:"The first push_back copies s. The second moves it into the vector, which steals its buffer. This is a long string, so there is no small-string optimisation, and the moved-from s is left empty. (Moved-from strings are valid but unspecified in general; empty is what every mainstream implementation does, so never rely on the content, only reuse after assigning.)"},{id:"ot2-mcq-dispatch",kind:"mcq",topic:"L1.polymorphism",level:1,prompt:"When does a call to a virtual function pick the derived override at run time?",options:["Through a pointer or reference to the base, when the object really is a Derived","Only when the object is passed by value","Only inside constructors","Whenever the function is declared in a header"],answer:[0],explain:"Virtual dispatch looks at the dynamic type of the object behind a pointer or reference. Passing by value copies only the Base part (slicing), so the dynamic type is lost, and inside a constructor the object is still only a Base."},{id:"ot2-mcq-vdtor",kind:"mcq",topic:"L1.virtual-destructor",level:1,prompt:"Why must a base class meant for polymorphic use have a virtual destructor?",options:["Deleting a Derived through a Base* with a non-virtual destructor is undefined behaviour","Without it, the derived class cannot override other virtual functions","It makes the class abstract","It stops the compiler generating a copy constructor"],answer:[0],explain:"delete on a Base* must run the most-derived destructor, and only a virtual destructor guarantees that. Skipping it typically leaks the Derived members and is formally undefined. It does not make a class abstract (only a pure virtual does)."},{id:"ot2-pred-dtor-order",kind:"predict",topic:"L1.virtual-destructor",level:1,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"~Derived ~Base",options:["~Derived ~Base","~Base ~Derived","~Base","~Derived"],answer:[0],explain:"Destruction runs from the most-derived class back up to the base, the reverse of construction. Because ~Base is virtual, resetting a unique_ptr<Base> reaches ~Derived first and then ~Base."},{id:"ot2-pred-slice-vector",kind:"predict",topic:"L1.slicing",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"... woof",options:["... woof","woof woof","woof ...","... ..."],answer:[0],explain:"vector<Animal> stores Animal objects, so pushing a Dog copies only its Animal part: the element is a plain Animal and says '...'. A reference keeps the real Dog, so dispatch finds the override. Use vector<unique_ptr<Animal>> to keep polymorphic objects."},{id:"ot2-pred-nonvirtual-hide",kind:"predict",topic:"L1.polymorphism",level:2,prompt:"What does this program print?",code:`#include <iostream>

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
`,output:"Base Derived",options:["Base Derived","Derived Derived","Base Base","Derived Base"],answer:[0],explain:"hello() is not virtual, so Derived::hello merely hides Base::hello, and a call through a Base* is resolved statically to Base. bye() is virtual, so the call dispatches to Derived. Hiding a non-virtual function is almost always a bug."},{id:"ot2-pred-default-arg",kind:"predict",topic:"L2.virtual-pitfalls",level:3,prompt:"What does this program print?",code:`#include <iostream>

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
`,output:"Derived1",options:["Derived1","Derived2","Base1","Base2"],answer:[0],explain:"Default arguments are filled in at compile time from the static type (Base), while the body is chosen at run time from the dynamic type (Derived). So you get Derived's body with Base's default. Never change a default argument in an override."},{id:"ot2-mcq-override",kind:"mcq",topic:"L1.override",level:1,prompt:"What does writing `override` on a member function buy you?",options:["A compile error if it does not actually override a virtual function in a base class","Faster calls because the compiler skips the vtable","Permission to access private members of the base","Nothing; it is only a comment"],answer:[0],explain:"A signature typo (a missing const, a different parameter type) silently creates a brand-new function and the base version still runs. `override` turns that mistake into a compile error. It does not change speed or access."},{id:"ot2-smell-no-override",kind:"smell",topic:"L1.override",level:2,prompt:"Why does `render` never run through a `Widget&`?",code:`struct Widget {
  virtual void render() const { /* draw a box */ }
  virtual ~Widget() = default;
};

struct Button : Widget {
  void render() { /* draw a button */ }  // forgot const
};`,options:["The signature differs by const, so Button::render hides rather than overrides; add `override` to catch it","Widget::render must be pure virtual","Button needs a virtual destructor of its own","Virtual functions cannot be const"],answer:[0],explain:"const is part of a member function's signature. render() and render() const are different functions, so Button's version is not an override and a Widget& still calls the base. Marking it `override` fails to compile and points straight at the mistake."},{id:"ot2-mcq-abstract",kind:"mcq",topic:"L1.abstract",level:1,prompt:"Which declaration makes `Shape` an abstract class that cannot be instantiated?",options:["virtual double area() const = 0;","virtual double area() const;","double area() const = delete;","static double area();"],answer:[0],explain:"`= 0` declares a pure virtual function: derived classes must override it before they can be created. A plain virtual has a body (or a link error), `= delete` removes a function rather than abstracting it, and a static function is not virtual at all."},{id:"ot2-mcq-interface-shape",kind:"mcq",topic:"L1.interfaces",level:2,prompt:"Which is the best shape for a C++ interface class? Choose all that apply.",options:["Only pure virtual member functions, no data members","A virtual destructor (usually `= default`)","Copy construction left public so values can be sliced into it","Non-owning use through references or smart pointers"],answer:[0,1,3],explain:"An interface is a contract: pure virtuals, no state, and a virtual destructor so deleting through it is safe. Callers hold it by reference or smart pointer. Leaving public copying invites slicing, so polymorphic bases usually delete copy or expose a virtual clone()."},{id:"ot2-pred-clone",kind:"predict",topic:"L2.clone",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"circle 0",options:["circle 0","circle 1","shape 0","does not compile"],answer:[0],explain:"A virtual clone() copies an object through its base interface without slicing: the Circle override makes a Circle. The copy lives at a different address, so the pointers differ. This is the polymorphic substitute for a copy constructor."},{id:"ot2-mcq-final",kind:"mcq",topic:"L2.final",level:2,prompt:"What does marking a class or an override `final` mean?",options:["No further class may derive from it, or no further override of that function is allowed","Its destructor is called last in the program","It cannot be copied","It is allocated in static storage"],answer:[0],explain:"final closes a hierarchy at that point. It documents intent and lets the compiler devirtualise calls it can now resolve statically. It says nothing about copying or storage."},{id:"ot2-mcq-ctor-virtual",kind:"mcq",topic:"L2.virtual-pitfalls",level:2,prompt:"A Base constructor calls a virtual function that Derived overrides. Which function runs when you construct a Derived?",options:["Base's version, because the Derived part does not exist yet","Derived's version","Whichever was declared last","It does not compile"],answer:[0],explain:"During Base's constructor the dynamic type is Base, so dispatch stays in Base. Otherwise the override could touch Derived members that have not been initialised. Destructors behave the same way in reverse. Use a factory or an explicit init step for such cases."},{id:"ot2-smell-switch-type",kind:"smell",topic:"L2.ocp",level:2,prompt:"Name the smell and the principle it strains.",code:`double pay(const Employee& e) {
  if (auto* m = dynamic_cast<const Manager*>(&e)) return m->salary() + m->bonus();
  if (auto* d = dynamic_cast<const Developer*>(&e)) return d->salary() + d->oncallPay();
  return e.salary();
}`,options:["A chain of dynamic_casts; Open/Closed (every new role edits this function)","Singleton abuse; Dependency Inversion","Fat interface; Interface Segregation","Missing virtual destructor; Liskov Substitution"],answer:[0],explain:"Asking 'what concrete type are you?' re-creates a type-code switch with casts. Put pay() behind a virtual function (or a Strategy) on Employee so a new role is a new class and this function never changes."},{id:"ot2-mcq-dyncast-ok",kind:"mcq",topic:"L2.rtti",level:3,prompt:"When is dynamic_cast a defensible choice?",options:["At a boundary where an optional capability is probed, such as asking a Widget for an optional Scrollable interface","Everywhere you would otherwise write a virtual function","To avoid writing a virtual destructor","To convert unrelated types, such as int* to a class pointer"],answer:[0],explain:"Probing for an optional capability is a legitimate, contained use, and it must be paired with a null check. Using it to branch on concrete types across the codebase is the OCP smell. It needs a polymorphic type and does not replace the virtual destructor."},{id:"ot2-mcq-lsp",kind:"mcq",topic:"L2.lsp",level:2,prompt:"`Square` inherits `Rectangle`, and `setWidth` on a Square also changes its height. What principle does this break?",options:["Liskov Substitution: code that sets width and height independently gets surprised","Single Responsibility","Open/Closed","Dependency Inversion"],answer:[0],explain:"A subtype must keep the promises of its base. Code written against Rectangle can reasonably expect setWidth to leave height alone, and a Square breaks that. 'Is-a' in geometry is not 'substitutable-for' in behaviour; model them as separate immutable shapes or share an interface instead."},{id:"ot2-smell-inherit-reuse",kind:"smell",topic:"L2.composition",level:2,prompt:"What is the design problem here?",code:`class Stack : public std::vector<int> {
 public:
  void push(int x) { push_back(x); }
  int pop() { int v = back(); pop_back(); return v; }
};`,options:["Public inheritance for reuse exposes insert, erase and the rest, so callers can break the stack invariant; prefer composition","vector has no virtual destructor, so push_back is unsafe","pop must be const","Stacks must be abstract"],answer:[0],explain:"Public inheritance says 'a Stack is a vector', and the whole vector interface leaks out, letting callers insert in the middle. Hold a vector as a private member (composition) and expose only push and pop. Inherit to substitute, not to reuse code."},{id:"ot2-mcq-isp",kind:"mcq",topic:"L2.isp",level:2,prompt:"A `Printer` interface has print(), scan() and fax(); a basic printer must stub out the last two. What should you do?",options:["Split it into small role interfaces (Printable, Scannable, Faxable) so each class implements only what it supports","Make the stubs throw and document them","Add a boolean saying which methods work","Make the base class a singleton"],answer:[0],explain:"Interface Segregation: clients should not depend on methods they do not use. Throwing stubs also break Liskov (the base promised scan() works). Role interfaces keep each contract honest, and a multifunction device just implements several."},{id:"ot2-pat-strategy",kind:"pattern",topic:"L3.strategy",level:1,prompt:"A checkout must pick a shipping-cost rule (flat, weight-based, free-over-50) that can be swapped per order without editing checkout code. Which Patternling answers?",options:["Swapwing (Strategy)","Owlserver (Observer)","Shellcrab (Decorator)","Solo (Singleton)"],answer:[0],explain:"A family of interchangeable algorithms behind one interface, chosen by the caller: Strategy. Observer notifies, Decorator layers extra behaviour on the same object, and Singleton controls instance count."},{id:"ot2-pat-template-method",kind:"pattern",topic:"L3.template-method",level:2,prompt:"Report exporters always run open, write rows, close in that order, but each format writes rows differently. Which pattern puts the fixed skeleton in the base class?",options:["Templar (Template Method)","Forgebot (Factory Method)","Clonewisp (Prototype)","Facadeon (Facade)"],answer:[0],explain:"Template Method fixes the order of steps in a base class and lets subclasses fill in the variable steps. Compare Strategy, which achieves a similar split by composition instead of inheritance and swaps at run time."},{id:"ot2-mcq-nvi",kind:"mcq",topic:"L2.nvi",level:3,prompt:"What is the Non-Virtual Interface idiom?",options:["Public non-virtual functions that call private virtual hooks, so the base controls pre- and post-conditions around the customisation point","Making every function non-virtual for speed","Using only static functions in interfaces","A way to avoid virtual destructors"],answer:[0],explain:"The base keeps the public API stable and wraps the virtual step with checks, locking or logging in one place. Derived classes override only the private hook. It is Template Method applied to a single operation."},{id:"ot2-mcq-variant",kind:"mcq",topic:"L2.variant",level:2,prompt:"When is std::variant a better fit than an inheritance hierarchy? Choose all that apply.",options:["The set of alternatives is closed and known at compile time","You want value semantics with no heap allocation per object","New alternatives will be added later by other teams in separate libraries","You often add new operations over the same fixed set of alternatives"],answer:[0,1,3],explain:"variant stores the value inline and makes adding an operation easy (write one more visitor), but adding an alternative means touching every visitor. Inheritance is the opposite trade: adding a type is easy, adding an operation edits every class. When outsiders must add types, choose the open hierarchy."},{id:"ot2-pred-visit",kind:"predict",topic:"L2.variant",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"int7 strx 1",options:["int7 strx 1","int7 strx 0","int7 int7 0","str7 strx 1"],answer:[0],explain:"std::visit calls the overload that matches the alternative currently held, and the compiler checks you covered every alternative. index() reports the zero-based position of the held type: string is the second alternative, so 1."},{id:"ot2-pred-variant-default",kind:"predict",topic:"L2.variant",level:3,prompt:"What does this program print?",code:`#include <iostream>
#include <string>
#include <variant>

int main() {
  std::variant<std::string, int> v;
  std::cout << v.index() << " " << std::holds_alternative<std::string>(v)
            << " " << std::get<std::string>(v).size() << "\\n";
}
`,output:"0 1 0",options:["0 1 0","1 0 0","0 0 0","throws bad_variant_access"],answer:[0],explain:"A default-constructed variant holds a value-initialised first alternative, here an empty string, so index() is 0. If the first type were not default-constructible you would need std::monostate as a placeholder alternative."},{id:"ot2-pred-slice-param",kind:"predict",topic:"L1.slicing",level:2,prompt:"What does this program print?",code:`#include <iostream>

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
`,output:"Base Derived",options:["Base Derived","Derived Derived","Base Base","Derived Base"],answer:[0],explain:"Passing by value copy-constructs a Base from the Derived, slicing off the Derived part and its vtable identity. Taking const Base& keeps the original object. Slicing is why polymorphic parameters are references or pointers."},{id:"ot2-mcq-virtual-cost",kind:"mcq",topic:"L2.virtual-cost",level:3,prompt:"What is the honest cost of a virtual call, and when does it matter?",options:["A vtable pointer per object and an indirect call that blocks inlining; usually negligible, but it can matter in a hot inner loop over millions of tiny objects","Virtual calls are always an order of magnitude slower, so avoid them everywhere","Virtual calls cost nothing because the compiler always devirtualises them","They allocate memory on the heap for every call"],answer:[0],explain:"Each polymorphic object carries a hidden pointer, and the call goes through a table lookup the optimiser often cannot inline. For ordinary application code the flexibility wins. In a profiled hot loop consider final classes, templates, or a variant, and measure first."}];e.s(["f",0,t],70073);let a=[{id:"ss-mcq-srp-def",kind:"mcq",topic:"L2.srp",level:1,prompt:"Which statement is the most useful way to apply the Single Responsibility Principle?",options:["A class should have one reason to change, meaning one actor or concern whose requirements drive its edits","A class should have exactly one public method","A class should be at most 100 lines long","A class should never depend on another class"],answer:[0],explain:"SRP is about axes of change, not method counts or line counts. If the billing team and the reporting team both force edits to the same class, it has two responsibilities and each team can break the other's behaviour."},{id:"ss-smell-srp-invoice",kind:"smell",topic:"L2.srp",level:1,prompt:"Name the smell and the principle it strains.",code:`class Invoice {
 public:
  double total() const;
  void applyDiscount(double pct);
  std::string toHtml() const;
  void saveToDatabase(Db& db) const;
  void emailTo(const std::string& addr) const;
};`,options:["God class mixing pricing, rendering, persistence and delivery; Single Responsibility","Fat interface; Interface Segregation","Type-code switch; Open/Closed","Covariant return; Liskov Substitution"],answer:[0],explain:"Pricing rules, HTML layout, database schema and mail transport change for unrelated reasons. Keep Invoice as the domain object and move rendering, storage and delivery to collaborators such as InvoiceRenderer, InvoiceRepository and Mailer."},{id:"ss-mcq-srp-overapply",kind:"mcq",topic:"L2.srp",level:2,prompt:"A candidate splits a 40-line OrderValidator into nine one-method classes 'for SRP'. What is the best critique?",options:["SRP was over-applied: the pieces change together, so splitting adds indirection and wiring with no benefit","Nothing is wrong; more classes is always better SRP","The classes should be merged into a single global function","SRP forbids validators from having any collaborators"],answer:[0],explain:"A responsibility is a reason to change, not a method. Pieces that always change together are cohesive and belong together. In an interview, say what would change independently before you split, and stop when the split no longer buys you that."},{id:"ss-mcq-srp-cohesion",kind:"mcq",topic:"L2.cohesion",level:2,prompt:"Which symptom best suggests low cohesion in a class?",options:["Groups of methods that use disjoint subsets of the fields","The class has a virtual destructor","The class has const member functions","The class is declared in its own header"],answer:[0],explain:"If one cluster of methods touches fields A and B and another touches only C and D, you are looking at two classes sharing a name. Splitting along that seam usually gives each half a clear invariant."},{id:"ss-smell-srp-report",kind:"smell",topic:"L2.srp",level:2,prompt:"Which principle does this function strain most, and what is the first refactor?",code:`void runMonthlyReport(const std::vector<Sale>& sales) {
  double total = 0;
  for (const auto& s : sales) total += s.amount;      // compute
  std::ofstream out("report.csv");                      // persist
  out << "total," << total << "\\n";
  std::cout << "Report written\\n";                     // notify
}`,options:["Single Responsibility; separate computation from output so the logic is testable without a file","Liskov Substitution; add a virtual destructor","Interface Segregation; split the vector","Dependency Inversion; make total a global"],answer:[0],explain:"Calculation, file output and console messages are tangled, so a unit test must touch the file system. Extract double totalSales(const vector<Sale>&) as a pure function and pass an output stream or sink into the writer."},{id:"ss-pat-srp-split",kind:"pattern",topic:"L2.srp",level:3,prompt:"A checkout class computes tax, and the rules differ per region and change each quarter independently of the rest of checkout. Which approach isolates that axis of change best?",options:["Extract a TaxPolicy interface with a per-region implementation injected into checkout","Add a region enum and a switch inside checkout","Make tax rates global constants","Subclass checkout once per region"],answer:[0],explain:"Tax rules are their own axis of change, so they get their own abstraction injected into checkout. A switch keeps all regions in one edit surface, globals hide the dependency, and a subclass per region multiplies checkout variants."},{id:"ss-mcq-ocp-def",kind:"mcq",topic:"L2.ocp",level:1,prompt:"What does the Open/Closed Principle ask for?",options:["New behaviour can be added by adding code (a new class), not by editing code that already works","Source files must be read-only on disk","Classes may never be modified under any circumstance","All classes must be abstract"],answer:[0],explain:"Open for extension, closed for modification: identify the axis that is likely to vary, put it behind an abstraction, and new variants arrive as new classes. It is a design goal for the parts that really vary, not a ban on editing files."},{id:"ss-smell-ocp-discount",kind:"smell",topic:"L2.ocp",level:1,prompt:"Name the smell and the principle it strains.",code:`double price(const Order& o) {
  if (o.customerType == "student") return o.base * 0.8;
  if (o.customerType == "vip")     return o.base * 0.7;
  if (o.customerType == "staff")   return o.base * 0.5;
  return o.base;
}`,options:["String-typed conditional chain; Open/Closed (each new customer type edits this function)","God class; Single Responsibility","Fat interface; Interface Segregation","Singleton; Dependency Inversion"],answer:[0],explain:"Every new customer tier edits tested code and risks the existing branches. A DiscountPolicy interface with one class per tier, chosen at the boundary, lets new tiers arrive without touching the others."},{id:"ss-pred-ocp-strategy",kind:"predict",topic:"L2.ocp",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <memory>
#include <vector>

struct Discount {
  virtual ~Discount() = default;
  virtual double apply(double p) const = 0;
};
struct None : Discount {
  double apply(double p) const override { return p; }
};
struct Percent : Discount {
  explicit Percent(double f) : f_(f) {}
  double apply(double p) const override { return p * (1.0 - f_); }
 private:
  double f_;
};
struct Flat : Discount {
  explicit Flat(double d) : d_(d) {}
  double apply(double p) const override { return p > d_ ? p - d_ : 0.0; }
 private:
  double d_;
};

int main() {
  std::vector<std::unique_ptr<Discount>> ds;
  ds.push_back(std::make_unique<None>());
  ds.push_back(std::make_unique<Percent>(0.25));
  ds.push_back(std::make_unique<Flat>(30));
  for (const auto& d : ds) std::cout << d->apply(80) << " ";
  std::cout << "\\n";
}
`,output:"80 60 50",options:["80 60 50","80 60 110","80 55 50","80 20 50"],answer:[0],explain:"None leaves 80, Percent(0.25) gives 80 x 0.75 = 60, and Flat(30) gives 80 - 30 = 50. The loop never changes when a fourth discount class is added: that is Open/Closed in practice."},{id:"ss-mcq-ocp-predict-axis",kind:"mcq",topic:"L2.ocp",level:3,prompt:"In an interview you are told 'payments will gain new methods every quarter, but refunds are always full'. How should OCP shape your design?",options:["Put payment method behind an interface (the volatile axis) and keep refunds simple until they vary","Abstract everything now, including refunds, in case it changes","Use one big switch on method; it is fastest to write","Avoid interfaces; use inheritance from a concrete Payment class"],answer:[0],explain:"OCP pays off on axes you have evidence will vary. Abstracting refunds with no evidence is speculative generality (YAGNI). A switch on method would need editing every quarter, and concrete-class inheritance couples new methods to old code."},{id:"ss-mcq-ocp-cost",kind:"mcq",topic:"L2.ocp",level:3,prompt:"What is the honest cost of applying OCP everywhere?",options:["More types and indirection to read and test, and abstractions guessed wrong are harder to remove than a plain function","None; abstractions are free","It makes code slower by an order of magnitude in every case","It forbids unit testing"],answer:[0],explain:"Abstractions cost reading time and can encode the wrong axis, which then has to be unpicked. A common rule: allow the first variation to be concrete, abstract on the second, and refactor with the change-storm in mind."},{id:"ss-smell-ocp-logger",kind:"smell",topic:"L2.ocp",level:3,prompt:"This class is 'closed' to extension. Which change makes it open without a switch?",code:`class Exporter {
 public:
  void run(const Data& d, Format f) {
    switch (f) {
      case Format::Csv:  writeCsv(d);  break;
      case Format::Json: writeJson(d); break;
    }
  }
};`,options:["Introduce a Writer interface; Exporter receives one and calls write(d)","Add a Format::Xml case and a writeXml function","Make run a template on the enum","Mark run as final"],answer:[0],explain:"Adding Xml to the switch edits Exporter again. With a Writer interface, XmlWriter is a new class and Exporter is untouched. Choose the writer at the composition root, not inside the exporter."},{id:"ss-mcq-lsp-def",kind:"mcq",topic:"L2.lsp",level:1,prompt:"What does the Liskov Substitution Principle require of a subtype?",options:["Code written against the base type keeps working, with the same expectations, when given the subtype","The subtype must override every base method","The subtype must be in the same file as the base","The subtype must add more public methods than the base"],answer:[0],explain:"Substitutability is behavioural, not just syntactic: the subtype honours the base contract. Compiling is not enough; a subtype that throws where the base promised success breaks callers even though every signature matches."},{id:"ss-pred-lsp-rect",kind:"predict",topic:"L2.lsp",level:2,prompt:"A caller expects that setting the width leaves the height alone. What does this program print?",code:`#include <iostream>

class Rectangle {
 public:
  virtual ~Rectangle() = default;
  virtual void setWidth(int w) { w_ = w; }
  virtual void setHeight(int h) { h_ = h; }
  int area() const { return w_ * h_; }
 protected:
  int w_ = 0, h_ = 0;
};
class Square : public Rectangle {
 public:
  void setWidth(int w) override { w_ = h_ = w; }
  void setHeight(int h) override { w_ = h_ = h; }
};

void stretch(Rectangle& r) {
  r.setWidth(5);
  r.setHeight(4);
  std::cout << r.area() << " ";
}

int main() {
  Rectangle r;
  Square s;
  stretch(r);
  stretch(s);
  std::cout << "\\n";
}
`,output:"20 16",options:["20 16","20 20","16 16","20 25"],answer:[0],explain:"For Rectangle: 5 x 4 = 20. For Square, setHeight(4) also overwrites the width, so the area is 16, not the 20 the caller reasoned about. The Square breaks a postcondition of setWidth/setHeight (the other dimension is unchanged), so it is not substitutable."},{id:"ss-mcq-lsp-contract",kind:"mcq",topic:"L2.lsp",level:2,prompt:"Which pair of rules matches the contract view of LSP? Choose all that apply.",options:["A subtype may not strengthen preconditions (demand more than the base did)","A subtype may not weaken postconditions (promise less than the base did)","A subtype must preserve the base class invariants","A subtype may throw any new exception type the base never mentioned"],answer:[0,1,2],explain:"Preconditions may be weakened, postconditions may be strengthened, invariants must hold. Throwing new surprise failures is a postcondition violation unless the base contract already allowed it."},{id:"ss-smell-lsp-notsupported",kind:"smell",topic:"L2.lsp",level:2,prompt:"Name the smell and the principle it strains.",code:`class Bird { public: virtual void fly() = 0; virtual ~Bird() = default; };
class Penguin : public Bird {
 public:
  void fly() override { throw std::logic_error("penguins cannot fly"); }
};`,options:["Subtype refuses an inherited operation; Liskov Substitution (and the hierarchy is modelled wrongly)","God class; Single Responsibility","Missing virtual destructor; Open/Closed","Raw pointer ownership; Dependency Inversion"],answer:[0],explain:"Callers holding a Bird are promised fly() works. Split the capability: a Bird base with Flyer as a separate interface, or composition of a movement behaviour. Throwing from an override to opt out is the classic LSP alarm."},{id:"ss-smell-lsp-precondition",kind:"smell",topic:"L2.lsp",level:3,prompt:"Which LSP rule does the override break?",code:`struct Account {
  virtual ~Account() = default;
  // Pre: amount > 0. Post: balance reduced by amount.
  virtual void withdraw(int amount) { balance_ -= amount; }
  int balance_ = 100;
};
struct SavingsAccount : Account {
  // Only allows amounts that are multiples of 50.
  void withdraw(int amount) override {
    if (amount % 50 != 0) throw std::invalid_argument("bad amount");
    Account::withdraw(amount);
  }
};`,options:["It strengthens the precondition (rejects inputs the base accepted)","It weakens the invariant by calling the base","It returns a covariant type","It overrides a non-virtual function"],answer:[0],explain:"The base accepted any positive amount; the subtype accepts only multiples of 50. A caller written against Account passing 30 now gets an exception. Subtypes may accept more, never less. Model the restriction as policy or a different type."},{id:"ss-mcq-lsp-fix-square",kind:"mcq",topic:"L2.lsp",level:3,prompt:"Square-inherits-Rectangle breaks LSP. Which fix is the soundest?",options:["Make shapes immutable value types, or expose a common Shape with area() and no independent setters","Throw from Square::setWidth","Make Square override area to return w_ squared","Add a dynamic_cast in the caller to check for Square"],answer:[0],explain:"The trouble is mutation breaking the 'independent dimensions' expectation. Immutable shapes (or a hierarchy with only area/perimeter) have no such promise to break. Throwing, special-casing with casts, or tweaking area just hides the broken contract."},{id:"ss-pat-lsp-capability",kind:"pattern",topic:"L2.lsp",level:3,prompt:"A read-only file should not inherit write() from File. Which structure respects both LSP and ISP?",options:["Separate Readable and Writable interfaces; ReadOnlyFile implements only Readable","A File base with write() that throws for read-only files","A File base with an isReadOnly() flag callers must check first","Make every file writable and ignore the flag"],answer:[0],explain:"Capabilities as separate interfaces mean a type only promises what it can do, so no caller is surprised. Throwing or flag-checking pushes the burden onto every caller and breaks substitution."},{id:"ss-mcq-isp-def",kind:"mcq",topic:"L2.isp",level:1,prompt:"What does the Interface Segregation Principle say?",options:["Clients should not be forced to depend on methods they do not use; prefer several small, role-focused interfaces","Every class should implement exactly one interface","Interfaces should contain all methods of every implementation","Interfaces should never be abstract"],answer:[0],explain:"A fat interface couples every client to operations it never calls, so unrelated changes recompile and retest them and forced stubs appear in implementers. Split by the roles the clients play."},{id:"ss-smell-isp-printer",kind:"smell",topic:"L2.isp",level:1,prompt:"Name the smell and the principle it strains.",code:`class IMachine {
 public:
  virtual void print(const Doc&) = 0;
  virtual void scan(Doc&) = 0;
  virtual void fax(const Doc&) = 0;
  virtual ~IMachine() = default;
};
class BasicPrinter : public IMachine {
 public:
  void print(const Doc&) override { /* ok */ }
  void scan(Doc&) override { /* nothing */ }
  void fax(const Doc&) override { throw std::runtime_error("unsupported"); }
};`,options:["Fat interface forcing stub methods; Interface Segregation","Type-code switch; Open/Closed","Shared global state; Dependency Inversion","Constructor too long; Single Responsibility"],answer:[0],explain:"BasicPrinter must implement scan and fax it cannot do, one of them throwing (which also strains LSP). Split into IPrinter, IScanner, IFax; a multifunction device implements all three."},{id:"ss-mcq-isp-cost",kind:"mcq",topic:"L2.isp",level:2,prompt:"What goes wrong if ISP is taken to the extreme of one-method interfaces everywhere?",options:["Many tiny types to name, wire and navigate, with little gain when the methods always travel together","Nothing; it is always optimal","Virtual calls become impossible","The compiler refuses to link the program"],answer:[0],explain:"Group methods by the clients that use them. If every consumer of a repository needs both load and save, splitting them gives wiring cost without decoupling. Split where different clients use different subsets."},{id:"ss-mcq-isp-cpp",kind:"mcq",topic:"L2.isp",level:2,prompt:"In C++, which extra benefit does a narrow interface give besides fewer stubs?",options:["Fewer recompilations of clients when an unrelated method is added, since they include only the small header","Smaller object files for every class","It lets you skip virtual destructors","Automatic thread safety"],answer:[0],explain:"Header dependencies are a real build cost in C++. A client that includes only IReader is not rebuilt when IWriter gains a method. Narrow interfaces also make fakes in tests tiny to write."},{id:"ss-pat-isp-roles",kind:"pattern",topic:"L2.isp",level:3,prompt:"A report generator only reads orders, a checkout service reads and writes them. How do you design the order store's interface?",options:["A small OrderReader interface for the report, and a store that implements both reader and writer for checkout","One IOrderStore with every method, passed to both","A global OrderStore singleton used by both","Copy the order data into each client"],answer:[0],explain:"The report depends only on what it reads, so it cannot accidentally mutate orders and is trivial to fake. The same concrete store can implement both roles, which keeps the code DRY without a fat interface."},{id:"ss-mcq-dip-def",kind:"mcq",topic:"L2.dip",level:1,prompt:"What does the Dependency Inversion Principle say?",options:["High-level policy should depend on abstractions, and details should depend on those same abstractions, not on each other directly","Always use inheritance instead of composition","Dependencies must be created inside the class that uses them","Low-level modules should call high-level modules through globals"],answer:[0],explain:"Business rules own the interface they need (for example Clock or PaymentGateway); concrete adapters implement it. Source dependencies point inward to policy, so you can swap or fake the details."},{id:"ss-smell-dip-new",kind:"smell",topic:"L2.dip",level:1,prompt:"Name the smell and the principle it strains.",code:`class OrderService {
 public:
  void place(const Order& o) {
    MySqlDatabase db("prod-host");
    db.insert(o);
    SmtpMailer mailer;
    mailer.send(o.customerEmail, "Thanks!");
  }
};`,options:["High-level logic constructs concrete details; Dependency Inversion","God interface; Interface Segregation","Subclass narrows a precondition; Liskov Substitution","Switch on type code; Open/Closed"],answer:[0],explain:"OrderService cannot be tested without a database and mail server, and swapping either means editing it. Define OrderRepository and Notifier interfaces, take them by reference or unique_ptr in the constructor, and construct concretes at the composition root."},{id:"ss-pred-dip-fake",kind:"predict",topic:"L2.dip",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <string>
#include <vector>

struct Notifier {
  virtual ~Notifier() = default;
  virtual void send(const std::string& msg) = 0;
};
struct FakeNotifier : Notifier {
  std::vector<std::string> sent;
  void send(const std::string& msg) override { sent.push_back(msg); }
};
class Checkout {
 public:
  explicit Checkout(Notifier& n) : notifier_(n) {}
  void pay(int cents) {
    if (cents <= 0) return;
    notifier_.send("paid " + std::to_string(cents));
  }
 private:
  Notifier& notifier_;
};

int main() {
  FakeNotifier fake;
  Checkout c(fake);
  c.pay(250);
  c.pay(0);
  c.pay(75);
  std::cout << fake.sent.size() << " " << fake.sent.back() << "\\n";
}
`,output:"2 paid 75",options:["2 paid 75","3 paid 75","2 paid 250","3 paid 0"],answer:[0],explain:"Checkout depends on the Notifier abstraction, so a test injects a fake that records messages. pay(0) returns early, leaving two sends; the last is 'paid 75'. This is the testability payoff of constructor injection."},{id:"ss-mcq-dip-vs-di",kind:"mcq",topic:"L2.dip",level:2,prompt:"How are Dependency Inversion (the principle) and dependency injection (the technique) related?",options:["DIP says which way source dependencies should point; injection is one way to supply the abstraction's implementation","They are the same thing","Injection requires a framework, DIP does not","DIP forbids constructors with parameters"],answer:[0],explain:"You can invert dependencies and still construct objects by hand in main(). Injection (constructor parameters, mostly) is the mechanism that keeps classes from creating their own collaborators. A container is optional convenience, not part of the principle."},{id:"ss-mcq-dip-cpp-ownership",kind:"mcq",topic:"L2.dip",level:2,prompt:"A class receives a collaborator through its constructor. Which parameter type states 'I take ownership'?",options:["std::unique_ptr<Notifier>","Notifier&","Notifier*","const Notifier&"],answer:[0],explain:"A unique_ptr parameter transfers sole ownership. A reference says the caller keeps ownership and must outlive you. A raw pointer is ambiguous about both. Pick deliberately and document lifetime for references."},{id:"ss-mcq-dip-templates",kind:"mcq",topic:"L2.dip",level:3,prompt:"Besides an abstract base class, what is a valid C++ way to invert a dependency, and what is its trade-off?",options:["Template the class on a policy type: no virtual call, but implementations are fixed at compile time and appear in headers","Use a global variable of the concrete type","Use reinterpret_cast to swap implementations","There is no other way"],answer:[0],explain:"Static polymorphism via templates or concepts removes vtable cost and allows inlining, but you cannot swap implementations at run time and error messages and compile times suffer. Virtual interfaces suit runtime-chosen plugins; templates suit hot, compile-time-known paths."},{id:"ss-mcq-dry-def",kind:"mcq",topic:"L2.dry",level:1,prompt:"Two functions contain the same 8 lines. Which situation argues AGAINST merging them?",options:["They are coincidentally similar today but serve different rules that will diverge","They are edited together every time","They both validate the same business rule","They have identical tests"],answer:[0],explain:"DRY is about duplicated knowledge, not duplicated characters. Merging code that only happens to look alike couples two reasons to change, and the shared helper soon grows boolean flags. Duplicate a little rather than abstract wrongly."},{id:"ss-mcq-kiss",kind:"mcq",topic:"L2.kiss",level:1,prompt:"An interviewer asks for a parking lot with two vehicle types. Which opening design shows KISS and good judgement?",options:["Start with a small hierarchy or enum that satisfies stated requirements, and name the extension points you would add on request","Build a plugin framework with a DSL for pricing rules","Use ten design patterns to show breadth","Skip the design and code everything in main"],answer:[0],explain:"Interviewers score fit to the requirements and awareness of change, not pattern count. State the likely change axes, build the simplest model that handles them, and let the Change Storm show where abstraction is warranted."},{id:"ss-smell-yagni",kind:"smell",topic:"L2.yagni",level:2,prompt:"Name the smell. The app has one database and one email provider and no plans to change.",code:`class AbstractRepositoryFactoryProvider {
 public:
  virtual std::unique_ptr<RepositoryFactory> create(const Config&) = 0;
};
class DefaultRepositoryFactoryProvider : public AbstractRepositoryFactoryProvider { /* ... */ };
// Only one implementation exists, and nothing else is planned.`,options:["Speculative generality; YAGNI","Fat interface; Interface Segregation","Subtype narrows its contract; Liskov Substitution","Feature envy; Law of Demeter"],answer:[0],explain:"A layer of abstraction with exactly one implementation and no evidence of a second is cost without benefit. Introduce the interface when a second variant or a test double actually needs it; refactoring to one is cheap."},{id:"ss-mcq-yagni-vs-ocp",kind:"mcq",topic:"L2.yagni",level:3,prompt:"How do you reconcile YAGNI with Open/Closed in a design interview?",options:["Abstract the axes the requirements or Change Storm signal will vary; keep everything else concrete and say so","Never abstract anything","Abstract every noun in the requirements","Choose whichever has more classes"],answer:[0],explain:"Both are about evidence. Use the stated requirements, asked clarifications and plausible follow-ups to pick two or three axes of change, build seams there, and explain what you deliberately left simple."},{id:"ss-smell-demeter",kind:"smell",topic:"L2.demeter",level:2,prompt:"Name the smell and the heuristic it breaks.",code:`double shippingCost(const Order& o) {
  return o.getCustomer().getAddress().getCountry().getShippingRate() * o.weight();
}`,options:["Train-wreck chain through other objects' internals; Law of Demeter","Missing virtual destructor; Liskov Substitution","Switch on enum; Open/Closed","God class; Single Responsibility"],answer:[0],explain:"The function knows the structure of Customer, Address and Country, so any reshuffle breaks it. Tell the order to compute it (o.shippingCost()) so only Order knows its neighbours. Do not apply this to fluent builders or value-type accessors, where chaining is fine."},{id:"ss-pred-tell",kind:"predict",topic:"L2.tell-dont-ask",level:2,prompt:"What does this program print?",code:`#include <iostream>

class Wallet {
 public:
  explicit Wallet(int cents) : cents_(cents) {}
  bool trySpend(int cost) {
    if (cost > cents_) return false;
    cents_ -= cost;
    return true;
  }
  int balance() const { return cents_; }
 private:
  int cents_;
};

int main() {
  Wallet w(100);
  bool a = w.trySpend(70);
  bool b = w.trySpend(70);
  bool c = w.trySpend(30);
  std::cout << a << b << c << " " << w.balance() << "\\n";
}
`,output:"101 0",options:["101 0","111 -40","100 30","101 30"],answer:[0],explain:"The wallet owns the rule (check and subtract in one operation), so the second spend is refused and the third succeeds: true, false, true prints 101, leaving 100 - 70 - 30 = 0. Asking for the balance and subtracting in the caller would let two callers overspend."},{id:"ss-mcq-composition",kind:"mcq",topic:"L2.composition",level:2,prompt:"Why does 'favour composition over inheritance' hold in most designs?",options:["Behaviour can be swapped at run time and combined freely, while inheritance fixes the relationship at compile time and exposes the base class's details","Composition is always faster","Inheritance is not allowed in C++ interviews","Composition removes the need for interfaces"],answer:[0],explain:"Inheritance models a true is-a that honours the contract (LSP) and is hard to change later. Composition models has-a/uses-a and lets you recombine parts, which is why Strategy and Decorator beat deep trees. Use inheritance for interfaces and genuine subtype relationships."},{id:"ss-pred-immutable",kind:"predict",topic:"L2.immutability",level:2,prompt:"What does this program print?",code:`#include <iostream>

class Money {
 public:
  Money(long long cents) : cents_(cents) {}
  Money plus(const Money& o) const { return Money(cents_ + o.cents_); }
  long long cents() const { return cents_; }
 private:
  long long cents_;
};

int main() {
  const Money a(500);
  Money b = a.plus(Money(250));
  Money c = b.plus(b);
  std::cout << a.cents() << " " << b.cents() << " " << c.cents() << "\\n";
}
`,output:"500 750 1500",options:["500 750 1500","750 750 1500","500 750 750","1500 1500 1500"],answer:[0],explain:"plus returns a new Money and never mutates its receiver, so a stays 500, b is 750 and c is 1500. Immutable value types are safe to share across threads and cannot have invariants broken by a distant caller."},{id:"ss-mcq-const-correct",kind:"mcq",topic:"L2.immutability",level:1,prompt:"Which C++ practice best supports an immutable-by-default design?",options:["Mark getters const, take read-only inputs as const&, and make members const or private with no setters","Make every member public","Use const_cast to remove const when convenient","Avoid const to keep signatures short"],answer:[0],explain:"const member functions and const references document and enforce that a call does not change state. Public mutable fields, or casting const away, remove the guarantee that keeps invariants local to the class."},{id:"ss-smell-feature-envy",kind:"smell",topic:"L2.tell-dont-ask",level:3,prompt:"Name the smell and the better home for the logic.",code:`class Cart {
 public:
  std::vector<Item> items;
};
double total(const Cart& c) {
  double sum = 0;
  for (const auto& i : c.items) sum += i.price * i.qty;
  if (sum > 100) sum *= 0.9;
  return sum;
}`,options:["Feature envy (anemic model); move total() into Cart so it owns its items and rules","Fat interface; split Cart into readers and writers","Covariant return; Liskov Substitution","Singleton; Dependency Inversion"],answer:[0],explain:"The free function reaches into Cart's data to apply rules that belong to the cart, and every caller can duplicate or diverge from them. Put total() on Cart and keep items private so the discount rule has one home."},{id:"ss-mcq-coupling",kind:"mcq",topic:"L2.coupling",level:2,prompt:"Which pairing is the healthiest target for module design?",options:["High cohesion within a module, low coupling between modules","Low cohesion inside, high coupling outside","High coupling, so changes propagate quickly","Cohesion and coupling do not matter for design"],answer:[0],explain:"Related things together and unrelated things apart: a change should touch one module. Coupling through narrow, stable abstractions is fine; coupling through shared mutable state or concrete types is what hurts."},{id:"ss-mcq-explain-order",kind:"mcq",topic:"L2.interview",level:3,prompt:"In an LLD interview, what is the most convincing way to present SOLID?",options:["Name the likely change, show the seam you put there, and say what you left simple and why","List all five principles in your opening minute","Add an interface for every class","Avoid mentioning trade-offs to sound confident"],answer:[0],explain:"Senior signals are judgement and communication: tie each abstraction to a concrete change, state the cost, and show you can stop. Reciting acronyms or abstracting everything reads as cargo-culting."},{id:"ss-pat-dip-strategy",kind:"pattern",topic:"L2.dip",level:2,prompt:"A sorter must support several comparison orders chosen at run time, without the sorter knowing any of them. Which Patternling fits?",options:["Chamelstrat (Strategy)","Solo (Singleton)","Facadeon (Facade)","Clonewisp (Prototype)"],answer:[0],explain:"Strategy injects interchangeable algorithms behind one interface, so the sorter depends only on the abstraction (DIP) and new orders add classes (OCP). Singleton, Facade and Prototype address instance count, simplification and copying."}];e.s(["f",0,a],94448);let i=[{id:"cf-mcq-fm-intent",kind:"mcq",topic:"L3.factory-method",level:1,prompt:"What is the core idea of the Factory Method pattern?",options:["A base class calls an overridable creation function, so each subclass decides which concrete product to build","A single global function with a big switch that builds every type","A class that can only ever have one instance","A way to copy an existing object through a base pointer"],answer:[0],explain:"The creator holds the workflow and defers one step, 'make the product', to subclasses. The switch-in-one-function version is the simple factory, which is useful but is not the GoF pattern. Singleton and Prototype solve different problems."},{id:"cf-pat-fm-importer",kind:"pattern",topic:"L3.factory-method",level:1,prompt:"An Importer runs the same steps for every file, but the parser it needs (JSON, CSV, XML) depends on the importer subclass. Which Patternling fits?",options:["Forgebot (Factory Method)","Solo (Singleton)","Clonewisp (Prototype)","Beaverbuild (Builder)"],answer:[0],explain:"The workflow is fixed in the base class and one creation step is overridden: Factory Method. Builder assembles one complex object step by step, which is not what is happening here."},{id:"cf-pred-fm-importer",kind:"predict",topic:"L3.factory-method",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"csv json",options:["csv json","json csv","csv csv","json json"],answer:[0],explain:"run() is written once in Importer, yet each call reaches the subclass's makeParser() by virtual dispatch. The caller never names JsonParser or CsvParser. Returning unique_ptr makes ownership of the new object explicit."},{id:"cf-smell-fm-switch",kind:"smell",topic:"L3.factory-method",level:2,prompt:"Name the smell and the principle it strains.",code:`class ReportService {
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
};`,options:["The client names every concrete writer and branches on a type string; Open/Closed and Dependency Inversion","Fat interface; Interface Segregation","Covariant return; Liskov Substitution","Global state; Single Responsibility"],answer:[0],explain:"Each new format edits ReportService, and the service depends on every concrete writer. Put creation behind a factory (a function, a registry or a Factory Method) that returns a Writer interface, and let the service use only that interface."},{id:"cf-mcq-fm-simple",kind:"mcq",topic:"L3.factory-method",level:2,prompt:"Your code has one `makeShape(kind)` function with a switch and 4 shapes that rarely change. In an interview, what is the honest assessment?",options:["A simple factory is fine here; reach for the full Factory Method hierarchy only when creation must vary by subclass","It is wrong; all factories must be abstract class hierarchies","It must be replaced by a Singleton","It violates RAII"],answer:[0],explain:"A plain function is the cheapest creation seam and is easy to test. A parallel creator hierarchy costs one class per product, which only pays off when an existing workflow needs a subclass to choose the product. Saying so shows judgement about YAGNI."},{id:"cf-mcq-fm-plugin",kind:"mcq",topic:"L3.factory-method",level:3,prompt:"New payment methods are added by other teams as plugins, without recompiling the checkout. Which creation approach scales best?",options:["A registry mapping a key to a creator function, filled by each plugin at start-up","A switch in the checkout that grows with every plugin","A Singleton that stores every payment ever made","Copy-pasting the checkout per payment method"],answer:[0],explain:"A registry (a map from key to std::function<std::unique_ptr<Payment>()>) keeps the checkout closed to modification. The trade-off is that registration order and missing keys become run-time concerns, so validate the key and give a clear error."},{id:"cf-mcq-af-intent",kind:"mcq",topic:"L3.abstract-factory",level:1,prompt:"What problem does Abstract Factory solve that Factory Method alone does not?",options:["Creating whole families of related products that must be used together, behind one interface","Ensuring only one instance of a class exists","Making an object immutable after construction","Avoiding virtual functions entirely"],answer:[0],explain:"An Abstract Factory has one creation function per product in the family (button, checkbox, scrollbar) and each concrete factory returns a consistent set. Factory Method creates a single product."},{id:"cf-pat-af-theme",kind:"pattern",topic:"L3.abstract-factory",level:2,prompt:"A UI toolkit must produce a matching set of widgets (button, checkbox, menu) for a dark or a light theme, and never mix the two. Which Patternling fits?",options:["Forgebot (Factory Method / Abstract Factory)","Swapwing (Strategy)","Solo (Singleton)","Shellcrab (Decorator)"],answer:[0],explain:"Related products created together under one theme are the Abstract Factory case, which is the family-sized relative of Factory Method. Strategy swaps one algorithm, and Decorator layers behaviour onto one object."},{id:"cf-pred-af-family",kind:"predict",topic:"L3.abstract-factory",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"dark-btn dark-box light-btn light-box",options:["dark-btn dark-box light-btn light-box","dark-btn light-box light-btn dark-box","light-btn light-box dark-btn dark-box","dark-btn dark-box dark-btn dark-box"],answer:[0],explain:"render() is given one factory, so both widgets it creates come from the same family. The compiler cannot mix a DarkButton with a LightCheckbox through this interface, which is the consistency guarantee the pattern sells."},{id:"cf-smell-af-mixed",kind:"smell",topic:"L3.abstract-factory",level:2,prompt:"What is wrong with this creation code, and which pattern removes the risk?",code:`Toolbar buildToolbar(bool dark) {
  std::unique_ptr<Button> btn;
  if (dark) btn = std::make_unique<DarkButton>();
  else btn = std::make_unique<LightButton>();
  auto box = std::make_unique<LightCheckbox>();   // forgot the theme
  return Toolbar(std::move(btn), std::move(box));
}`,options:["Each product is chosen separately, so a dark button can be paired with a light checkbox; Abstract Factory enforces one family","The Toolbar is not const-correct; add const everywhere","std::move should be std::copy; Prototype fixes this","The function should be a Singleton"],answer:[0],explain:"Choosing each product independently lets a theme mismatch slip in. Pass one Theme factory in and ask it for every widget, so consistency is a property of the design instead of discipline."},{id:"cf-mcq-af-cost",kind:"mcq",topic:"L3.abstract-factory",level:3,prompt:"A family has 3 products and 2 factories. What is the main cost when you add a fourth product (a Slider)?",options:["Every abstract and concrete factory must change, because the interface gained a new creation function","Nothing; factories are open to any new product","Only the client code changes","The program must be rewritten without virtual functions"],answer:[0],explain:"Abstract Factory is open to new families (add a factory) but closed to new product kinds (edit all factories). Know which axis your problem varies on before choosing it: if product kinds change often, a registry or a data-driven approach may be better."},{id:"cf-mcq-af-vs-fm",kind:"mcq",topic:"L3.abstract-factory",level:3,prompt:"How would you describe the relationship between Factory Method and Abstract Factory to an interviewer?",options:["An Abstract Factory is usually a set of factory methods, one per product, grouped so they vary together","They are unrelated and never appear in the same design","Abstract Factory is Factory Method with a Singleton inside","Factory Method is only for Java; C++ uses Abstract Factory"],answer:[0],explain:"Each creation function on an Abstract Factory is itself a factory method. The extra structure is the guarantee that the products come from one family. Mentioning this link shows you understand the patterns instead of memorising class diagrams."},{id:"cf-mcq-builder-intent",kind:"mcq",topic:"L3.builder",level:1,prompt:"When is a Builder a better fit than a constructor?",options:["When an object has many optional or order-dependent parts, so a long argument list would be unreadable and error-prone","When the object has exactly one field","When you want exactly one instance in the program","When the object must be created on the stack"],answer:[0],explain:"Builders give each part a name at the call site and let you validate the whole at build(). For three required arguments, a constructor (or an aggregate with designated initialisers in C++20) is simpler and a Builder is only ceremony."},{id:"cf-smell-builder-ctor",kind:"smell",topic:"L3.builder",level:1,prompt:"Name the smell in this call and a good fix.",code:`HttpRequest req("api.example.com", 443, true, false, 30, 3, true,
                "POST", "/v1/items", "", false);`,options:["Long parameter list with anonymous flags (telescoping constructor); use a Builder or a named options struct","God class; split it into two classes","Singleton misuse; inject the request","Slicing; pass by pointer"],answer:[0],explain:"Nobody can tell which `true` is TLS and which is keep-alive, and swapping two adjacent arguments compiles fine. A fluent Builder (`.host().tls().timeoutSeconds()`) or a C++20 designated-initialiser options struct makes each value self-describing."},{id:"cf-pat-builder-query",kind:"pattern",topic:"L3.builder",level:1,prompt:"A search query has optional filters, sort order, paging and field selection. Callers should set only what they need and get a validated, ready-to-use object at the end. Which Patternling fits?",options:["Beaverbuild (Builder)","Clonewisp (Prototype)","Solo (Singleton)","Swapwing (Strategy)"],answer:[0],explain:"Step-by-step assembly of a complex object with optional parts, finished by a build() call that can check invariants, is Builder."},{id:"cf-pred-builder-reuse",kind:"predict",topic:"L3.builder",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"30cm:olive+basil 30cm:olive+basil+ham",options:["30cm:olive+basil 30cm:olive+basil+ham","30cm:olive+basil 30cm:ham","30cm:olive+basil+ham 30cm:olive+basil+ham","25cm:olive+basil 25cm:olive+basil+ham"],answer:[0],explain:"build() returns a copy, so `first` is unaffected by the later topping. The builder itself keeps its state, so the second pizza has all three toppings. A reusable builder needs a decision: either document that reuse accumulates, or reset the state in build()."},{id:"cf-mcq-builder-validate",kind:"mcq",topic:"L3.builder",level:2,prompt:"Where should a Builder enforce 'a request must have a host and a positive timeout'?",options:["In build(), failing there if the combination is invalid, so no half-valid object ever escapes","Nowhere; the caller is responsible","In every setter, by throwing as soon as one field is missing","In the destructor of the product"],answer:[0],explain:"Cross-field rules can only be checked once everything is set, so build() is the natural gate. Returning `std::optional` or an error result (or throwing, where exceptions are allowed) lets the product keep a strong invariant after construction."},{id:"cf-mcq-builder-cpp20",kind:"mcq",topic:"L3.builder",level:3,prompt:"In C++20, an options struct such as `Options{.timeout = 30, .retries = 3}` is sometimes used instead of a Builder. What is the trade-off?",options:["It is lighter and has no extra class, but it cannot validate across fields or hide the product's representation","It is slower in every case","It cannot hold default values","It only works with virtual functions"],answer:[0],explain:"Designated initialisers give named arguments with defaults and zero ceremony. They allow any partially filled struct to exist and expose all fields, so use a Builder (or a validating factory taking the struct) when invariants or encapsulation matter."},{id:"cf-mcq-builder-director",kind:"mcq",topic:"L3.builder",level:3,prompt:"What does a 'director' add in the classic Builder structure?",options:["A reusable recipe that drives a builder through a fixed sequence of steps, such as a 'standard meal'","A global instance of the builder","Automatic memory management","Thread safety for all builders"],answer:[0],explain:"The director captures common construction sequences so callers do not repeat them, and the same recipe can drive different builders (for example one that builds HTML and one that builds plain text). Many real designs skip it and just provide named helper functions."},{id:"cf-mcq-proto-intent",kind:"mcq",topic:"L3.prototype",level:1,prompt:"Why does Prototype give objects a virtual clone() instead of letting callers write `Base copy = *ptr;`?",options:["Copying through a base type slices off the derived part; a virtual clone() copies the real dynamic type","Copy constructors are not allowed in C++","clone() is always faster than a copy constructor","Because Base is always abstract"],answer:[0],explain:"`Base copy = *ptr;` copies only the Base subobject. A virtual clone() runs inside the derived class, where the full type is known, and returns a new heap object of the same dynamic type."},{id:"cf-pred-proto-clone",kind:"predict",topic:"L3.prototype",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"square7 square9",options:["square7 square9","square7 circle9","square9 square9","shape7 shape9"],answer:[0],explain:"clone() on a Square returns a Square copy that already carries tag 7, then the copy is edited independently. Callers only ever held Shape pointers, yet the dynamic type survived the copy."},{id:"cf-pred-proto-slice",kind:"predict",topic:"L3.prototype",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"woof ...",options:["woof ...","woof woof","... ...","... woof"],answer:[0],explain:"The original is still a Dog, but `Animal copy = *p;` builds a plain Animal from the base subobject, so the override is lost. This is exactly the bug a virtual clone() prevents."},{id:"cf-mcq-proto-covariant",kind:"mcq",topic:"L3.prototype",level:3,prompt:"You want `Circle::clone()` to return `std::unique_ptr<Circle>` while `Shape::clone()` returns `std::unique_ptr<Shape>`. What happens?",options:["It does not compile: covariant returns work for raw pointers and references, not for smart pointers","It compiles and works as covariant return","It compiles only with a Singleton","It works only if Shape is final"],answer:[0],explain:"Covariance requires the return types to be pointers or references to related classes, and unique_ptr<Circle> is an unrelated class type to the compiler. The usual workaround is a protected virtual doClone() returning unique_ptr<Shape>, plus a non-virtual public clone() in each class that wraps it with the precise type (or a CRTP helper)."},{id:"cf-smell-proto-shallow",kind:"smell",topic:"L3.prototype",level:2,prompt:"What is the bug in cloning this class by its default copy?",code:`class Document {
 public:
  Document(std::string t) : title_(std::move(t)), style_(new Style()) {}
  ~Document() { delete style_; }
  // no copy constructor declared
 private:
  std::string title_;
  Style* style_;
};`,options:["A shallow copy duplicates the raw pointer, so two Documents delete the same Style (double free); follow the Rule of Three/Five or use unique_ptr","The title will be sliced","The destructor should be virtual-free","Nothing; default copies are always deep"],answer:[0],explain:"The implicitly generated copy copies the pointer value. Both documents then delete one Style. Prefer value members or `std::unique_ptr<Style>` (with an explicit deep-copy constructor), so the compiler stops you from copying by accident."},{id:"cf-pat-proto-sprite",kind:"pattern",topic:"L3.prototype",level:2,prompt:"A game spawns hundreds of enemies from a handful of fully configured templates (stats, sprite, AI settings). Copying a template is much cheaper than re-reading the config. Which Patternling fits?",options:["Clonewisp (Prototype)","Beaverbuild (Builder)","Solo (Singleton)","Forgebot (Factory Method)"],answer:[0],explain:"A configured exemplar copied to make new objects is Prototype. Check that a copy is genuinely cheaper than construction, and that mutable shared resources (textures, handles) are shared on purpose and not accidentally duplicated."},{id:"cf-mcq-single-intent",kind:"mcq",topic:"L3.singleton",level:1,prompt:"What are the two things a Singleton guarantees?",options:["At most one instance exists, and there is a global access point to it","The object is immutable and copyable","The object is thread-local and reference counted","The object lives on the heap and is never destroyed"],answer:[0],explain:"One instance plus global access. The second half is what causes most of the trouble: any code can reach the object without declaring the dependency in its interface."},{id:"cf-pred-single-meyers",kind:"predict",topic:"L3.singleton",level:2,prompt:"What does this program print?",code:`#include <iostream>

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
`,output:"start init 3 1",options:["start init 3 1","start init 3 4","init start 3 1","start init 3 3"],answer:[0],explain:"The function-local static is built on first use, after 'start' (a Meyers singleton). But `auto c = ...` deduces Counter, not Counter&, so it takes a copy through the implicitly public copy constructor. The copy reaches 3 while the real instance is still at 0, so its next() gives 1. A real Singleton deletes its copy operations."},{id:"cf-mcq-single-threadsafe",kind:"mcq",topic:"L3.singleton",level:2,prompt:"Since C++11, what does the language guarantee about `static Counter c;` inside `instance()`?",options:["Concurrent first calls are safe: exactly one thread runs the initialiser and the others wait","Nothing; you must always add your own mutex","The initialiser may run once per thread","It is initialised before main() starts"],answer:[0],explain:"Function-local statics are initialised thread-safely on first use. That protects construction only. Calls to member functions like next() are still data races unless the object guards its own state, for example with a mutex or std::atomic."},{id:"cf-smell-single-hidden",kind:"smell",topic:"L3.singleton",level:2,prompt:"Name the smell and the principle it strains.",code:`class OrderService {
 public:
  void place(const Order& o) {
    if (!Config::instance().isOpen()) return;
    Logger::instance().log("placing " + o.id());
    Database::instance().save(o);
  }
};`,options:["Hidden dependencies on three global singletons; Dependency Inversion (and the class cannot be unit-tested in isolation)","Fat interface; Interface Segregation","Primitive obsession; Open/Closed","Slicing; Liskov Substitution"],answer:[0],explain:"The constructor says OrderService needs nothing, yet place() touches config, logs and the database. Tests cannot substitute fakes, and state leaks between tests. Inject interfaces through the constructor and let main (the composition root) wire the real ones."},{id:"cf-mcq-single-testing",kind:"mcq",topic:"L3.singleton",level:3,prompt:"What is the standard way to keep 'only one instance' while avoiding global access?",options:["Create one object in main() (the composition root) and pass it by reference or pointer to the classes that need it","Make all its data members static","Mark it `volatile` so it cannot be copied","Create it in a header-only global variable"],answer:[0],explain:"Single instance is a lifetime decision; global access is a visibility decision. Dependency injection keeps the first and drops the second, so each class states what it needs and tests can pass a fake. Reserve a true Singleton for things that are genuinely process-wide."},{id:"cf-mcq-single-order",kind:"mcq",topic:"L3.singleton",level:3,prompt:"What is the 'static initialisation order fiasco', and why does a Meyers singleton avoid part of it?",options:["Globals in different translation units are initialised in unspecified order, so one may use another before it exists; a function-local static is built on first use","Statics are destroyed before they are constructed in every program","It means two threads can construct a static twice","It only happens for objects stored on the heap"],answer:[0],explain:"Construct-on-first-use removes the construction-order problem. Destruction order at exit can still bite: if a static's destructor uses another static that is already gone, behaviour is undefined. Keep singletons free of destructors that depend on other singletons."},{id:"cf-pat-single-registry",kind:"pattern",topic:"L3.singleton",level:2,prompt:"A process must hold exactly one handle to a hardware GPIO controller, because two owners would corrupt the device. Which Patternling is the textbook fit (with caveats)?",options:["Solo (Singleton)","Clonewisp (Prototype)","Beaverbuild (Builder)","Swapwing (Strategy)"],answer:[0],explain:"Exclusive access to a unique physical resource is the legitimate case. Even then, prefer creating it once in main and injecting it, and watch for the Global State debuff when Solo is used for convenience rather than necessity."},{id:"cf-mcq-pool-intent",kind:"mcq",topic:"L3.object-pool",level:2,prompt:"When is an Object Pool worth its complexity?",options:["When creating an object is expensive (connections, large buffers) and objects are reused at a measured, high rate","Whenever you use new","Only for objects smaller than a cache line","When you need exactly one instance"],answer:[0],explain:"A pool trades memory held idle and extra bookkeeping for lower creation cost and bounded resources (like a database connection limit). For cheap objects the allocator is usually faster than your pool. Measure first."},{id:"cf-pred-pool-reuse",kind:"predict",topic:"L3.object-pool",level:3,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"0 2 1 1",options:["0 2 1 1","1 2 0 0","0 1 1 1","2 0 1 1"],answer:[0],explain:"The first two acquires create objects 0 and 1. After release(a), the next acquire reuses object 0 (so c == a is true, printed as 1) and the one after that finds the free list empty and creates object 2. The pool never destroys its objects until it dies, which is the memory-for-speed trade. Releasing a pointer twice, or releasing one that is still in use, would corrupt this design; that is why real pools hand out RAII handles."},{id:"cf-mcq-pool-raii",kind:"mcq",topic:"L3.object-pool",level:3,prompt:"Callers sometimes forget to release pooled connections, and the pool slowly runs dry. What is the idiomatic C++ fix?",options:["Return an RAII handle (for example a unique_ptr with a custom deleter) that gives the object back to the pool on destruction","Ask callers to read the documentation more carefully","Make the pool a Singleton","Never release; allocate a new object each time"],answer:[0],explain:"Tie release to scope exit so it happens on every path, including early returns and exceptions. Also make sure the handle cannot outlive the pool, and reset the object's state on release so the next user does not see stale data."},{id:"cf-mcq-di-composition-root",kind:"mcq",topic:"L3.di",level:2,prompt:"In dependency injection, what is the 'composition root'?",options:["The one place near program start (often main) where concrete objects are created and wired together","The base class of every service","A global registry that classes query whenever they need something","The destructor that runs at exit"],answer:[0],explain:"Keeping `new` and make_unique for services in one place means the rest of the code depends only on interfaces. The result is easy to test with fakes, and the wiring is readable in one screen."},{id:"cf-smell-di-locator",kind:"smell",topic:"L3.di",level:3,prompt:"This looks like dependency injection but hides the same problem as a Singleton. What is it?",code:`class Checkout {
 public:
  explicit Checkout(ServiceLocator& sl) : sl_(sl) {}
  void pay(const Cart& c) {
    sl_.get<PaymentGateway>().charge(c.total());
    sl_.get<Mailer>().send(c.owner(), "paid");
  }
 private:
  ServiceLocator& sl_;
};`,options:["Service Locator: the real dependencies are invisible in the signature and fail at run time if unregistered; inject PaymentGateway and Mailer directly","Slicing of the Cart","Missing virtual destructor on Checkout","Over-use of const"],answer:[0],explain:"A locator is global state with extra steps: you cannot see what Checkout needs without reading its body, and a missing registration shows up as a run-time failure. Constructor injection documents requirements and lets the compiler help."},{id:"cf-mcq-di-container",kind:"mcq",topic:"L3.di",level:3,prompt:"C++ projects rarely use a reflection-based DI container. Why, and what is the usual alternative?",options:["C++ has no runtime reflection, so teams wire dependencies by hand in main or with small factory functions (compile-time libraries exist but are optional)","Because C++ forbids passing objects to constructors","Because dependency injection only works in garbage-collected languages","Because containers are slower than raw pointers by a factor of 100"],answer:[0],explain:"Manual constructor injection is explicit and cheap, and a long main() is a feature (it is the architecture, written down). A container starts to pay off only when object graphs are large and lifetimes (per request, per session) need managing."},{id:"cf-mcq-choose-builder-factory",kind:"mcq",topic:"L3.builder",level:3,prompt:"How do you explain the difference between Builder and Factory in one sentence?",options:["A factory decides which type to create and returns it in one call; a builder assembles one complex object over several steps","They are the same pattern with different names","A factory is for stack objects and a builder is for heap objects","A builder always returns a pointer; a factory always returns a value"],answer:[0],explain:"Factories answer 'which class?' and builders answer 'how do I configure this one?'. Real designs combine them: a factory chooses a builder, or a builder's build() delegates to a factory for the correct product subtype."},{id:"cf-pat-choose-config",kind:"pattern",topic:"L3.factory-method",level:2,prompt:"A game reads a level file naming monster kinds as strings and must create the right class for each, without the loader knowing every class. Which Patternling is the closest fit?",options:["Forgebot (Factory Method)","Clonewisp (Prototype)","Solo (Singleton)","Shellcrab (Decorator)"],answer:[0],explain:"Mapping a key to a creator behind an interface is a factory (here a registry-based one). Prototype is a close second if each kind is a configured template that you copy, so state which you picked and why."},{id:"cf-mcq-choose-overuse",kind:"mcq",topic:"L3.factory-method",level:3,prompt:"In a review, you see a `FooFactoryFactory` that creates `FooFactory` objects for one concrete `Foo`. What is the right call?",options:["Remove the layers; indirection with no varying axis is speculative generality and costs readability","Add a third factory for symmetry","Convert it to a Singleton","Leave it; more patterns always mean better design"],answer:[0],explain:"A pattern earns its place by absorbing a change you can name. If nothing varies, the factory is just a longer way to write `Foo{}`. Interviewers reward the candidate who can say when not to use a pattern."}];e.s(["f",0,i],60517);let o=[{id:"sb-mcq-ad-intent",kind:"mcq",topic:"L4.adapter",level:1,prompt:"What problem does the Adapter pattern solve?",options:["An existing class has the behaviour you need but the wrong interface, so a wrapper translates it to the interface your code expects","It lets an object change behaviour when its internal state changes","It guarantees only one instance of a class exists","It lets many objects share one copy of common data"],answer:[0],explain:"Adapter changes the shape of an interface, not the behaviour behind it. It is the tool for third-party or legacy code you cannot edit. State, Singleton and Flyweight solve unrelated problems."},{id:"sb-pat-ad-sdk",kind:"pattern",topic:"L4.adapter",level:1,prompt:"Your app talks to a `PaymentGateway` interface. A vendor SDK offers `charge(cents, currencyCode)` with different names and types, and you cannot change it. Which Patternling fits?",options:["Axolink (Adapter)","Flytile (Flyweight)","Facadeon (Facade)","Shellcrab (Decorator)"],answer:[0],explain:"You have one target interface and one incompatible class: Adapter. A Facade would simplify a whole subsystem behind a new interface of its own choosing, and a Decorator keeps the interface the same while adding behaviour."},{id:"sb-pred-ad-temp",kind:"predict",topic:"L4.adapter",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"100 0",options:["100 0","212 32","100 32","0 100"],answer:[0],explain:"The client only sees Celsius::read(). The adapter converts on every call: (212-32)*5/9 = 100 and (32-32)*5/9 = 0. Note the adapter stores a const reference, so the sensor must outlive it; owning a copy or a shared_ptr is the safer choice when lifetimes are unclear."},{id:"sb-mcq-ad-object-class",kind:"mcq",topic:"L4.adapter",level:2,prompt:"In C++ you can build an adapter by composition (holding the adaptee) or by private inheritance from the adaptee. Which is the better default and why?",options:["Composition: the adapter depends only on the adaptee's public interface, can wrap a subclass or a fake, and cannot accidentally expose adaptee internals","Private inheritance: it is always faster because there is no pointer","Public inheritance from both: it keeps every method available","Neither works in C++ because adapters need interfaces from Java"],answer:[0],explain:"Composition is the object adapter and is easier to test and to extend. Private inheritance (class adapter) is legitimate when you must override a virtual of the adaptee or need empty-base optimisation, but it ties you to one concrete class. Public inheritance leaks the wrong interface."},{id:"sb-smell-ad-leak",kind:"smell",topic:"L4.adapter",level:3,prompt:"Name the smell and the principle it strains.",code:`class OrderService {
 public:
  void pay(const Order& o) {
    VendorClient c;                       // third-party type
    VendorResult r = c.charge(o.totalCents(), "USD");
    if (r.code == VendorResult::kDeclinedSoft) {
      retryLater(o);
    }
  }
};`,options:["Vendor types and error codes leak into domain code; Dependency Inversion (and the Adapter that should hide them is missing)","A class does too many unrelated things; Interface Segregation","A subclass strengthens a precondition; Liskov Substitution","A switch on type; Open/Closed"],answer:[0],explain:"The business logic now compiles against the vendor SDK and its codes. Define a PaymentGateway interface in your own terms and put the vendor mapping, including error translation, in one adapter. Swapping vendors then touches one file."},{id:"sb-mcq-br-intent",kind:"mcq",topic:"L4.bridge",level:1,prompt:"What is the core idea of the Bridge pattern?",options:["Split an abstraction and its implementation into two hierarchies joined by composition, so each can vary independently","Wrap an object so it can be used where a different interface is required","Let several objects share state to save memory","Provide one simple entry point to a complicated subsystem"],answer:[0],explain:"Bridge is chosen up front when two dimensions of variation exist. Adapter fixes a mismatch after the fact. The other options describe Flyweight and Facade."},{id:"sb-pat-br-notify",kind:"pattern",topic:"L4.bridge",level:2,prompt:"You send Alerts and Reminders (message kinds) over Email, SMS and Push (channels). Subclassing each pair would create 6 classes, and 8 after one more channel. Which Patternling fits?",options:["Bridgeback (Bridge)","Shellcrab (Decorator)","Axolink (Adapter)","Fractree (Composite)"],answer:[0],explain:"Two independent dimensions, message kind and channel, multiply into a class explosion. Bridge keeps two small hierarchies (kinds x channels = 2 + 3 classes) and lets a kind hold a Channel. Decorator also avoids explosion, but for stackable behaviour on one interface."},{id:"sb-pred-br-shape",kind:"predict",topic:"L4.bridge",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"vec(3) px(6)",options:["vec(3) px(6)","vec(3) px(3)","px(6) vec(3)","vec(6) px(6)"],answer:[0],explain:"Circle is the abstraction; Renderer is the implementor it holds. The same Circle class produces two outputs depending on which renderer was bridged in, with no Vector/Raster subclasses of Circle. Adding a Square or a new renderer never touches the other side."},{id:"sb-mcq-br-vs-strategy",kind:"mcq",topic:"L4.bridge",level:3,prompt:"Bridge and Strategy have nearly the same class diagram: an object holding a pointer to an interface. How do you tell them apart in an interview?",options:["By intent: Bridge separates a whole abstraction hierarchy from an implementation hierarchy, while Strategy swaps one algorithm inside a single class","Bridge uses inheritance and Strategy uses templates","Strategy can only be chosen at compile time","There is no difference and interviewers accept either name"],answer:[0],explain:"Same structure, different intent. If both sides have their own growing hierarchy (shapes x renderers) you are describing a Bridge. If one class just takes a replaceable policy (a sort order, a retry rule), it is a Strategy. Naming the intent shows you know patterns are about problems, not diagrams."},{id:"sb-smell-br-explosion",kind:"smell",topic:"L4.bridge",level:2,prompt:"Name the smell and the principle it strains.",code:`class Message { /* ... */ };
class EmailAlert    : public Message { /* ... */ };
class SmsAlert      : public Message { /* ... */ };
class PushAlert     : public Message { /* ... */ };
class EmailReminder : public Message { /* ... */ };
class SmsReminder   : public Message { /* ... */ };
class PushReminder  : public Message { /* ... */ };
// next sprint: add a WhatsApp channel...`,options:["A class per combination of two independent axes (a class explosion); Open/Closed, fixed by composing a Channel into the message","A fat interface forcing unused methods; Interface Segregation","A god class with many responsibilities; Single Responsibility","A derived class that cannot replace its base; Liskov Substitution"],answer:[0],explain:"Every new channel adds a class per message kind, and every new kind adds a class per channel. Inheritance is being used for two jobs at once. Hold a Channel by composition and the matrix collapses to a sum."},{id:"sb-mcq-co-intent",kind:"mcq",topic:"L4.composite",level:1,prompt:"When is the Composite pattern the right fit?",options:["When you have a tree of parts and wholes and want clients to treat a single item and a group of items through the same interface","When you need to undo a sequence of operations","When a class must hide a third-party API behind a new one","When object creation is expensive and should be pooled"],answer:[0],explain:"File systems, UI widget trees, org charts and expression trees are classic composites. The recursion lives in the composite node, so the client has no if-leaf-else-folder branches."},{id:"sb-pat-co-folder",kind:"pattern",topic:"L4.composite",level:1,prompt:"A file manager must report the size of a file, and of a folder that can hold files and other folders, using the same call. Which Patternling fits?",options:["Fractree (Composite)","Proxifox (Proxy)","Flytile (Flyweight)","Bridgeback (Bridge)"],answer:[0],explain:"A folder is a node that holds children of the same interface, and its size() sums theirs. That recursive part-whole structure is Composite."},{id:"sb-pred-co-size",kind:"predict",topic:"L4.composite",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"24",options:["24","22","23","25"],answer:[0],explain:"sub = 1 + 5 + 7 = 13. root = 1 + 10 + 13 = 24. Each Folder adds 1 for itself, which is why 22 (forgetting both folders) and 23 (counting only one) are wrong. The client calls root->size() once and recursion does the rest."},{id:"sb-mcq-co-safety",kind:"mcq",topic:"L4.composite",level:3,prompt:"Where should `add(child)` live: on the common Node interface (transparency) or only on Folder (safety)? What is the honest trade-off?",options:["On the interface gives uniform client code but lets you call add on a File at runtime; only on Folder is type-safe but clients must downcast or know which node they hold","It must always be on the interface or the pattern is not Composite","It must always be on Folder only, since leaves never have children","It does not matter because C++ ignores unused virtuals"],answer:[0],explain:"GoF discuss exactly this tension. A common pragmatic design keeps child management off the shared interface and builds trees through a Folder or a builder, so leaves cannot be misused, while operations that make sense on both (size, render) stay on Node."},{id:"sb-smell-co-branch",kind:"smell",topic:"L4.composite",level:2,prompt:"Name the smell and the principle it strains.",code:`int totalSize(const Entry& e) {
  if (e.isFile) {
    return e.bytes;
  }
  int sum = 0;
  for (const Entry& child : e.children) {
    sum += totalSize(child);
  }
  return sum;
}
// every new operation (count, search, render) repeats this isFile branch`,options:["Clients branch on leaf versus group, so every new operation re-implements the traversal; Open/Closed (use Composite with a shared interface)","Global mutable state; Dependency Inversion","A subclass that throws on a base method; Liskov Substitution","A constructor doing I/O; Single Responsibility"],answer:[0],explain:"One struct plays both leaf and folder, and a flag tells them apart. That scatters the leaf/group decision across every function. A Node interface with File and Folder implementations puts each behaviour next to its data."},{id:"sb-mcq-de-intent",kind:"mcq",topic:"L4.decorator",level:1,prompt:"What does the Decorator pattern do?",options:["Wraps an object in another that has the same interface and adds behaviour before or after delegating, and wrappers can be stacked","Converts one interface into a different one","Defers the creation of an expensive object until it is used","Lets a subclass override one step of a fixed algorithm"],answer:[0],explain:"Because the wrapper has the same interface, clients cannot tell, and wrappers compose in any order at run time. Adapter changes the interface, Proxy controls access, and Template Method is the last option."},{id:"sb-pat-de-coffee",kind:"pattern",topic:"L4.decorator",level:1,prompt:"A coffee can get any mix of milk, sugar and whip, each adding to the price and description. Subclassing every combination is hopeless. Which Patternling fits?",options:["Shellcrab (Decorator)","Bridgeback (Bridge)","Fractree (Composite)","Solo (Singleton)"],answer:[0],explain:"Each topping wraps the drink and adds to cost() and description(), so any combination is built at run time. Shellcrab gains a shell per wrapper."},{id:"sb-pred-de-coffee",kind:"predict",topic:"L4.decorator",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"espresso+milk+sugar+milk 310",options:["espresso+milk+sugar+milk 310","espresso+milk+sugar+milk 260","espresso+milk 250","espresso+sugar+milk+milk 310"],answer:[0],explain:"Wrappers apply inside-out: the innermost is the espresso, and each outer layer appends its own suffix after delegating. Cost is 200 + 50 + 10 + 50 = 310; the second milk is a separate wrapper, not a no-op. Reassigning d after std::move(d) is safe because the moved-from pointer is overwritten."},{id:"sb-pred-de-order",kind:"predict",topic:"L4.decorator",level:3,prompt:"Wrapper order matters. What does this program print?",code:`#include <iostream>
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
`,output:"[abc] [ab",options:["[abc] [ab","[abc] [abc]","[abcd] [ab","[ab [abc]"],answer:[0],explain:"a cuts first, then brackets: 'abcd' becomes 'abc', then '[abc]'. b brackets first: '[abcd]', and then Cut3 keeps only the first three characters, '[ab', so the closing bracket is lost. Same two decorators, different order, different result: that is why a decorator stack needs a documented order."},{id:"sb-mcq-de-vs-inherit",kind:"mcq",topic:"L4.decorator",level:2,prompt:"Why prefer Decorator over subclassing for optional features such as logging, caching and retry on a client?",options:["Features are added or removed per object at run time and in any order, and each lives in one small class, instead of a subclass for every combination","Decorators are always faster than virtual calls","Subclassing is not allowed for classes with virtual destructors","It lets the compiler inline every layer"],answer:[0],explain:"Inheritance fixes the combination at compile time and multiplies classes. The cost of Decorator is real too: many tiny objects, a deeper call stack, and identity confusion (the decorated object is not the original). Say both sides."},{id:"sb-smell-de-subclass",kind:"smell",topic:"L4.decorator",level:2,prompt:"Name the smell and the principle it strains.",code:`class Stream { /* read/write */ };
class BufferedStream            : public Stream { /* ... */ };
class EncryptedStream           : public Stream { /* ... */ };
class BufferedEncryptedStream   : public Stream { /* ... */ };
class CompressedStream          : public Stream { /* ... */ };
class BufferedCompressedStream  : public Stream { /* ... */ };
class EncryptedCompressedStream : public Stream { /* ... */ };
// ...and the buffered + encrypted + compressed one`,options:["Inheritance used to combine optional features, so classes multiply per combination; Open/Closed, fixed by Decorator","Interface bloat on a single class; Interface Segregation","Constructor with many parameters; Single Responsibility","Hidden global state; Dependency Inversion"],answer:[0],explain:"n optional features need up to 2^n subclasses. Three small wrappers (Buffered, Encrypted, Compressed) over a Stream interface cover all eight combinations and a fourth feature costs one class."},{id:"sb-mcq-fa-intent",kind:"mcq",topic:"L4.facade",level:1,prompt:"What is a Facade?",options:["A simple class that offers a small, task-oriented interface to a larger subsystem and coordinates its parts","A copy of an object created through a base pointer","A stand-in with the same interface that controls access to another object","A tree node that can contain other nodes"],answer:[0],explain:"A Facade hides complexity from the caller without forbidding access to the subsystem, so advanced users can still go underneath. Proxy keeps the same interface and Composite builds trees."},{id:"sb-pat-fa-checkout",kind:"pattern",topic:"L4.facade",level:1,prompt:"Placing an order means calling Inventory, Payment, Shipping and Email in a precise sequence. Callers keep getting the order wrong. Which Patternling fits?",options:["Facadeon (Facade)","Axolink (Adapter)","Flytile (Flyweight)","Shellcrab (Decorator)"],answer:[0],explain:"A single placeOrder() that owns the sequence is a Facade. It does not change any subsystem interface (not Adapter) and does not wrap one object to add behaviour (not Decorator)."},{id:"sb-pred-fa-home",kind:"predict",topic:"L4.facade",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"L20SP L100",options:["L20SP L100","PSL20 L100","L20 S P L100","L20SP L20"],answer:[0],explain:"The facade fixes the order: dim, then lower, then on. The caller gets one start() call and cannot get the sequence wrong. In real code the facade would call the subsystem and return a result or throw, not build strings; the strings here make the order visible."},{id:"sb-mcq-fa-godclass",kind:"mcq",topic:"L4.facade",level:3,prompt:"A reviewer says your OrderFacade has grown to 40 methods and contains pricing rules. What is the right response?",options:["A facade should only orchestrate: move the business rules into domain classes, and split the facade by use case if it is still large","Add more methods; facades are meant to be big","Make it a Singleton so there is only one","Replace it with inheritance from every subsystem"],answer:[0],explain:"A Facade that accumulates logic becomes a god class that violates Single Responsibility and is hard to test. Keep it thin, delegate rules to the subsystem, and prefer several focused facades (checkout, returns) over one for everything."},{id:"sb-mcq-fa-vs-adapter",kind:"mcq",topic:"L4.facade",level:2,prompt:"Facade or Adapter: you are wrapping one legacy class to match an interface your code already defines. Which is it?",options:["Adapter, because the target interface already exists and you are converting to it; a Facade defines a new simplified interface over several classes","Facade, because it wraps something","Both are identical in intent","Neither; use a Singleton"],answer:[0],explain:"Direction matters. Adapter conforms to an interface that is given. Facade invents a new, simpler one, usually over several collaborators. Both are wrappers, but the intent differs."},{id:"sb-mcq-fl-intent",kind:"mcq",topic:"L4.flyweight",level:1,prompt:"What does the Flyweight pattern save, and how?",options:["Memory: it shares the intrinsic (identical, immutable) part of many objects and passes the extrinsic (per-use) part in from outside","CPU time: it caches the result of every function call","Disk space: it compresses files on write","Network calls: it batches requests"],answer:[0],explain:"A million tree objects can share a handful of TreeType objects (mesh, texture) while each stores only position. The shared part must be immutable, or sharing becomes a bug."},{id:"sb-pat-fl-glyphs",kind:"pattern",topic:"L4.flyweight",level:2,prompt:"A text editor stores one object per character, 5 million of them. Font, size and glyph shape repeat constantly, and only the position differs. Which Patternling fits?",options:["Flytile (Flyweight)","Clonewisp (Prototype)","Fractree (Composite)","Proxifox (Proxy)"],answer:[0],explain:"Share the repeated glyph/style data and keep only position per character: Flyweight. Prototype is about copying, which would duplicate that data instead."},{id:"sb-pred-fl-pool",kind:"predict",topic:"L4.flyweight",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"2 1 0",options:["2 1 0","3 0 0","2 0 0","3 1 0"],answer:[0],explain:"Three trees, two species, so the factory holds two TreeType objects. a and c point at the very same oak (pointer equality is 1); a and b differ. Position (x, y) is the extrinsic state kept per tree. The shared type is const because mutation would leak across all users."},{id:"sb-mcq-fl-when",kind:"mcq",topic:"L4.flyweight",level:3,prompt:"A teammate wants to apply Flyweight to a few hundred `Customer` objects that each have a unique name and email. What do you say?",options:["Not worth it: there is little repeated intrinsic state and the factory, lookup and indirection add cost and complexity for a negligible saving","Yes, Flyweight always reduces memory","Yes, but make the shared objects mutable","Use Singleton instead for each customer"],answer:[0],explain:"Flyweight pays off with huge counts and a high ratio of shared to unique state. Measure first. With unique data per object there is nothing to share, and the indirection costs both clarity and cache locality."},{id:"sb-smell-fl-dup",kind:"smell",topic:"L4.flyweight",level:2,prompt:"Name the smell and the principle it strains (look at memory, not only correctness).",code:`struct Particle {
  float x, y, vx, vy;
  std::string spriteName;     // "spark" for 1M particles
  std::vector<uint8_t> image; // 4 KB, identical for every "spark"
};
std::vector<Particle> particles(1'000'000);`,options:["Identical heavy data is copied into every object (about 4 GB here); share the immutable part with Flyweight","A virtual call in a hot loop; Liskov Substitution","A method that does two jobs; Single Responsibility","A missing virtual destructor; Open/Closed"],answer:[0],explain:"A million copies of the same 4 KB image cost about 4 GB. Keep one shared immutable Sprite and let each Particle hold a pointer or id plus its own position and velocity. This is a resource problem as much as a design one."},{id:"sb-mcq-px-intent",kind:"mcq",topic:"L4.proxy",level:1,prompt:"What is a Proxy?",options:["A stand-in with the same interface as the real object that controls access to it (lazy creation, permission checks, caching, remote calls)","A wrapper that always changes the interface of the object","A way to build objects step by step","A tree of objects handled as one"],answer:[0],explain:"Because it keeps the interface, the client cannot tell the difference. The proxy decides whether, when and how to forward the call. Adapter changes the interface; Decorator adds behaviour but is not about controlling access."},{id:"sb-pat-px-lazy",kind:"pattern",topic:"L4.proxy",level:1,prompt:"A gallery must show 500 thumbnails but only load a full image when one is opened. Callers should use one Image interface throughout. Which Patternling fits?",options:["Proxifox (Proxy)","Flytile (Flyweight)","Facadeon (Facade)","Bridgeback (Bridge)"],answer:[0],explain:"A virtual proxy implements Image, holds the filename, and loads the real image on first use. Flyweight shares identical data; this is about deferring creation."},{id:"sb-pred-px-lazy",kind:"predict",topic:"L4.proxy",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"created\nload a.png\nshow a.png\nshow a.png",options:["created\nload a.png\nshow a.png\nshow a.png","load a.png\ncreated\nshow a.png\nshow a.png","created\nload a.png\nshow a.png\nload a.png\nshow a.png","load a.png\ncreated\nshow a.png\nload a.png\nshow a.png"],answer:[0],explain:"Construction of the proxy is cheap, so 'created' prints first. The first show() builds the RealImage (which prints 'load') and later calls reuse it. mutable lets a const method fill the cache; it is the honest use of mutable, but note it makes this proxy unsafe to share between threads without a lock or std::call_once."},{id:"sb-pred-px-guard",kind:"predict",topic:"L4.proxy",level:3,prompt:"What does this program print?",code:`#include <iostream>
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
`,output:"-1 70 -1 40",options:["-1 70 -1 40","-1 70 10 -20","90 70 -1 40","-1 70 -1 70"],answer:[0],explain:"The protection proxy rejects the non-admin (-1) and over-limit requests (90 > 80, -1), and the rejected call never reaches the real vault. The admin's two successful withdrawals take the balance 100 to 70 to 40. Using the order of evaluation inside one cout expression is unspecified before C++17; in C++17 the << chain is sequenced left to right, which this program relies on."},{id:"sb-mcq-px-vs-deco",kind:"mcq",topic:"L4.proxy",level:3,prompt:"Proxy and Decorator both implement the same interface and hold the real object. What most reliably separates them?",options:["Intent and lifecycle: a proxy controls access to (and often creates or locates) its subject, while a decorator is composed by the client to add responsibilities and can be stacked freely","A proxy never forwards calls","A decorator must be a singleton","A proxy can only be written in Java"],answer:[0],explain:"The structure is the same, so name the purpose: lazy loading, access control, caching, remote stub (Proxy) versus layering behaviour such as compression or logging (Decorator). A caching proxy sits on the boundary; decorators are the client's choice."},{id:"sb-smell-px-cache",kind:"smell",topic:"L4.proxy",level:3,prompt:"Name the smell and the principle it strains.",code:`class WeatherClient {
 public:
  Forecast get(const City& c) {
    if (auto it = cache_.find(c.id); it != cache_.end()) return it->second;
    Forecast f = httpGet("https://api.example/weather/" + c.id);
    cache_[c.id] = f;
    return f;
  }
 private:
  std::unordered_map<std::string, Forecast> cache_;
};`,options:["Caching and remote access are tangled in one class; Single Responsibility (a caching Proxy over a plain client would separate them)","A fat interface; Interface Segregation","A subclass breaking its base contract; Liskov Substitution","An unnecessary abstract class; Open/Closed"],answer:[0],explain:"The client both talks to the network and manages cache policy (expiry is missing too). A CachingWeather proxy implementing the same Weather interface keeps each concern testable, and the cache can be added, removed or swapped without touching the HTTP code."},{id:"sb-mcq-px-kinds",kind:"mcq",topic:"L4.proxy",level:2,prompt:"Which of these is a protection proxy rather than a virtual, caching or remote proxy?",options:["A wrapper that checks the caller's role before forwarding a delete request","A wrapper that loads a large file on first access","A local stub that serialises calls and sends them to a server","A wrapper that remembers the result of an expensive call"],answer:[0],explain:"Access control is the protection proxy's job. The others are, in order, a virtual proxy, a remote proxy and a caching proxy. Naming the kind in an interview shows you are choosing the pattern, not reciting it."},{id:"sb-mcq-x-wrapper-pick",kind:"mcq",topic:"L4.compare",level:3,prompt:"You wrap an object with the same interface and forward calls. Which question best chooses between Decorator, Proxy and Adapter?",options:["Do I change the interface (Adapter), add behaviour the caller opts into (Decorator), or control access to the subject (Proxy)?","Which one has the fewest lines of code?","Which one is mentioned first in the GoF book?","Whether the class has a virtual destructor"],answer:[0],explain:"All three are wrappers, which is why interviews love this question. Answer with the axis that distinguishes them: interface change, added responsibility or access control. Then give one concrete example of each."},{id:"sb-mcq-x-over-engineer",kind:"mcq",topic:"L4.compare",level:3,prompt:"In a 45-minute machine-coding round you need to add logging to one service call. What is the pragmatic choice?",options:["Add the log line directly or one small decorator if several services need it; do not build a framework of wrappers for one call site","Create a Decorator, Proxy and Facade hierarchy to show you know patterns","Rewrite the service as a Composite","Skip logging; interviewers never care"],answer:[0],explain:"Patterns exist to remove a real pain. One call site has no pain. Strong candidates say what they would extract once a second use appears, and keep the first version obvious. Over-application is a common SDE II to Senior differentiator in feedback."},{id:"sb-pat-x-ui-tree",kind:"pattern",topic:"L4.compare",level:2,prompt:"A UI toolkit lets a Panel contain Buttons and other Panels, and calling render() on the root draws everything. Which Patternling fits?",options:["Fractree (Composite)","Facadeon (Facade)","Bridgeback (Bridge)","Flytile (Flyweight)"],answer:[0],explain:"A panel holds children of the same Widget interface and renders them recursively: Composite. If many buttons shared one icon bitmap you might add Flyweight on top, but the container structure is Composite."}];e.s(["f",0,o],18712);let s=[{id:"bt-mcq-st-intent",kind:"mcq",topic:"L5.strategy",level:1,prompt:"What is the intent of the Strategy pattern?",options:["Put each interchangeable algorithm behind one interface so the caller can pick or swap it without changing its own code","Let an object change its behaviour automatically as its internal state changes","Define the skeleton of an algorithm in a base class and let subclasses fill in steps","Notify many dependants when one object changes"],answer:[0],explain:"Strategy lets the client choose the algorithm, usually by injecting it. State looks similar but the object switches strategies itself; Template Method fixes the skeleton by inheritance; Observer is about notification."},{id:"bt-pat-st-shipping",kind:"pattern",topic:"L5.strategy",level:1,prompt:"A checkout computes shipping as flat-rate, by weight, or by distance, and marketing keeps adding rules. The caller picks the rule per order. Which Patternling fits?",options:["Swapaw (Strategy)","Chamelyn (State)","Stencilmoth (Template Method)","Watchowl (Observer)"],answer:[0],explain:"Interchangeable algorithms chosen from outside: Strategy. If the order itself moved through phases and the rule changed because of that, it would be State. A Template Method would hide the choice in a subclass hierarchy."},{id:"bt-pred-st-sort",kind:"predict",topic:"L5.strategy",level:2,prompt:"What does this program print?",code:`#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Ordering {
  virtual ~Ordering() = default;
  virtual bool before(const std::string& a, const std::string& b) const = 0;
};
struct ByLength : Ordering {
  bool before(const std::string& a, const std::string& b) const override { return a.size() < b.size(); }
};
struct Alphabetical : Ordering {
  bool before(const std::string& a, const std::string& b) const override { return a < b; }
};

void show(std::vector<std::string> v, const Ordering& o) {
  std::stable_sort(v.begin(), v.end(), [&](const auto& a, const auto& b) { return o.before(a, b); });
  for (size_t i = 0; i < v.size(); ++i) std::cout << (i ? " " : "") << v[i];
  std::cout << "\\n";
}

int main() {
  std::vector<std::string> words = {"pear", "fig", "apple", "kiwi"};
  show(words, ByLength());
  show(words, Alphabetical());
}
`,output:"fig pear kiwi apple\napple fig kiwi pear",options:["fig pear kiwi apple\napple fig kiwi pear","fig kiwi pear apple\napple fig kiwi pear","pear fig apple kiwi\napple fig kiwi pear","fig pear kiwi apple\npear kiwi fig apple"],answer:[0],explain:"The caller owns the same data and swaps only the Ordering. stable_sort keeps equal-length words in input order, so pear stays before kiwi. Alphabetical gives apple fig kiwi pear. The function never mentions a concrete ordering, which is the point."},{id:"bt-mcq-st-cpp",kind:"mcq",topic:"L5.strategy",level:2,prompt:"In C++ you can express a Strategy as a virtual interface, a std::function, or a template parameter. Which statement is most accurate?",options:["A template parameter is resolved at compile time and can inline, but the choice cannot change at runtime; a virtual interface or std::function allows runtime swapping at a small call cost","A virtual interface is always the fastest because the vtable is cached","std::function cannot hold a lambda that captures state","Only a virtual interface counts as the Strategy pattern; the others are different patterns"],answer:[0],explain:"The pattern is the idea, not the syntax. Pick a template when the policy is fixed per type (as in std::sort with a comparator), std::function for a single callable, and a virtual interface when the strategy has several operations or carries its own state and lifetime."},{id:"bt-smell-st-switch",kind:"smell",topic:"L5.strategy",level:2,prompt:"Name the smell and the principle it strains.",code:`enum class Plan { Free, Pro, Team };

double price(Plan p, int seats) {
  switch (p) {
    case Plan::Free: return 0.0;
    case Plan::Pro:  return 12.0 * seats;
    case Plan::Team: return seats > 10 ? 9.0 * seats : 11.0 * seats;
  }
  return 0.0;
}`,options:["A switch on a type tag that grows with every new plan; Open/Closed (a Strategy per plan would let you add one without editing this function)","A subclass breaks its base contract; Liskov Substitution","A wide interface forces unused methods; Interface Segregation","A class reaches through other objects; Law of Demeter"],answer:[0],explain:"Every new plan edits this function and every other function that switches on Plan. Restraint matters: with three stable plans a switch is fine. The smell appears when variants keep arriving, which is what a Change Storm will test."},{id:"bt-mcq-ob-intent",kind:"mcq",topic:"L5.observer",level:1,prompt:"What does the Observer pattern provide?",options:["A one-to-many dependency: when the subject changes, every registered observer is notified, and the subject does not need to know their concrete types","A way to undo the last change to an object","A single access point to a complicated subsystem","A way to walk a collection without exposing how it is stored"],answer:[0],explain:"Observer decouples the thing that changes from the things that care. Undo is Command or Memento, the single entry point is Facade, walking a collection is Iterator."},{id:"bt-pat-ob-dashboard",kind:"pattern",topic:"L5.observer",level:1,prompt:"A stock ticker must refresh a chart, a table and an alert badge whenever the price changes, and new widgets get added all the time without touching the ticker. Which Patternling fits?",options:["Watchowl (Observer)","Swapaw (Strategy)","Stepede (Iterator)","Scrollhound (Command)"],answer:[0],explain:"A publisher with an open set of subscribers is Observer. The ticker only knows the observer interface."},{id:"bt-pred-ob-weak",kind:"predict",topic:"L5.observer",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct Observer {
  virtual ~Observer() = default;
  virtual void onEvent(int value) = 0;
};

class Printer : public Observer {
 public:
  explicit Printer(std::string name) : name_(std::move(name)) {}
  void onEvent(int value) override { std::cout << name_ << ':' << value << "\\n"; }

 private:
  std::string name_;
};

class Subject {
 public:
  void attach(const std::shared_ptr<Observer>& o) { observers_.push_back(o); }
  void notify(int value) {
    for (const auto& w : observers_) {
      if (auto o = w.lock()) o->onEvent(value);
    }
  }

 private:
  std::vector<std::weak_ptr<Observer>> observers_;
};

int main() {
  Subject s;
  auto a = std::make_shared<Printer>("A");
  auto c = std::make_shared<Printer>("C");
  {
    auto b = std::make_shared<Printer>("B");
    s.attach(a);
    s.attach(b);
    s.attach(c);
  }
  s.notify(7);
}
`,output:"A:7\nC:7",options:["A:7\nC:7","A:7\nB:7\nC:7","C:7","undefined behaviour"],answer:[0],explain:"The subject holds weak_ptr, so it does not keep B alive. B dies at the end of its block, lock() returns empty, and the subject skips it safely. With raw pointers this would be a dangling call. The expired slot still sits in the vector; a real subject would also prune it."},{id:"bt-mcq-ob-reentrancy",kind:"mcq",topic:"L5.observer",level:3,prompt:"During notify(), one observer calls subject.detach(self) on the vector being iterated. What is the robust design?",options:["Iterate over a copy of the observer list (or mark removals and apply them after the loop), so callbacks may attach or detach safely","Make every observer lock the subject's mutex during the callback","Forbid detach and rely on destructors","Use a larger vector so reallocation never happens"],answer:[0],explain:"Erasing from a container while a range-for is walking it invalidates iterators. Snapshotting or deferring removal is the standard fix. A mutex does not help single-threaded re-entrancy and invites deadlock in the threaded case."},{id:"bt-smell-ob-lapsed",kind:"smell",topic:"L5.observer",level:3,prompt:"Name the smell and the principle it strains.",code:`class Subject {
 public:
  void attach(Observer* o) { observers_.push_back(o); }
  void notify() {
    for (Observer* o : observers_) o->onChange();   // observers may already be destroyed
  }
 private:
  std::vector<Observer*> observers_;
};`,options:["The subject keeps raw pointers with no ownership or lifetime rule, so a destroyed observer is called (a dangling pointer); the contract needs weak_ptr or explicit detach in the observer's destructor (RAII)","The subject has too many responsibilities; Single Responsibility","The subject depends on a concrete observer class; Dependency Inversion","The notify loop should be a switch; Open/Closed"],answer:[0],explain:"The classic Observer bug is the lapsed listener: the pointer outlives the object. Fix it with weak_ptr, or an RAII subscription handle that detaches on destruction."},{id:"bt-mcq-cm-intent",kind:"mcq",topic:"L5.command",level:1,prompt:"What does the Command pattern do?",options:["Turns a request into an object, so it can be queued, logged, passed around and (if it stores enough information) undone","Lets many objects share one copy of common data","Chooses a hashing algorithm at runtime","Defines a family of related products that must match"],answer:[0],explain:"A command packages the receiver and the arguments of an action. That is what makes undo/redo, macros, job queues and audit logs straightforward."},{id:"bt-pat-cm-editor",kind:"pattern",topic:"L5.command",level:1,prompt:"A text editor needs undo and redo for typing, deleting and formatting, and macros that replay a recorded sequence. Which Patternling fits?",options:["Scrollhound (Command)","Watchowl (Observer)","Chamelyn (State)","Stepede (Iterator)"],answer:[0],explain:"Each edit becomes an object with execute() and undo(); a history stack of them gives undo and redo. Memento could snapshot the whole document instead, a trade-off between memory and simplicity."},{id:"bt-pred-cm-undo",kind:"predict",topic:"L5.command",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <memory>
#include <vector>

struct Counter { int value = 0; };

struct Command {
  virtual ~Command() = default;
  virtual void execute() = 0;
  virtual void undo() = 0;
};

class Add : public Command {
 public:
  Add(Counter& c, int n) : c_(c), n_(n) {}
  void execute() override { c_.value += n_; }
  void undo() override { c_.value -= n_; }

 private:
  Counter& c_;
  int n_;
};

class History {
 public:
  void run(std::unique_ptr<Command> cmd) {
    cmd->execute();
    done_.push_back(std::move(cmd));
  }
  void undo() {
    if (done_.empty()) return;
    done_.back()->undo();
    done_.pop_back();
  }

 private:
  std::vector<std::unique_ptr<Command>> done_;
};

int main() {
  Counter c;
  History h;
  h.run(std::make_unique<Add>(c, 5));
  h.run(std::make_unique<Add>(c, 3));
  h.undo();
  h.run(std::make_unique<Add>(c, 10));
  h.undo();
  h.undo();
  h.undo();
  std::cout << c.value << "\\n";
}
`,output:"0",options:["0","5","8","-8"],answer:[0],explain:"The history is a stack. After the sequence only Add(5) remains, then the extra undos remove it, and the final undo on an empty stack does nothing. The guard in undo() matters: without it the third undo would be undefined behaviour. Note that redo needs a second stack that is cleared whenever a new command runs."},{id:"bt-mcq-cm-undo-state",kind:"mcq",topic:"L5.command",level:3,prompt:"Undoing a command 'delete line 4' only works if the command stored something at execute time. What?",options:["The removed text and its position, captured before the deletion, so undo() can re-insert it exactly","Nothing: undo can recompute the line from the current document","A pointer to the Document, which is enough","Only the command's name for the history list"],answer:[0],explain:"Undo needs the information that the action destroyed. Capture it inside execute(), not in the constructor, because the document may have changed between creation and execution."},{id:"bt-smell-cm-callbacks",kind:"smell",topic:"L5.command",level:2,prompt:"Name the smell and the principle it strains.",code:`void onMenuClick(int itemId) {
  if (itemId == 1) doc.save();
  else if (itemId == 2) doc.print();
  else if (itemId == 3) doc.exportPdf();
  // every new menu item edits this function, and there is no way to queue, log or undo one
}`,options:["A conditional chain that mixes the invoker with every action; Open/Closed (each action should be a Command the menu just runs)","A getter exposes internal data; Encapsulation","An object is created inside the class that uses it; Dependency Inversion","A base class has a method no subclass can use; Interface Segregation"],answer:[0],explain:"With a command per menu item the menu only stores and runs them. Adding an item, recording a macro or undoing becomes possible without editing the menu code."},{id:"bt-mcq-sa-intent",kind:"mcq",topic:"L5.state",level:1,prompt:"What is the intent of the State pattern?",options:["Let an object alter its behaviour when its internal state changes, by delegating to a separate object for each state instead of branching on a flag","Let the client choose an algorithm from outside","Record a snapshot of an object so it can be restored","Create objects without naming their concrete classes"],answer:[0],explain:"State moves the 'what do I do now?' branching into one class per state. Strategy is chosen by the client; in State the transitions usually come from inside."},{id:"bt-pat-sa-vending",kind:"pattern",topic:"L5.state",level:1,prompt:"A vending machine reacts to 'insert coin', 'select item' and 'refund' differently depending on whether it is idle, has money, or is dispensing. Which Patternling fits?",options:["Chamelyn (State)","Swapaw (Strategy)","Stencilmoth (Template Method)","Scrollhound (Command)"],answer:[0],explain:"The same events mean different things in different phases and each phase decides the next one: State. A pile of if (hasMoney && !dispensing) flags is the smell it replaces."},{id:"bt-pred-sa-turnstile",kind:"predict",topic:"L5.state",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <memory>

class Turnstile;

struct State {
  virtual ~State() = default;
  virtual const char* coin(Turnstile& t) = 0;
  virtual const char* push(Turnstile& t) = 0;
};

class Turnstile {
 public:
  Turnstile();
  const char* coin() { return state_->coin(*this); }
  const char* push() { return state_->push(*this); }
  void lock() { state_ = &locked_; }
  void unlock() { state_ = &open_; }

 private:
  struct Locked : State {
    const char* coin(Turnstile& t) override { t.unlock(); return "unlocked"; }
    const char* push(Turnstile&) override { return "blocked"; }
  };
  struct Open : State {
    const char* coin(Turnstile&) override { return "thanks"; }
    const char* push(Turnstile& t) override { t.lock(); return "passed"; }
  };
  Locked locked_;
  Open open_;
  State* state_;
};

Turnstile::Turnstile() : state_(&locked_) {}

int main() {
  Turnstile t;
  std::cout << t.push() << ' ' << t.coin() << ' ' << t.coin() << ' ' << t.push() << ' ' << t.push() << "\\n";
}
`,output:"blocked unlocked thanks passed blocked",options:["blocked unlocked thanks passed blocked","blocked unlocked unlocked passed blocked","passed unlocked thanks passed blocked","blocked unlocked thanks blocked blocked"],answer:[0],explain:"Locked: push is blocked, coin unlocks. Open: a second coin only says thanks, push passes and relocks. The next push is blocked again. Each rule lives in one class, and the transitions are explicit calls to lock() and unlock(). (The unspecified evaluation order of << chained calls is fine here since C++17 sequences them left to right.)"},{id:"bt-mcq-sa-vs-strategy",kind:"mcq",topic:"L5.state",level:2,prompt:"State and Strategy have nearly identical class diagrams. What really separates them?",options:["Intent and who changes the object: in State the states know about each other and drive transitions; in Strategy the client picks an algorithm and the strategies do not know each other","State uses inheritance and Strategy never does","Strategy objects must be stateless and State objects must be singletons","There is no difference; they are two names for one pattern"],answer:[0],explain:"Same shape, different story. If the object moves itself through phases, think State. If a caller selects how something is done, think Strategy. Interviewers like this question because the diagrams look the same."},{id:"bt-smell-sa-flags",kind:"smell",topic:"L5.state",level:3,prompt:"Name the smell and the principle it strains.",code:`class Order {
 public:
  void cancel() {
    if (paid_ && !shipped_ && !delivered_) refund();
    else if (!paid_ && !shipped_) discardCart();
    else if (shipped_ && !delivered_) startReturn();
    // delivered_: silently ignored
  }
 private:
  bool paid_ = false, shipped_ = false, delivered_ = false;
};`,options:["Boolean flags encode an implicit state machine, so every method repeats the combinations and illegal combinations are representable; replace with explicit states (Open/Closed, and make illegal states unrepresentable)","A constructor does real work; Single Responsibility","A mutable global is shared; hidden dependency","A deep inheritance tree; composition over inheritance"],answer:[0],explain:"Three booleans allow eight combinations but only four are legal. An explicit State (or an enum plus a transition table for small machines) names the legal ones and makes each method one line per state."},{id:"bt-mcq-tm-intent",kind:"mcq",topic:"L5.template-method",level:1,prompt:"What is the Template Method pattern?",options:["A base class fixes the order of an algorithm's steps in a non-virtual method and lets subclasses override selected steps","A class template parameterised on a type","A way to copy an object without knowing its class","An object that records every call made to another object"],answer:[0],explain:"The word 'template' here has nothing to do with C++ templates. The base owns the invariant sequence (the 'Hollywood principle': don't call us, we'll call you) and the subclasses supply the variable steps."},{id:"bt-pat-tm-report",kind:"pattern",topic:"L5.template-method",level:1,prompt:"Every report exporter must open a file, write a header, write rows, write a footer, then close the file in that exact order. Only the row format differs (CSV vs JSON). Which Patternling fits?",options:["Stencilmoth (Template Method)","Chamelyn (State)","Watchowl (Observer)","Swapaw (Strategy)"],answer:[0],explain:"A fixed skeleton with a few varying steps: Template Method. If the whole algorithm were swappable at runtime, or you wanted to avoid inheritance, Strategy would be the alternative."},{id:"bt-pred-tm-order",kind:"predict",topic:"L5.template-method",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <memory>

class Beverage {
 public:
  virtual ~Beverage() = default;
  void prepare() const {
    boil();
    brew();
    pour();
    if (wantsCondiments()) addCondiments();
  }

 protected:
  virtual void brew() const = 0;
  virtual void addCondiments() const = 0;
  virtual bool wantsCondiments() const { return true; }

 private:
  void boil() const { std::cout << "boil "; }
  void pour() const { std::cout << "pour "; }
};

class Tea : public Beverage {
 protected:
  void brew() const override { std::cout << "steep "; }
  void addCondiments() const override { std::cout << "lemon "; }
};

class Espresso : public Beverage {
 protected:
  void brew() const override { std::cout << "press "; }
  void addCondiments() const override { std::cout << "sugar "; }
  bool wantsCondiments() const override { return false; }
};

int main() {
  std::unique_ptr<Beverage> a = std::make_unique<Tea>();
  std::unique_ptr<Beverage> b = std::make_unique<Espresso>();
  a->prepare();
  std::cout << "| ";
  b->prepare();
  std::cout << "\\n";
}
`,output:"boil steep pour lemon | boil press pour",options:["boil steep pour lemon | boil press pour","steep boil pour lemon | press boil pour","boil steep pour lemon | boil press pour sugar","boil steep lemon pour | boil press sugar pour"],answer:[0],explain:"prepare() is public and non-virtual, so no subclass can reorder the steps. Espresso overrides the hook wantsCondiments() to skip the last step. This is the NVI (non-virtual interface) idiom: the public interface is fixed, the customisation points are protected virtuals."},{id:"bt-mcq-tm-vs-strategy",kind:"mcq",topic:"L5.template-method",level:3,prompt:"When would you prefer Strategy over Template Method?",options:["When the variation should be chosen or swapped at runtime, combined freely, or tested without a subclass; inheritance fixes the choice at compile time and couples you to the base class","Never; Template Method is strictly better because it is simpler","Only when the language lacks virtual functions","Only when there are exactly two variants"],answer:[0],explain:"Template Method uses inheritance, a heavy and static tool. Prefer composition (Strategy) when behaviours need to be mixed, swapped or injected. Template Method still wins when the sequence is a real invariant and the variation points are few and tied together."},{id:"bt-smell-tm-copy",kind:"smell",topic:"L5.template-method",level:2,prompt:"Name the smell and the principle it strains.",code:`void CsvExporter::run() { open(); writeCsvHeader(); for (auto& r : rows) writeCsvRow(r); close(); }
void JsonExporter::run() { open(); writeJsonHeader(); for (auto& r : rows) writeJsonRow(r); close(); }
void XmlExporter::run() { open(); writeXmlHeader(); for (auto& r : rows) writeXmlRow(r); close(); }`,options:["The same skeleton is copied into each class, so a fix to the sequence must be made three times; DRY (hoist the sequence into a Template Method)","A class returns a different type than its base promises; Liskov Substitution","A class exposes too much; Interface Segregation","A constructor is private; Singleton"],answer:[0],explain:"Duplicated control flow is the signal. Move open/header/rows/footer/close into one base method and leave only the format-specific steps virtual."},{id:"bt-mcq-it-intent",kind:"mcq",topic:"L5.iterator",level:1,prompt:"What does the Iterator pattern give you?",options:["A uniform way to visit the elements of a collection in sequence without exposing how it is stored","A way to notify observers when a collection changes","A copy of the collection that can be restored later","A way to share one element among many owners"],answer:[0],explain:"The client writes one loop that works for arrays, lists, trees and generated sequences. In C++ the standard library is built around this idea."},{id:"bt-pat-it-tree",kind:"pattern",topic:"L5.iterator",level:1,prompt:"You store employees in a tree but callers just want to write `for (const auto& e : org)` in sorted order. Which Patternling fits?",options:["Stepede (Iterator)","Swapaw (Strategy)","Chamelyn (State)","Watchowl (Observer)"],answer:[0],explain:"Hiding the traversal behind begin() and end() is Iterator. The caller never learns that there is a tree inside."},{id:"bt-pred-it-range",kind:"predict",topic:"L5.iterator",level:2,prompt:"What does this program print?",code:`#include <iostream>

class Countdown {
 public:
  explicit Countdown(int from) : from_(from) {}

  class Iterator {
   public:
    explicit Iterator(int v) : v_(v) {}
    int operator*() const { return v_; }
    Iterator& operator++() { v_ -= 2; return *this; }
    bool operator!=(const Iterator& o) const { return v_ > o.v_; }

   private:
    int v_;
  };

  Iterator begin() const { return Iterator(from_); }
  Iterator end() const { return Iterator(0); }

 private:
  int from_;
};

int main() {
  for (int x : Countdown(7)) std::cout << x << ' ';
  std::cout << "\\n";
}
`,output:"7 5 3 1",options:["7 5 3 1","7 5 3 1 -1","6 4 2","7 6 5 4 3 2 1"],answer:[0],explain:"Range-for needs begin(), end() and an iterator with operator*, prefix ++ and !=. Here != means 'still above the end value', so the walk stops once v_ reaches 0 or below; 7, 5, 3, 1 are printed and -1 is not. Overloading != with non-symmetric meaning is a trick for sentinels, but a proper end sentinel type is clearer."},{id:"bt-mcq-it-invalidation",kind:"mcq",topic:"L5.iterator",level:2,prompt:"A loop does `for (auto it = v.begin(); it != v.end(); ++it) { if (*it == 0) v.push_back(1); }` on a std::vector. What is wrong?",options:["push_back may reallocate and invalidate every iterator, so using `it` afterwards is undefined behaviour","Nothing; iterators always stay valid","It is fine only because vector is contiguous","The loop is just slow, but correct"],answer:[0],explain:"Iterator validity is part of each container's contract. Modify the structure only by index, collect changes and apply them after the loop, or choose a container with stable iterators (std::list)."},{id:"bt-smell-it-expose",kind:"smell",topic:"L5.iterator",level:2,prompt:"Name the smell and the principle it strains.",code:`class Playlist {
 public:
  std::vector<Song>& songs() { return songs_; }   // callers index and mutate it directly
 private:
  std::vector<Song> songs_;
};

// elsewhere
for (size_t i = 0; i < pl.songs().size(); ++i) play(pl.songs()[i]);`,options:["The internal container is exposed, so every caller depends on how songs are stored and can break the invariants; encapsulation (offer begin()/end() or a visit function instead)","A class has a virtual destructor but no virtual methods; unnecessary polymorphism","A function takes too many parameters; long parameter list","A switch on type; Open/Closed"],answer:[0],explain:"A mutable reference to the vector lets callers add, sort or erase behind the playlist's back, and switching to a list or tree later breaks them all. Const iteration over a narrow view preserves both freedom and invariants."},{id:"bt-mcq-cor-intent",kind:"mcq",topic:"L5.chain-of-responsibility",level:1,prompt:"What does Chain of Responsibility give you?",options:["A sender that does not know which handler will deal with a request; handlers are linked and each either handles it or passes it on","One object that knows every handler and routes each request to the right one","A way to undo the last request","A guarantee that every handler in the list processes every request"],answer:[0],explain:"The sender hands the request to the head of the chain and is decoupled from who answers. Option 2 describes a registry or Mediator. A request may also fall off the end unhandled, so decide what that means up front."},{id:"bt-pat-cor-support",kind:"pattern",topic:"L5.chain-of-responsibility",level:1,prompt:"A support ticket goes to a bot, then a tier-1 agent, then a specialist, each of which may resolve it or escalate. Which Patternling fits?",options:["Relayrat (Chain of Responsibility)","Hubhen (Mediator)","Swapaw (Strategy)","Snapsnail (Memento)"],answer:[0],explain:"A request travels a sequence of candidate handlers and stops at the first that takes it. A Strategy would pick one algorithm up front; a Mediator would route everything through a central object that knows all parties."},{id:"bt-pred-cor-limits",kind:"predict",topic:"L5.chain-of-responsibility",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <memory>

class Approver {
 public:
  explicit Approver(int limit) : limit_(limit) {}
  virtual ~Approver() = default;
  Approver* then(std::unique_ptr<Approver> next) {
    next_ = std::move(next);
    return next_.get();
  }
  void approve(int amount) const {
    if (amount <= limit_) {
      std::cout << name() << " approves " << amount << "\\n";
    } else if (next_) {
      next_->approve(amount);
    } else {
      std::cout << "nobody approves " << amount << "\\n";
    }
  }

 protected:
  virtual const char* name() const = 0;

 private:
  int limit_;
  std::unique_ptr<Approver> next_;
};

struct Lead : Approver {
  Lead() : Approver(100) {}
  const char* name() const override { return "lead"; }
};
struct Director : Approver {
  Director() : Approver(1000) {}
  const char* name() const override { return "director"; }
};

int main() {
  Lead head;
  head.then(std::make_unique<Director>());
  head.approve(80);
  head.approve(100);
  head.approve(101);
  head.approve(5000);
}
`,output:"lead approves 80\nlead approves 100\ndirector approves 101\nnobody approves 5000",options:["lead approves 80\nlead approves 100\ndirector approves 101\nnobody approves 5000","lead approves 80\ndirector approves 100\ndirector approves 101\nnobody approves 5000","lead approves 80\nlead approves 100\ndirector approves 101\ndirector approves 5000","lead approves 80\nlead approves 100\nlead approves 101\nnobody approves 5000"],answer:[0],explain:"The limit check is inclusive, so 100 stays with the lead and 101 moves on. 5000 passes the director's limit too and falls off the end; the chain prints a fallback instead of silently dropping it. Each link owns the next with unique_ptr, so the whole chain is freed from the head."},{id:"bt-mcq-cor-fallthrough",kind:"mcq",topic:"L5.chain-of-responsibility",level:2,prompt:"A middleware chain checks authentication, then rate limits, then logs. A handler forgets to call the next one. What happens?",options:["The request silently stops there; the downstream handlers never see it, so you need tests or a framework that makes forwarding explicit","The compiler reports an error","The next handler is called automatically","The request is retried from the head of the chain"],answer:[0],explain:"Forwarding is a convention, not a language rule. Guard it with a base class that does the forwarding and calls a virtual hook, or with tests that push a request through the whole chain and check the end result."},{id:"bt-smell-cor-ladder",kind:"smell",topic:"L5.chain-of-responsibility",level:2,prompt:"Name the smell and the principle it strains.",code:`void Logger::log(Level lv, const std::string& m) {
  if (lv >= Level::Error && !pagerDisabled_) pager_.send(m);
  if (lv >= Level::Warn) file_.write(m);
  if (lv >= Level::Info && consoleOn_) console_.print(m);
  // every new sink or rule edits this function
}`,options:["One function hard-codes every sink and rule, so adding a sink means editing it; Open/Closed (use a chain or a list of sinks that each decide)","Too many parameters","A virtual destructor is missing","A getter exposes internal state; encapsulation"],answer:[0],explain:"A list of sink objects, each with its own level filter, or a chain of handlers, lets a new sink be added without touching the logger. The cost is a little indirection, which is worth it once you have a third rule."},{id:"bt-mcq-med-intent",kind:"mcq",topic:"L5.mediator",level:1,prompt:"What problem does Mediator solve?",options:["Many peers talking directly to each other become tangled; a central object owns the interaction so peers only know the mediator","A request needs several handlers in order","A subject must notify an open-ended list of listeners","An object must be restored to an earlier state"],answer:[0],explain:"N peers with direct links need up to N(N-1)/2 connections. With a mediator each peer has one. Observer is one-to-many broadcast with no coordination logic; a mediator holds the coordination rules."},{id:"bt-pat-med-tower",kind:"pattern",topic:"L5.mediator",level:1,prompt:"In a chat room, users never reference each other. They send to the room, and the room decides who receives it, applies mutes and enforces rate limits. Which Patternling fits?",options:["Hubhen (Mediator)","Relayrat (Chain of Responsibility)","Watchowl (Observer)","Stepede (Iterator)"],answer:[0],explain:"The room holds the interaction rules and the participants only know the room. Observer would only broadcast; it would not own mute and rate-limit rules."},{id:"bt-pred-med-room",kind:"predict",topic:"L5.mediator",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <string>
#include <vector>

class Room;

class User {
 public:
  User(std::string name, Room& room);
  void say(const std::string& text);
  void hear(const std::string& from, const std::string& text) const {
    std::cout << name_ << " hears " << from << ": " << text << "\\n";
  }
  const std::string& name() const { return name_; }

 private:
  std::string name_;
  Room& room_;
};

class Room {
 public:
  void join(User* u) { users_.push_back(u); }
  void broadcast(const User& from, const std::string& text) const {
    for (const User* u : users_) {
      if (u != &from) u->hear(from.name(), text);
    }
  }

 private:
  std::vector<User*> users_;
};

User::User(std::string name, Room& room) : name_(std::move(name)), room_(room) { room_.join(this); }
void User::say(const std::string& text) { room_.broadcast(*this, text); }

int main() {
  Room room;
  User ann("ann", room), bob("bob", room), cy("cy", room);
  ann.say("hi");
  bob.say("yo");
}
`,output:"bob hears ann: hi\ncy hears ann: hi\nann hears bob: yo\ncy hears bob: yo",options:["bob hears ann: hi\ncy hears ann: hi\nann hears bob: yo\ncy hears bob: yo","ann hears ann: hi\nbob hears ann: hi\ncy hears ann: hi\nann hears bob: yo\nbob hears bob: yo\ncy hears bob: yo","bob hears ann: hi\ncy hears ann: hi","cy hears ann: hi\nbob hears ann: hi\ncy hears bob: yo\nann hears bob: yo"],answer:[0],explain:"Users only hold a Room reference; the Room iterates in join order and skips the sender. Users are built in the order ann, bob, cy, so that is the delivery order. Note the lifetime rule: the room keeps raw pointers, so users must outlive it or leave first."},{id:"bt-mcq-med-god",kind:"mcq",topic:"L5.mediator",level:3,prompt:"A mediator keeps growing: it now knows every widget's internals and has 2,000 lines. What is the usual cost of Mediator done carelessly?",options:["The mediator becomes a god object that centralises all the coupling instead of removing it","It makes peers slower to construct","It forces inheritance between peers","It cannot be unit tested"],answer:[0],explain:"Mediator moves coupling into one place. If that place knows too much it is a god class. Keep the mediator to coordination rules over narrow peer interfaces, and split it per workflow once it sprawls."},{id:"bt-smell-med-mesh",kind:"smell",topic:"L5.mediator",level:2,prompt:"Name the smell and the principle it strains.",code:`class Dropdown { Textbox* tb; Button* ok; Checkbox* cb;   /* ... */ };
class Textbox  { Dropdown* dd; Button* ok; Checkbox* cb;   /* ... */ };
class Button   { Dropdown* dd; Textbox* tb; Checkbox* cb;  /* ... */ };
class Checkbox { Dropdown* dd; Textbox* tb; Button* ok;    /* ... */ };`,options:["Every widget references every other, so none can be reused or tested alone; high coupling (introduce a mediator or dialog that owns the interaction)","A class has too many virtual functions","A switch on type; Open/Closed","Pointers where references would do; const-correctness"],answer:[0],explain:"Reuse one widget and you drag all the others with it. A form object that wires them together gives each widget a single dependency and makes the interaction rules visible in one place."},{id:"bt-mcq-mem-intent",kind:"mcq",topic:"L5.memento",level:1,prompt:"What is Memento for?",options:["Capturing an object's state in an opaque snapshot so it can be restored later, without exposing its internals","Notifying listeners when an object changes","Encapsulating a request as an object","Sharing common state between many objects"],answer:[0],explain:"The originator creates and consumes the snapshot; a caretaker only stores it. Command-based undo records the operation and its inverse instead; Memento records the state."},{id:"bt-pat-mem-editor",kind:"pattern",topic:"L5.memento",level:1,prompt:"A drawing canvas lets users press Ctrl+Z to return to an earlier arrangement, and the history holder must not read or edit the canvas's private fields. Which Patternling fits?",options:["Snapsnail (Memento)","Scrollhound (Command)","Chamelyn (State)","Hubhen (Mediator)"],answer:[0],explain:"A snapshot the caretaker cannot open: Memento. Command undo would also work but needs a reliable inverse per action; when the inverse is awkward, snapshots are the simpler tool."},{id:"bt-pred-mem-undo",kind:"predict",topic:"L5.memento",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <string>
#include <vector>

class Editor {
 public:
  class Snapshot {
   public:
    Snapshot(const Snapshot&) = default;

   private:
    friend class Editor;
    explicit Snapshot(std::string t) : text_(std::move(t)) {}
    std::string text_;
  };

  void type(const std::string& s) { text_ += s; }
  Snapshot save() const { return Snapshot(text_); }
  void restore(const Snapshot& s) { text_ = s.text_; }
  const std::string& text() const { return text_; }

 private:
  std::string text_;
};

int main() {
  Editor e;
  std::vector<Editor::Snapshot> history;
  e.type("ab");
  history.push_back(e.save());
  e.type("cd");
  history.push_back(e.save());
  e.type("ef");
  std::cout << e.text() << "\\n";
  e.restore(history.back());
  std::cout << e.text() << "\\n";
  history.pop_back();
  e.restore(history.back());
  std::cout << e.text() << "\\n";
}
`,output:"abcdef\nabcd\nab",options:["abcdef\nabcd\nab","abcdef\nabcdef\nab","abcdef\nabcd\nabcd","abcdef\nab\nabcd"],answer:[0],explain:"Snapshots are taken after 'ab' and after 'abcd'. The 'ef' typed later is not in either, so the first restore returns to 'abcd'. After popping the newest snapshot, the next restore returns to 'ab'. Snapshot's constructor is private, so only Editor can create or read one."},{id:"bt-mcq-mem-cost",kind:"mcq",topic:"L5.memento",level:3,prompt:"Undo history stores a full copy of a 50 MB document per keystroke. What is the main trade-off to weigh?",options:["Snapshots are simple and exact but cost memory and time per save; store diffs, share structure, or cap the history if the state is large","Snapshots are always cheaper than commands","Memento cannot be used with value types","There is no trade-off if the caretaker is const"],answer:[0],explain:"Full copies cost O(state size) per step. Persistent data structures, delta snapshots or command-based undo cut that cost, at the price of more machinery. Decide from state size and undo depth."},{id:"bt-smell-mem-friend",kind:"smell",topic:"L5.memento",level:2,prompt:"Name the smell and the principle it strains.",code:`struct UndoStack {
  std::vector<std::pair<Document*, std::string>> saved;
  void push(Document* d) { saved.push_back({d, d->body}); }     // reads the public field
  void pop()            { saved.back().first->body = saved.back().second; saved.pop_back(); }
};`,options:["The undo code reaches into the document's fields, so any change to Document's representation breaks it; encapsulation (let Document create and restore its own snapshot)","A destructor is not virtual","A function has too many parameters","A static member is mutable; global state"],answer:[0],explain:"With a Memento the document owns the format of its snapshot and the stack only stores opaque values. The same bug in the smell code also stores a raw Document*, which dangles if the document is destroyed."},{id:"bt-mcq-vis-intent",kind:"mcq",topic:"L5.visitor",level:1,prompt:"What does Visitor let you do?",options:["Add new operations over a stable set of element types without editing those types, by dispatching on both the visitor and the element (double dispatch)","Add new element types without touching any existing code","Hide an algorithm behind one interface","Let many objects share intrinsic state"],answer:[0],explain:"Visitor makes new operations cheap and new element types expensive: every visitor must be updated for a new element. This is the expression problem, and choosing between virtual functions and Visitor means choosing which axis grows."},{id:"bt-pat-vis-ast",kind:"pattern",topic:"L5.visitor",level:2,prompt:"A compiler has a fixed set of AST node types but keeps gaining passes: type check, pretty print, constant fold, code generation. Which Patternling fits?",options:["Visitrix (Visitor)","Glyphpup (Interpreter)","Swapaw (Strategy)","Stencilmoth (Template Method)"],answer:[0],explain:"Stable node types and a growing set of operations is the Visitor sweet spot. If node types changed often instead, plain virtual methods on the nodes would be cheaper."},{id:"bt-pred-vis-shapes",kind:"predict",topic:"L5.visitor",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <memory>
#include <vector>

struct Circle;
struct Square;

struct Visitor {
  virtual ~Visitor() = default;
  virtual void visit(const Circle&) = 0;
  virtual void visit(const Square&) = 0;
};

struct Shape {
  virtual ~Shape() = default;
  virtual void accept(Visitor& v) const = 0;
};
struct Circle : Shape {
  int r = 2;
  void accept(Visitor& v) const override { v.visit(*this); }
};
struct Square : Shape {
  int side = 3;
  void accept(Visitor& v) const override { v.visit(*this); }
};

struct AreaSum : Visitor {
  int total = 0;
  void visit(const Circle& c) override { total += 3 * c.r * c.r; }
  void visit(const Square& s) override { total += s.side * s.side; }
};
struct Namer : Visitor {
  void visit(const Circle&) override { std::cout << "circle "; }
  void visit(const Square&) override { std::cout << "square "; }
};

int main() {
  std::vector<std::unique_ptr<Shape>> shapes;
  shapes.push_back(std::make_unique<Circle>());
  shapes.push_back(std::make_unique<Square>());
  shapes.push_back(std::make_unique<Circle>());
  AreaSum area;
  Namer namer;
  for (const auto& s : shapes) { s->accept(area); s->accept(namer); }
  std::cout << "\\n" << area.total << "\\n";
}
`,output:"circle square circle \n33",options:["circle square circle \n33","circle square circle \n21","circle square circle \n24","square circle square \n33"],answer:[0],explain:"Each circle contributes 3*2*2 = 12 and the square 3*3 = 9, giving 12 + 9 + 12 = 33. Two operations were added without editing Circle or Square; the two accept() calls pick the concrete type (first dispatch) and the overload on the visitor (second). Add a Triangle and both visitors must change."},{id:"bt-mcq-vis-cost",kind:"mcq",topic:"L5.visitor",level:3,prompt:"Which change is hardest with a classic Visitor design?",options:["Adding a new element type, because every visitor interface and implementation needs a new overload","Adding a new operation over existing elements","Running two operations on the same tree","Unit testing one operation in isolation"],answer:[0],explain:"New element means touching the Visitor interface and all its implementations. In C++17, std::variant with std::visit offers the same shape with the compiler checking that every case is handled."},{id:"bt-smell-vis-dyncast",kind:"smell",topic:"L5.visitor",level:2,prompt:"Name the smell and the principle it strains.",code:`double area(const Shape& s) {
  if (auto* c = dynamic_cast<const Circle*>(&s)) return 3.14 * c->r * c->r;
  if (auto* q = dynamic_cast<const Square*>(&s)) return q->side * q->side;
  return 0;     // silently wrong for any new shape
}`,options:["A type ladder with a silent default: a new Shape compiles but returns 0; Open/Closed (use a virtual method, or Visitor/variant so the compiler flags the missing case)","Too many parameters","A constructor does heavy work","A global variable is shared across threads"],answer:[0],explain:"dynamic_cast ladders hide the missing case at runtime. Virtual dispatch moves the choice to the type; Visitor or std::variant with std::visit makes the compiler enforce completeness."},{id:"bt-mcq-int-intent",kind:"mcq",topic:"L5.interpreter",level:1,prompt:"When is the Interpreter pattern a reasonable choice?",options:["For a small, stable grammar, such as simple rules or expressions, where each grammar rule becomes a class that can evaluate itself","For any large programming language","To notify observers of changes","To avoid writing a parser by never parsing input"],answer:[0],explain:"Interpreter models a grammar as a tree of expression objects. It does not parse text itself, and it scales poorly to big grammars, where a proper parser generator and a compiled or bytecode form are better."},{id:"bt-pat-int-rules",kind:"pattern",topic:"L5.interpreter",level:2,prompt:"A pricing tool lets analysts write rules like `(qty > 10 AND tier == gold) OR coupon`. You build nodes for AND, OR and comparisons that each evaluate against a context. Which Patternling fits?",options:["Glyphpup (Interpreter)","Visitrix (Visitor)","Hubhen (Mediator)","Snapsnail (Memento)"],answer:[0],explain:"A small language whose sentences are trees of self-evaluating nodes is Interpreter, and Composite is the structure under it. A Visitor could add passes later, such as printing, without editing the nodes."},{id:"bt-pred-int-expr",kind:"predict",topic:"L5.interpreter",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <memory>
#include <utility>

struct Expr {
  virtual ~Expr() = default;
  virtual int eval() const = 0;
};
struct Num : Expr {
  explicit Num(int v) : v_(v) {}
  int eval() const override { return v_; }
  int v_;
};
struct Add : Expr {
  Add(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r) : l_(std::move(l)), r_(std::move(r)) {}
  int eval() const override { return l_->eval() + r_->eval(); }
  std::unique_ptr<Expr> l_, r_;
};
struct Mul : Expr {
  Mul(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r) : l_(std::move(l)), r_(std::move(r)) {}
  int eval() const override { return l_->eval() * r_->eval(); }
  std::unique_ptr<Expr> l_, r_;
};

int main() {
  // (2 + 3) * 4 + 1
  auto sum = std::make_unique<Add>(std::make_unique<Num>(2), std::make_unique<Num>(3));
  auto prod = std::make_unique<Mul>(std::move(sum), std::make_unique<Num>(4));
  Add whole(std::move(prod), std::make_unique<Num>(1));
  std::cout << whole.eval() << "\\n";
}
`,output:"21",options:["21","15","14","25"],answer:[0],explain:"The tree's shape carries the precedence: (2 + 3) = 5, times 4 = 20, plus 1 = 21. Evaluation is a recursive walk with no parsing involved. Ownership flows downward with unique_ptr, so the whole tree is released by destroying its root."},{id:"bt-mcq-int-limit",kind:"mcq",topic:"L5.interpreter",level:3,prompt:"Users now want loops, functions and imports in your rule language. What should you do?",options:["Stop growing the node-class design; adopt a real parser and a compiled or bytecode representation, or embed an existing scripting language","Add one class per new keyword indefinitely","Make every node a singleton","Move evaluation into the client"],answer:[0],explain:"Class-per-rule is neat for a few rules and becomes a maintenance and speed problem as the grammar grows. State the switch point honestly in a design review: small and stable means Interpreter, otherwise buy or generate a language implementation."},{id:"bt-smell-int-eval",kind:"smell",topic:"L5.interpreter",level:2,prompt:"Name the smell and the principle it strains.",code:`bool allowed(const std::string& rule, const Ctx& c) {
  // re-split and re-parse the same string on every request
  if (rule.find("AND") != std::string::npos) { /* split and recurse */ }
  if (rule.find("OR")  != std::string::npos) { /* split and recurse */ }
  if (rule.find(">")   != std::string::npos) { /* hand-rolled compare */ }
  return false;
}`,options:["Rule text is parsed ad hoc on every call with string searches, which is slow and brittle; separate parsing from evaluation (parse once into a tree of nodes)","A class is missing a virtual destructor","A global singleton is used","A method returns a reference to a local"],answer:[0],explain:"Substring checks mis-handle precedence, nested brackets and values that contain the keywords. Parse once into an expression tree, validate it, and evaluate the tree on each request."},{id:"bt-mcq-nul-intent",kind:"mcq",topic:"L5.null-object",level:1,prompt:"What is the Null Object pattern?",options:["A real implementation of an interface that does nothing (or a safe default), so callers do not need null checks","A pointer that is set to nullptr after delete","An exception thrown when a dependency is missing","A singleton that holds all optional values"],answer:[0],explain:"The caller treats it like any other implementation. Used well it removes scattered if (p) checks. Used badly it hides a missing dependency that should have been an error, so only use it when 'do nothing' really is the right behaviour."},{id:"bt-pat-nul-logger",kind:"pattern",topic:"L5.null-object",level:1,prompt:"Tests and benchmarks construct a service with a Logger that discards messages, so the service code never checks whether a logger exists. Which Patternling fits?",options:["Nullnewt (Null Object)","Hubhen (Mediator)","Relayrat (Chain of Responsibility)","Glyphpup (Interpreter)"],answer:[0],explain:"A do-nothing implementation of the same interface stands in for absence. In C++ you inject it through the constructor, usually as a reference or a unique_ptr to the interface."},{id:"bt-pred-nul-audit",kind:"predict",topic:"L5.null-object",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <memory>
#include <string>

struct Audit {
  virtual ~Audit() = default;
  virtual void record(const std::string& what) = 0;
};
struct ConsoleAudit : Audit {
  void record(const std::string& what) override { std::cout << "audit: " << what << "\\n"; }
};
struct NoAudit : Audit {
  void record(const std::string&) override {}
};

class Account {
 public:
  explicit Account(std::unique_ptr<Audit> audit) : audit_(std::move(audit)) {}
  void deposit(int amount) {
    balance_ += amount;
    audit_->record("deposit " + std::to_string(amount));
  }
  int balance() const { return balance_; }

 private:
  std::unique_ptr<Audit> audit_;
  int balance_ = 0;
};

int main() {
  Account quiet(std::make_unique<NoAudit>());
  Account loud(std::make_unique<ConsoleAudit>());
  quiet.deposit(5);
  loud.deposit(7);
  quiet.deposit(1);
  std::cout << quiet.balance() << " " << loud.balance() << "\\n";
}
`,output:"audit: deposit 7\n6 7",options:["audit: deposit 7\n6 7","audit: deposit 5\naudit: deposit 7\naudit: deposit 1\n6 7","audit: deposit 7\n5 7","6 7"],answer:[0],explain:"Both accounts call audit_->record() unconditionally. The NoAudit object swallows the calls and the ConsoleAudit prints once. No branch in Account checks for a missing auditor, which is the benefit. The balances are 5 + 1 = 6 and 7."},{id:"bt-mcq-nul-danger",kind:"mcq",topic:"L5.null-object",level:3,prompt:"A PaymentGateway has a NullGateway whose charge() returns success without charging. A config mistake wires it into production. What went wrong with the design?",options:["A silent success default is not harmless: absence of a payment dependency should fail loudly, so Null Object suits optional side effects (logging, metrics), not essential operations","Null Object should always return failure","The gateway should be a singleton","Nothing; that is the intended use"],answer:[0],explain:"Null Object is for behaviour where doing nothing is correct. For essential collaborators, make absence an error at construction time (throw or refuse to start) or use std::optional and force the caller to handle it."},{id:"bt-smell-nul-checks",kind:"smell",topic:"L5.null-object",level:2,prompt:"Name the smell and the principle it strains.",code:`void Service::run() {
  if (metrics_) metrics_->count("start");
  step1();
  if (metrics_) metrics_->count("step1");
  step2();
  if (metrics_) metrics_->count("step2");
  if (tracer_)  tracer_->end();
}`,options:["The same null check is repeated at every call site, so one forgotten check crashes; inject a do-nothing implementation instead (Null Object)","A virtual destructor is missing","A class has too many subclasses","A method is too short"],answer:[0],explain:"Optional collaborators that must be checked everywhere invite a missed check and obscure the main flow. A do-nothing metrics object lets the service read straight through."},{id:"bt-mcq-spc-intent",kind:"mcq",topic:"L5.specification",level:1,prompt:"What does the Specification pattern provide?",options:["Small named predicate objects that can be combined with and / or / not to express business rules, and reused for filtering or validation","A way to describe the public API in documents","A base class for every entity","A cache for query results"],answer:[0],explain:"Each rule becomes an object with an isSatisfiedBy method. Composition builds richer rules without editing the old ones, which is useful for coupons, search filters and eligibility checks."},{id:"bt-pat-spc-coupon",kind:"pattern",topic:"L5.specification",level:2,prompt:"A coupon applies if the cart is over 50, the user is new, and the items are not already discounted; ops keeps inventing new combinations. Which Patternling fits?",options:["Sieveling (Specification)","Stencilmoth (Template Method)","Chamelyn (State)","Snapsnail (Memento)"],answer:[0],explain:"Reusable predicates composed with and/or/not. The alternative is a growing if-chain in the checkout, which has to be edited and retested for each new combination."},{id:"bt-pred-spc-combo",kind:"predict",topic:"L5.specification",level:2,prompt:"What does this program print?",code:`#include <iostream>
#include <memory>
#include <utility>

struct Cart { int total; bool newUser; };

struct Spec {
  virtual ~Spec() = default;
  virtual bool ok(const Cart& c) const = 0;
};
struct Over : Spec {
  explicit Over(int n) : n_(n) {}
  bool ok(const Cart& c) const override { return c.total > n_; }
  int n_;
};
struct NewUser : Spec {
  bool ok(const Cart& c) const override { return c.newUser; }
};
struct Not : Spec {
  explicit Not(std::unique_ptr<Spec> s) : s_(std::move(s)) {}
  bool ok(const Cart& c) const override { return !s_->ok(c); }
  std::unique_ptr<Spec> s_;
};
struct And : Spec {
  And(std::unique_ptr<Spec> a, std::unique_ptr<Spec> b) : a_(std::move(a)), b_(std::move(b)) {}
  bool ok(const Cart& c) const override { return a_->ok(c) && b_->ok(c); }
  std::unique_ptr<Spec> a_, b_;
};

int main() {
  // over 50 and not a new user
  And rule(std::make_unique<Over>(50), std::make_unique<Not>(std::make_unique<NewUser>()));
  std::cout << rule.ok({80, false}) << rule.ok({80, true}) << rule.ok({50, false}) << rule.ok({51, false}) << "\\n";
}
`,output:"1001",options:["1001","1011","1000","0101"],answer:[0],explain:"{80,false}: over 50 and not new gives 1. {80,true}: new user is excluded, 0. {50,false}: the comparison is strict, so 50 is not over 50, 0. {51,false}: 1. The result prints 1001. Composing existing specs expressed a new rule without editing any of them."},{id:"bt-mcq-spc-vs",kind:"mcq",topic:"L5.specification",level:3,prompt:"For two fixed rules in a small module, is a Specification class hierarchy worth it?",options:["Usually not; a plain function or lambda per rule is enough, and Specification pays off when rules multiply, get combined at runtime or come from configuration","Yes, always, because it follows SOLID","Only if rules are stored in a database","No, because predicates cannot be combined in C++"],answer:[0],explain:"In C++ a std::function<bool(const Cart&)> with small combinator helpers is often lighter than a class hierarchy. Name the over-application cost in review: extra types and indirection that two rules do not justify."},{id:"bt-smell-spc-flags",kind:"smell",topic:"L5.specification",level:2,prompt:"Name the smell and the principle it strains.",code:`std::vector<Product> filter(const std::vector<Product>& ps, bool byColour, Colour c,
                            bool bySize, Size s, bool byBrand, const std::string& b) {
  std::vector<Product> out;
  for (const auto& p : ps) {
    if (byColour && p.colour != c) continue;
    if (bySize   && p.size   != s) continue;
    if (byBrand  && p.brand  != b) continue;
    out.push_back(p);
  }
  return out;
}`,options:["Flags and parameters grow with every new criterion, and callers cannot combine rules freely; Open/Closed (compose predicates instead)","A missing virtual destructor","A class exposes a public data member","The function is a template"],answer:[0],explain:"Each new filter edits this signature and every call site, and 'or' is not expressible. Composable predicates (a Specification or lambdas) let callers build any combination."}];function n(e,t){return new Set(t).size===t.length&&t.length===e.answer.length&&e.answer.every(e=>t.includes(e))}e.s(["f",0,s],17092),e.s(["f",0,[{id:"cd-mcq-thr-datarace",kind:"mcq",topic:"L7.threads",level:1,prompt:"Which situation is a data race in C++?",options:["Two threads access the same non-atomic variable, at least one writes, with no synchronisation between them","Two threads read the same const variable","Two threads each lock their own mutex and write their own variable","One thread writes a variable and another reads it after a join"],answer:[0],explain:"A data race needs a shared location, at least one write, and no happens-before ordering. It is undefined behaviour. Reading const data, using separate data, or reading after join (which orders the writes) are all fine."},{id:"cd-mcq-thr-jthread",kind:"mcq",topic:"L7.threads",level:2,prompt:"A function creates a `std::thread`, then returns early on an error path before calling `join()`. What happens when the thread object is destroyed?",options:["`std::terminate` is called because the thread is still joinable","The thread is silently joined","The thread is detached automatically","Nothing; the thread keeps running safely"],answer:[0],explain:"Destroying a joinable `std::thread` terminates the program. `std::jthread` (C++20) joins in its destructor, which is why it is the RAII choice."},{id:"cd-mcq-mx-raii",kind:"mcq",topic:"L7.mutex",level:1,prompt:"Why prefer `std::lock_guard` to calling `mutex.lock()` and `mutex.unlock()` by hand?",options:["The guard releases the lock on every exit path, including early returns and exceptions","It makes the critical section run faster","It lets two threads hold the lock at once","It removes the need for a mutex member"],answer:[0],explain:"RAII ties unlock to scope exit. Hand-written unlock is skipped by any early return or exception, leaking the lock. Speed is the same."},{id:"cd-mcq-mx-invariant",kind:"mcq",topic:"L7.mutex",level:2,prompt:"What should a mutex be understood to protect?",options:["An invariant over a group of data, so every access to that data takes the same mutex","One specific member function","Only the variables that are written, never the ones that are only read","A thread, so it cannot be pre-empted"],answer:[0],explain:"The mutex guards an invariant such as 'the map and its size agree'. Readers must lock too: a read concurrent with a write is a data race."},{id:"cd-mcq-cv-predicate",kind:"mcq",topic:"L7.condvar",level:1,prompt:"Why must a consumer wait on a predicate, as in `cv.wait(lock, [&]{ return !queue.empty(); })`?",options:["Wake-ups can be spurious or stolen by another consumer, and a notification sent earlier is not remembered","The predicate makes the wake-up faster","Without it the mutex is never released","The standard forbids `wait` without a lambda"],answer:[0],explain:"The predicate overload re-checks the real state under the mutex before sleeping and after every wake-up. It covers lost, spurious and stolen wake-ups."},{id:"cd-mcq-cv-notifyall",kind:"mcq",topic:"L7.condvar",level:3,prompt:"A bounded queue uses ONE condition variable for both 'not full' and 'not empty'. Which notification is safe?",options:["`notify_all`, because a woken waiter of the wrong kind would otherwise swallow the only wake-up","`notify_one`, always","No notification; the mutex wakes waiters","`notify_one`, but only after unlocking twice"],answer:[0],explain:"With mixed waiters, `notify_one` can wake a thread whose condition is still false and the useful waiter sleeps on (a lost wake-up). `notify_all`, or two condition variables, avoids it."},{id:"cd-mcq-at-checkthenact",kind:"mcq",topic:"L7.atomics",level:2,prompt:"`if (stock.load() > 0) stock.fetch_sub(1);` on a `std::atomic<int>` with stock = 1. Two threads run it. What can happen?",options:["Both pass the check and stock becomes -1, because each call is atomic but the pair is not","Exactly one succeeds, because atomics are thread safe","A compile error","Undefined behaviour from a data race on `stock`"],answer:[0],explain:"Each operation is atomic, but the decision (load) and the update (fetch_sub) are separate steps. Use a compare-exchange loop or a mutex. There is no data race here; it is a race condition."},{id:"cd-mcq-at-volatile",kind:"mcq",topic:"L7.atomics",level:2,prompt:"In C++, does `volatile int ready;` make a flag safe to share between threads?",options:["No; use `std::atomic` or a mutex, because volatile gives no atomicity or inter-thread ordering","Yes, volatile is the C++ way to share flags","Yes, but only on x86","Yes, if the flag is only a bool"],answer:[0],explain:"`volatile` only stops the compiler optimising away accesses (for hardware registers). It does not make accesses atomic or ordered between threads, so concurrent use is a data race."},{id:"cd-mcq-dl-conditions",kind:"mcq",topic:"L7.deadlock",level:1,prompt:"Thread 1 locks A then B; thread 2 locks B then A. Which Coffman condition is the usual one to break?",options:["Circular wait, by agreeing one lock order or taking both locks together","Mutual exclusion, by removing the mutexes","No pre-emption, by killing a thread","Hold-and-wait, by never using more than one thread"],answer:[0],explain:"Circular wait is the practical one: a global lock order or `std::scoped_lock(a, b)` removes the cycle. Removing exclusion or killing threads breaks correctness."},{id:"cd-mcq-dl-scoped",kind:"mcq",topic:"L7.deadlock",level:2,prompt:"What does `std::scoped_lock lk(a.mutex, b.mutex);` guarantee?",options:["Both mutexes are acquired without deadlock, whatever the argument order other callers use","a is locked before b, always","The locks are released one by one in random order","It works even if `a` and `b` are the same mutex"],answer:[0],explain:"It uses a deadlock-avoidance algorithm for multiple locks. It does not fix self-aliasing: locking the same non-recursive mutex twice is undefined behaviour, so check for that case."},{id:"cd-mcq-tp-future",kind:"mcq",topic:"L7.pool",level:2,prompt:"How does a thread pool's `submit` best give the caller the result, and any exception, of a task?",options:["Wrap the task in a `std::packaged_task` and return its `std::future`","Return a reference to a result variable the worker will fill in later","Have the worker print the result","Block `submit` until the task is finished"],answer:[0],explain:"`packaged_task` stores the value or the exception, and `future::get()` returns or rethrows it. Raw references risk lifetime bugs, and blocking submit defeats the pool."},{id:"cd-mcq-tp-shutdown",kind:"mcq",topic:"L7.pool",level:3,prompt:"A pool destructor sets `stopping = true`, wakes all workers and joins them. What should a worker do when it wakes and finds `stopping` set but the queue still has tasks?",options:["Keep running tasks until the queue is empty, then exit, so accepted work is not dropped","Exit immediately and discard the queue","Run one task and exit","Detach itself"],answer:[0],explain:"State the policy. Draining is the safe default for accepted work; a pool may instead offer an explicit cancel. The worker loop exits only when stopping and the queue is empty."}]],31680),e.s(["f",0,n],99658);let r={foeHp:60,playerHp:40,baseDamage:12,streakBonus:3,streakCap:3,counterDamage:10};function c(e){let t=e>>>0;return()=>{let e=t=t+0x6d2b79f5>>>0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000}}function l(e,t){let a=e.slice();for(let e=a.length-1;e>0;e--){let i=Math.floor(t()*(e+1));[a[e],a[i]]=[a[i],a[e]]}return a}function d(e,t){let a=l(e.options.map((e,t)=>t),t);return{...e,options:a.map(t=>e.options[t]),answer:e.answer.map(e=>a.indexOf(e)).sort((e,t)=>e-t)}}let p=e=>"asking"===e.status?e.queue[0]:void 0;e.s(["R",0,r,"r",0,function(e,t){let a=p(e);if(!a)throw Error("battle is over");let i=n(a,t),o=e.queue.slice(1),{config:s}=e,r=e.foeHp,c=e.playerHp,l=e.streak,d=0,h=0,u=o,m=e.missed.slice();i?(r=Math.max(0,r-(d=s.baseDamage+s.streakBonus*Math.min(l,s.streakCap))),l+=1):(c=Math.max(0,c-(h=s.counterDamage)),l=0,u=[...o,a],m.includes(a.id)||m.push(a.id));let b=0===r?"won":0===c?"lost":0===u.length?"won":"asking";return{state:{...e,foeHp:r,playerHp:c,streak:l,queue:u,missed:m,status:b,answered:e.answered+1},result:{correct:i,damageToFoe:d,damageToPlayer:h,explain:a.explain}}},"m",0,p,"E",0,c,"q",0,d,"x",0,function(e){return"won"!==e.status?0:0===e.missed.length?3:1===e.missed.length?2:1},"f",0,function(e,t,a={...r}){let i=c(t);return{config:a,foeHp:a.foeHp,playerHp:a.playerHp,streak:0,queue:l(e,i).map(e=>d(e,i)),status:0===e.length?"won":"asking",missed:[],answered:0}}],34052)}])})();