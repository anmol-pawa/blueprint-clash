(()=>{"use strict";(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,24298,e=>{var t=e.i(43476),i=e.i(71645);let a={mcq:"CONCEPT",pattern:"WHICH PATTERN?",smell:"SMELL SPOTTER",predict:"PREDICT THE OUTPUT"};e.s(["e",0,function({label:e,hp:i,max:a,tone:s}){return(0,t.jsxs)("div",{className:"min-w-0 flex-1",children:[(0,t.jsxs)("div",{className:"font-display flex justify-between text-xs",children:[(0,t.jsx)("span",{children:e}),(0,t.jsxs)("span",{children:[i,"/",a]})]}),(0,t.jsx)("div",{className:"h-3 border-2 border-[#060d20] bg-[#060d20]",role:"progressbar","aria-label":`${e} HP`,"aria-valuenow":i,"aria-valuemax":a,children:(0,t.jsx)("div",{className:"h-full transition-[width] duration-500",style:{width:`${i/a*100}%`,background:s}})})]})},"a",0,function({card:e,phase:s,selected:o,result:n,counter:r,nextLabel:c,onToggle:l,onSubmit:d,onNext:p}){let h=(0,i.useRef)(null);(0,i.useEffect)(()=>{"feedback"===s&&h.current?.scrollIntoView({block:"end",behavior:"auto"})},[s]);let u=e.answer.length>1;return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("div",{className:"font-display flex justify-between text-xs text-[var(--accent-2)]",children:[(0,t.jsx)("span",{children:a[e.kind]}),(0,t.jsx)("span",{children:r})]}),(0,t.jsx)("p",{className:"shrink-0 text-base leading-snug",children:e.prompt}),"code"in e&&(0,t.jsx)("pre",{className:"max-h-48 shrink-0 overflow-auto rounded border-2 border-[#060d20] bg-[#07102a] p-2 text-xs leading-snug",tabIndex:0,children:(0,t.jsx)("code",{children:e.code})}),u&&(0,t.jsx)("p",{className:"text-xs text-white/60",children:"Choose all that apply."}),(0,t.jsx)("div",{className:"flex shrink-0 flex-col gap-2",role:u?"group":"radiogroup",children:e.options.map((i,a)=>{let n=o.includes(a),r=e.answer.includes(a),c="feedback"===s||"resolving"===s,d=c&&r?["#166534","#34d399"]:c&&n?["#7f1d1d","#f87171"]:n?["#0c4a6e","#38bdf8"]:null;return(0,t.jsxs)("button",{role:u?"checkbox":"radio","aria-checked":n,disabled:"answering"!==s,onClick:()=>l(a),style:{..."predict"===e.kind?{fontFamily:"ui-monospace, monospace"}:{},...d?{"--btn":d[0],"--btn-hi":d[1]}:{},...c&&d?{opacity:1}:{}},className:"px-btn min-h-11 px-3 py-2 text-left text-sm",children:[(0,t.jsx)("span",{className:"mr-2 text-white/50",children:a+1}),(0,t.jsx)("span",{className:"whitespace-pre-wrap",children:i})]},i)})}),"answering"===s&&(0,t.jsx)("button",{className:"px-btn px-btn-primary mt-1 min-h-11 px-4 py-2",disabled:0===o.length,onClick:d,children:"Attack!"}),"feedback"===s&&n&&(0,t.jsxs)("div",{ref:h,className:"mt-1 flex shrink-0 flex-col gap-2",role:"status",children:[(0,t.jsx)("div",{className:`font-display text-lg ${n.correct?"text-emerald-300":"text-red-300"}`,children:n.correct?n.damageToFoe>0?`Hit! −${n.damageToFoe}`:"Correct!":n.damageToPlayer>0?`Countered! −${n.damageToPlayer}`:"Not quite"}),(0,t.jsx)("p",{className:"text-sm leading-snug text-white/85",children:n.explain}),(0,t.jsx)("button",{className:"px-btn px-btn-primary min-h-11 px-4 py-2",onClick:p,children:c})]})]})}])},70073,94448,60517,99658,34052,e=>{let t=[{id:"ot-mcq-raii",kind:"mcq",topic:"L1.raii",level:1,prompt:"What does RAII tie to an object's lifetime?",options:["Ownership of a resource: acquired in the constructor, released in the destructor","The number of virtual functions it has","The order in which headers are included","Whether it may be copied across threads"],answer:[0],explain:"RAII makes releasing a resource automatic: the destructor runs on every exit path, including early returns and exceptions, so a lock, file or allocation cannot leak because someone forgot a cleanup call."},{id:"ot-mcq-unique",kind:"mcq",topic:"L1.ownership",level:1,prompt:"A class owns exactly one heap object that nobody else shares. Which member type states that most clearly?",options:["T*","std::unique_ptr<T>","std::shared_ptr<T>","T&"],answer:[1],explain:"unique_ptr says 'sole owner' in the type and deletes the object for you. shared_ptr pays for shared ownership you do not have (a control block and atomic counts), and a raw pointer or reference says nothing about who deletes."},{id:"ot-mcq-rule",kind:"mcq",topic:"L1.rule-of-zero",level:2,prompt:"Which are true of the Rule of Zero? Choose all that apply.",options:["Prefer members that manage themselves (vector, string, unique_ptr) so you write no special members","Every class should define all five special member functions explicitly","A class that owns a raw resource directly should wrap it in a small RAII type","It forbids classes from having destructors in any circumstance"],answer:[0,2],explain:"The Rule of Zero pushes resource management into dedicated types so most classes need none of the special members. It does not ban destructors: the small RAII wrapper is exactly where a destructor belongs."},{id:"ot-pat-notify",kind:"pattern",topic:"L3.observer",level:1,prompt:"A stock ticker must tell any number of screens when a price changes, without knowing what the screens do with it. Which Patternling answers?",options:["Owlserver (Observer)","Shapeshift (State)","Templar (Template Method)","Solo (Singleton)"],answer:[0],explain:"One subject, many dependents that subscribe and get notified: Observer. State changes behaviour of one object by its mode, Template Method fixes an algorithm skeleton, and Singleton is about instance count, not notification."},{id:"ot-pat-wrap",kind:"pattern",topic:"L3.decorator",level:2,prompt:"You need optional logging, compression and encryption around a byte stream, combinable in any order at run time. Which Patternling fits best?",options:["Shellcrab (Decorator)","Forgebot (Factory Method)","Facadeon (Facade)","Clonewisp (Prototype)"],answer:[0],explain:"Each wrapper has the same interface as the stream and adds one behaviour, so they stack in any combination. A Facade would simplify a subsystem rather than layer behaviour, and subclassing every combination explodes (2^n classes)."},{id:"ot-smell-switch",kind:"smell",topic:"L2.ocp",level:2,prompt:"Name the smell and the principle it strains.",code:`double area(const Shape& s) {
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
`,output:"Base Derived",options:["Base Derived","Derived Derived","Base Base","Derived Base"],answer:[0],explain:"Passing by value copy-constructs a Base from the Derived, slicing off the Derived part and its vtable identity. Taking const Base& keeps the original object. Slicing is why polymorphic parameters are references or pointers."},{id:"ot2-mcq-virtual-cost",kind:"mcq",topic:"L2.virtual-cost",level:3,prompt:"What is the honest cost of a virtual call, and when does it matter?",options:["A vtable pointer per object and an indirect call that blocks inlining; usually negligible, but it can matter in a hot inner loop over millions of tiny objects","Virtual calls are always an order of magnitude slower, so avoid them everywhere","Virtual calls cost nothing because the compiler always devirtualises them","They allocate memory on the heap for every call"],answer:[0],explain:"Each polymorphic object carries a hidden pointer, and the call goes through a table lookup the optimiser often cannot inline. For ordinary application code the flexibility wins. In a profiled hot loop consider final classes, templates, or a variant, and measure first."}];e.s(["f",0,t],70073);let i=[{id:"ss-mcq-srp-def",kind:"mcq",topic:"L2.srp",level:1,prompt:"Which statement is the most useful way to apply the Single Responsibility Principle?",options:["A class should have one reason to change, meaning one actor or concern whose requirements drive its edits","A class should have exactly one public method","A class should be at most 100 lines long","A class should never depend on another class"],answer:[0],explain:"SRP is about axes of change, not method counts or line counts. If the billing team and the reporting team both force edits to the same class, it has two responsibilities and each team can break the other's behaviour."},{id:"ss-smell-srp-invoice",kind:"smell",topic:"L2.srp",level:1,prompt:"Name the smell and the principle it strains.",code:`class Invoice {
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
}`,options:["Feature envy (anemic model); move total() into Cart so it owns its items and rules","Fat interface; split Cart into readers and writers","Covariant return; Liskov Substitution","Singleton; Dependency Inversion"],answer:[0],explain:"The free function reaches into Cart's data to apply rules that belong to the cart, and every caller can duplicate or diverge from them. Put total() on Cart and keep items private so the discount rule has one home."},{id:"ss-mcq-coupling",kind:"mcq",topic:"L2.coupling",level:2,prompt:"Which pairing is the healthiest target for module design?",options:["High cohesion within a module, low coupling between modules","Low cohesion inside, high coupling outside","High coupling, so changes propagate quickly","Cohesion and coupling do not matter for design"],answer:[0],explain:"Related things together and unrelated things apart: a change should touch one module. Coupling through narrow, stable abstractions is fine; coupling through shared mutable state or concrete types is what hurts."},{id:"ss-mcq-explain-order",kind:"mcq",topic:"L2.interview",level:3,prompt:"In an LLD interview, what is the most convincing way to present SOLID?",options:["Name the likely change, show the seam you put there, and say what you left simple and why","List all five principles in your opening minute","Add an interface for every class","Avoid mentioning trade-offs to sound confident"],answer:[0],explain:"Senior signals are judgement and communication: tie each abstraction to a concrete change, state the cost, and show you can stop. Reciting acronyms or abstracting everything reads as cargo-culting."},{id:"ss-pat-dip-strategy",kind:"pattern",topic:"L2.dip",level:2,prompt:"A sorter must support several comparison orders chosen at run time, without the sorter knowing any of them. Which Patternling fits?",options:["Chamelstrat (Strategy)","Solo (Singleton)","Facadeon (Facade)","Clonewisp (Prototype)"],answer:[0],explain:"Strategy injects interchangeable algorithms behind one interface, so the sorter depends only on the abstraction (DIP) and new orders add classes (OCP). Singleton, Facade and Prototype address instance count, simplification and copying."}];e.s(["f",0,i],94448);let a=[{id:"cf-mcq-fm-intent",kind:"mcq",topic:"L3.factory-method",level:1,prompt:"What is the core idea of the Factory Method pattern?",options:["A base class calls an overridable creation function, so each subclass decides which concrete product to build","A single global function with a big switch that builds every type","A class that can only ever have one instance","A way to copy an existing object through a base pointer"],answer:[0],explain:"The creator holds the workflow and defers one step, 'make the product', to subclasses. The switch-in-one-function version is the simple factory, which is useful but is not the GoF pattern. Singleton and Prototype solve different problems."},{id:"cf-pat-fm-importer",kind:"pattern",topic:"L3.factory-method",level:1,prompt:"An Importer runs the same steps for every file, but the parser it needs (JSON, CSV, XML) depends on the importer subclass. Which Patternling fits?",options:["Forgebot (Factory Method)","Solo (Singleton)","Clonewisp (Prototype)","Beaverbuild (Builder)"],answer:[0],explain:"The workflow is fixed in the base class and one creation step is overridden: Factory Method. Builder assembles one complex object step by step, which is not what is happening here."},{id:"cf-pred-fm-importer",kind:"predict",topic:"L3.factory-method",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
};`,options:["Service Locator: the real dependencies are invisible in the signature and fail at run time if unregistered; inject PaymentGateway and Mailer directly","Slicing of the Cart","Missing virtual destructor on Checkout","Over-use of const"],answer:[0],explain:"A locator is global state with extra steps: you cannot see what Checkout needs without reading its body, and a missing registration shows up as a run-time failure. Constructor injection documents requirements and lets the compiler help."},{id:"cf-mcq-di-container",kind:"mcq",topic:"L3.di",level:3,prompt:"C++ projects rarely use a reflection-based DI container. Why, and what is the usual alternative?",options:["C++ has no runtime reflection, so teams wire dependencies by hand in main or with small factory functions (compile-time libraries exist but are optional)","Because C++ forbids passing objects to constructors","Because dependency injection only works in garbage-collected languages","Because containers are slower than raw pointers by a factor of 100"],answer:[0],explain:"Manual constructor injection is explicit and cheap, and a long main() is a feature (it is the architecture, written down). A container starts to pay off only when object graphs are large and lifetimes (per request, per session) need managing."},{id:"cf-mcq-choose-builder-factory",kind:"mcq",topic:"L3.builder",level:3,prompt:"How do you explain the difference between Builder and Factory in one sentence?",options:["A factory decides which type to create and returns it in one call; a builder assembles one complex object over several steps","They are the same pattern with different names","A factory is for stack objects and a builder is for heap objects","A builder always returns a pointer; a factory always returns a value"],answer:[0],explain:"Factories answer 'which class?' and builders answer 'how do I configure this one?'. Real designs combine them: a factory chooses a builder, or a builder's build() delegates to a factory for the correct product subtype."},{id:"cf-pat-choose-config",kind:"pattern",topic:"L3.factory-method",level:2,prompt:"A game reads a level file naming monster kinds as strings and must create the right class for each, without the loader knowing every class. Which Patternling is the closest fit?",options:["Forgebot (Factory Method)","Clonewisp (Prototype)","Solo (Singleton)","Shellcrab (Decorator)"],answer:[0],explain:"Mapping a key to a creator behind an interface is a factory (here a registry-based one). Prototype is a close second if each kind is a configured template that you copy, so state which you picked and why."},{id:"cf-mcq-choose-overuse",kind:"mcq",topic:"L3.factory-method",level:3,prompt:"In a review, you see a `FooFactoryFactory` that creates `FooFactory` objects for one concrete `Foo`. What is the right call?",options:["Remove the layers; indirection with no varying axis is speculative generality and costs readability","Add a third factory for symmetry","Convert it to a Singleton","Leave it; more patterns always mean better design"],answer:[0],explain:"A pattern earns its place by absorbing a change you can name. If nothing varies, the factory is just a longer way to write `Foo{}`. Interviewers reward the candidate who can say when not to use a pattern."}];function s(e,t){return new Set(t).size===t.length&&t.length===e.answer.length&&e.answer.every(e=>t.includes(e))}e.s(["f",0,a],60517),e.s(["f",0,s],99658);let o={foeHp:60,playerHp:40,baseDamage:12,streakBonus:3,streakCap:3,counterDamage:10};function n(e){let t=e>>>0;return()=>{let e=t=t+0x6d2b79f5>>>0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000}}function r(e,t){let i=e.slice();for(let e=i.length-1;e>0;e--){let a=Math.floor(t()*(e+1));[i[e],i[a]]=[i[a],i[e]]}return i}function c(e,t){let i=r(e.options.map((e,t)=>t),t);return{...e,options:i.map(t=>e.options[t]),answer:e.answer.map(e=>i.indexOf(e)).sort((e,t)=>e-t)}}let l=e=>"asking"===e.status?e.queue[0]:void 0;e.s(["R",0,o,"r",0,function(e,t){let i=l(e);if(!i)throw Error("battle is over");let a=s(i,t),o=e.queue.slice(1),{config:n}=e,r=e.foeHp,c=e.playerHp,d=e.streak,p=0,h=0,u=o,m=e.missed.slice();a?(r=Math.max(0,r-(p=n.baseDamage+n.streakBonus*Math.min(d,n.streakCap))),d+=1):(c=Math.max(0,c-(h=n.counterDamage)),d=0,u=[...o,i],m.includes(i.id)||m.push(i.id));let b=0===r?"won":0===c?"lost":0===u.length?"won":"asking";return{state:{...e,foeHp:r,playerHp:c,streak:d,queue:u,missed:m,status:b,answered:e.answered+1},result:{correct:a,damageToFoe:p,damageToPlayer:h,explain:i.explain}}},"m",0,l,"E",0,n,"q",0,c,"x",0,function(e){return"won"!==e.status?0:0===e.missed.length?3:1===e.missed.length?2:1},"f",0,function(e,t,i={...o}){let a=n(t);return{config:i,foeHp:i.foeHp,playerHp:i.playerHp,streak:0,queue:r(e,a).map(e=>c(e,a)),status:0===e.length?"won":"asking",missed:[],answered:0}}],34052)}])})();