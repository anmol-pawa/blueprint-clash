(()=>{"use strict";(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,97682,e=>{var t=e.i(43476),r=e.i(22016),a=e.i(71645),n=e.i(24298),s=e.i(93423),i=e.i(34052),o=e.i(99658),l=e.i(91162),c=e.i(93078);let d=["","Dusty","Rusty"];e.s(["ReviewClient",0,function(){let e=(0,a.useRef)(null),[p,u]=(0,a.useState)(null),[h,m]=(0,a.useState)("ok"),[f,g]=(0,a.useState)(null),[b,y]=(0,a.useState)(0),[v,w]=(0,a.useState)([]),[x,k]=(0,a.useState)(null),[S,_]=(0,a.useState)(0),[A,j]=(0,a.useState)(0),[C,P]=(0,a.useState)(s.Z[0].id),F=(0,s.N)(C),L=(0,a.useCallback)((e,t,r)=>{let a=(0,s.N)(e).cards,n=(0,c.D)(t.srs,a.map(e=>e.id),r),o=(0,i.E)(65535&r);P(e),y(0),_(0),w([]),k(null),g(n.map(e=>(0,i.q)(a.find(t=>t.id===e),o)))},[]);(0,a.useEffect)(()=>{let t=!0;return(async()=>{let r;try{e.current=(0,l.a)();let t=await (0,l.o)(e.current,Date.now());r=t.data,t.warning&&m("off")}catch{r=(await (0,l.o)((0,l.R)(),Date.now())).data,m("off")}if(!t)return;let a=Date.now();j(a),u(r),L((0,s.r)(window.location.search),r,a)})(),()=>{t=!1}},[L]);let q=f?.[b],T=(0,a.useCallback)(()=>{if(!q||x||0===v.length||!p)return;let t=(0,o.f)(q,v);k({correct:t,damageToFoe:0,damageToPlayer:0,explain:q.explain}),t&&_(e=>e+1);let r=e.current,a=e=>(0,c.w)(e.srs,q.id,t,Date.now());if(r&&"ok"===h)(0,l.S)(r,p,a,Date.now()).then(u).catch(()=>m("off"));else{let e=structuredClone(p);a(e),u(e)}},[q,x,v,p,h]),N=(0,a.useMemo)(()=>{let e={unseen:0,seen:0,learning:0,practiced:0,mastered:0,ingrained:0};if(!p)return{counts:e,rusty:0};let t=0;for(let r of F.cards)e[(0,c.H)(p.srs[r.id])]+=1,(0,c.L)(p.srs[r.id],A)>0&&(t+=1);return{counts:e,rusty:t}},[p,A,F]),D=null!==f&&b>=f.length;return(0,t.jsxs)("main",{className:"mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-3 p-3",children:[(0,t.jsxs)("header",{className:"flex items-center justify-between",children:[(0,t.jsx)("h1",{className:"font-display text-xl text-[var(--accent-2)]",children:"DAILY REVIEW"}),(0,t.jsx)(r.default,{href:"/",className:"px-btn px-4 py-3",children:"Menu"})]}),"off"===h&&(0,t.jsx)("p",{className:"panel p-2 text-xs text-white/70",children:"Progress cannot be saved in this browser; reviews will not persist."}),(0,t.jsx)("nav",{className:"flex gap-2","aria-label":"Deck",children:s.Z.map(e=>(0,t.jsx)("button",{className:`px-btn flex-1 px-3 py-3 text-sm ${e.id===C?"px-btn-primary":""}`,"aria-pressed":e.id===C,disabled:!p,onClick:()=>p&&L(e.id,p,Date.now()),children:e.title},e.id))}),(0,t.jsxs)("section",{className:"panel p-3","aria-label":"Mastery",children:[(0,t.jsxs)("div",{className:"font-display mb-1 text-xs text-white/60",children:["MASTERY (",F.title," deck, ",F.cards.length," cards)"]}),(0,t.jsx)("div",{className:"flex flex-wrap gap-x-3 gap-y-1 text-xs",children:c.O.map(e=>(0,t.jsxs)("span",{children:[e," ",(0,t.jsx)("b",{children:N.counts[e]})]},e))}),N.rusty>0&&(0,t.jsxs)("p",{className:"mt-1 text-xs text-[#e0a64b]",children:[N.rusty," overdue: rust is creeping onto those cards."]})]}),(0,t.jsx)("section",{className:"panel flex flex-1 flex-col gap-2 p-3","aria-label":"Review card",children:null===f?(0,t.jsx)("p",{className:"m-auto text-sm text-white/70",children:"Loading your review..."}):0===f.length?(0,t.jsxs)("div",{className:"m-auto text-center",children:[(0,t.jsx)("h2",{className:"font-display text-lg",children:"All caught up"}),(0,t.jsx)("p",{className:"text-sm text-white/70",children:"Nothing is due. Come back tomorrow, or battle for new cards."}),(0,t.jsx)(r.default,{href:`/battle?deck=${F.id}`,className:"px-btn px-btn-primary mt-3 inline-block px-4 py-3",children:"Concept battle"})]}):D?(0,t.jsxs)("div",{className:"m-auto text-center",children:[(0,t.jsx)("h2",{className:"font-display text-lg text-[var(--accent-2)]",children:"Review done"}),(0,t.jsxs)("p",{className:"text-sm text-white/70",children:[S," of ",f.length," right. Misses come back in 10 minutes; correct cards return after 1, 3, then longer gaps."]}),(0,t.jsx)(r.default,{href:"/party",className:"px-btn px-btn-primary mt-3 inline-block px-4 py-3",children:"Pattern duel"})]}):q&&(0,t.jsxs)(t.Fragment,{children:[p&&d[(0,c.L)(p.srs[q.id],A)]&&(0,t.jsxs)("span",{className:"font-display text-xs text-[#e0a64b]",children:[d[(0,c.L)(p.srs[q.id],A)],": overdue"]}),(0,t.jsx)(n.a,{card:q,phase:x?"feedback":"answering",selected:v,result:x,counter:`${b+1} / ${f.length}`,nextLabel:b+1>=f.length?"Finish":"Next",onToggle:e=>{!x&&q&&w(t=>q.answer.length>1?t.includes(e)?t.filter(t=>t!==e):[...t,e]:[e])},onSubmit:T,onNext:()=>{w([]),k(null),y(e=>e+1)}})]})})]})}])},93423,93078,e=>{var t=e.i(70073),r=e.i(94448),a=e.i(60517);let n=[{id:"sb-mcq-ad-intent",kind:"mcq",topic:"L4.adapter",level:1,prompt:"What problem does the Adapter pattern solve?",options:["An existing class has the behaviour you need but the wrong interface, so a wrapper translates it to the interface your code expects","It lets an object change behaviour when its internal state changes","It guarantees only one instance of a class exists","It lets many objects share one copy of common data"],answer:[0],explain:"Adapter changes the shape of an interface, not the behaviour behind it. It is the tool for third-party or legacy code you cannot edit. State, Singleton and Flyweight solve unrelated problems."},{id:"sb-pat-ad-sdk",kind:"pattern",topic:"L4.adapter",level:1,prompt:"Your app talks to a `PaymentGateway` interface. A vendor SDK offers `charge(cents, currencyCode)` with different names and types, and you cannot change it. Which Patternling fits?",options:["Axolink (Adapter)","Flytile (Flyweight)","Facadeon (Facade)","Shellcrab (Decorator)"],answer:[0],explain:"You have one target interface and one incompatible class: Adapter. A Facade would simplify a whole subsystem behind a new interface of its own choosing, and a Decorator keeps the interface the same while adding behaviour."},{id:"sb-pred-ad-temp",kind:"predict",topic:"L4.adapter",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
};`,options:["Caching and remote access are tangled in one class; Single Responsibility (a caching Proxy over a plain client would separate them)","A fat interface; Interface Segregation","A subclass breaking its base contract; Liskov Substitution","An unnecessary abstract class; Open/Closed"],answer:[0],explain:"The client both talks to the network and manages cache policy (expiry is missing too). A CachingWeather proxy implementing the same Weather interface keeps each concern testable, and the cache can be added, removed or swapped without touching the HTTP code."},{id:"sb-mcq-px-kinds",kind:"mcq",topic:"L4.proxy",level:2,prompt:"Which of these is a protection proxy rather than a virtual, caching or remote proxy?",options:["A wrapper that checks the caller's role before forwarding a delete request","A wrapper that loads a large file on first access","A local stub that serialises calls and sends them to a server","A wrapper that remembers the result of an expensive call"],answer:[0],explain:"Access control is the protection proxy's job. The others are, in order, a virtual proxy, a remote proxy and a caching proxy. Naming the kind in an interview shows you are choosing the pattern, not reciting it."},{id:"sb-mcq-x-wrapper-pick",kind:"mcq",topic:"L4.compare",level:3,prompt:"You wrap an object with the same interface and forward calls. Which question best chooses between Decorator, Proxy and Adapter?",options:["Do I change the interface (Adapter), add behaviour the caller opts into (Decorator), or control access to the subject (Proxy)?","Which one has the fewest lines of code?","Which one is mentioned first in the GoF book?","Whether the class has a virtual destructor"],answer:[0],explain:"All three are wrappers, which is why interviews love this question. Answer with the axis that distinguishes them: interface change, added responsibility or access control. Then give one concrete example of each."},{id:"sb-mcq-x-over-engineer",kind:"mcq",topic:"L4.compare",level:3,prompt:"In a 45-minute machine-coding round you need to add logging to one service call. What is the pragmatic choice?",options:["Add the log line directly or one small decorator if several services need it; do not build a framework of wrappers for one call site","Create a Decorator, Proxy and Facade hierarchy to show you know patterns","Rewrite the service as a Composite","Skip logging; interviewers never care"],answer:[0],explain:"Patterns exist to remove a real pain. One call site has no pain. Strong candidates say what they would extract once a second use appears, and keep the first version obvious. Over-application is a common SDE II to Senior differentiator in feedback."},{id:"sb-pat-x-ui-tree",kind:"pattern",topic:"L4.compare",level:2,prompt:"A UI toolkit lets a Panel contain Buttons and other Panels, and calling render() on the root draws everything. Which Patternling fits?",options:["Fractree (Composite)","Facadeon (Facade)","Bridgeback (Bridge)","Flytile (Flyweight)"],answer:[0],explain:"A panel holds children of the same Widget interface and renders them recursively: Composite. If many buttons shared one icon bitmap you might add Flyweight on top, but the container structure is Composite."}],s=[{id:"old-town",title:"Old Town",district:"Foundations: classes, polymorphism, composition",cards:t.f,scene:"old-town"},{id:"solid-square",title:"SOLID Square",district:"SRP, OCP, LSP, ISP, DIP and the supporting heuristics",cards:r.f,scene:"solid-square"},{id:"creational-foundry",title:"Creational Foundry",district:"Factory Method, Abstract Factory, Builder, Prototype, Singleton, pools and DI",cards:a.f,scene:"foundry"},{id:"structural-bridges",title:"Structural Bridges",district:"Adapter, Bridge, Composite, Decorator, Facade, Flyweight and Proxy",cards:n,scene:"bridges"}];function i(e){return s.find(t=>t.id===e)??s.find(e=>"old-town"===e.id)}e.s(["Z",0,s,"r",0,function(e){return i(new URLSearchParams(e).get("deck")).id},"N",0,i],93423),e.s(["O",0,["unseen","seen","learning","practiced","mastered","ingrained"],"D",0,function(e,t,r,a={max:10,maxNew:4}){return[...t.filter(t=>e[t]&&e[t].due<=r).sort((t,r)=>e[t].due-e[r].due),...t.filter(t=>!e[t]).slice(0,a.maxNew)].slice(0,a.max)},"H",0,function(e){return e?0===e.reps?"seen":e.intervalDays>=60?"ingrained":e.intervalDays>=21?"mastered":e.reps>=3?"practiced":"learning":"unseen"},"w",0,function(e,t,r,a,n=!1){e[t]=function(e,t,r,a=!1){let n=e??{due:r,intervalDays:0,ease:2.3,reps:0,lapses:0};if(!t)return{due:r+6e5,intervalDays:0,ease:Math.max(1.3,+(n.ease-.2).toFixed(2)),reps:0,lapses:n.lapses+1};if(a)return{...n};let s=n.reps+1,i=1===s?1:2===s?3:Math.max(n.intervalDays+1,Math.round(n.intervalDays*n.ease));return{due:r+864e5*i,intervalDays:i,ease:Math.min(2.8,+(n.ease+.05).toFixed(2)),reps:s,lapses:n.lapses}}(e[t],r,a,n)},"L",0,function(e,t){if(!e||0===e.reps||t<=e.due)return 0;let r=(t-e.due)/(864e5*Math.max(1,e.intervalDays));return r>=1?2:+(r>=.25)}],93078)},91162,45226,e=>{function t(e){return e.singletonOveruse>=3}let r=["chamelstrat","solo","forgebot"],a=()=>({...{owned:[],mastery:{},singletonOveruse:0},owned:[...r]});function n(e){return"object"==typeof e&&null!==e&&!(!Array.isArray(e.owned)||!e.owned.every(e=>"string"==typeof e)||"number"!=typeof e.singletonOveruse||!Number.isFinite(e.singletonOveruse)||"object"!=typeof e.mastery||null===e.mastery||Array.isArray(e.mastery))&&Object.values(e.mastery).every(e=>"number"==typeof e&&Number.isFinite(e))}function s(e){return{version:2,createdAt:e,updatedAt:e,player:{name:"Apprentice"},badges:[],lessonsDone:[],workshop:{},srs:{},party:a(),settings:{audio:!0,reducedMotion:!1}}}e.s(["A",0,function(e,r){return t(e)&&"super"!==r.effectiveness?.8*r.multiplier:r.multiplier},"n",0,t,"N",0,n,"k",0,function(e){let t=1,r=10,a=Math.max(0,e);for(;t<30&&a>=r;)a-=r,t+=1,r+=10;return t},"e",0,function(e,t,r){let a="super"===r.effectiveness?3:+("neutral"===r.effectiveness),n={...e.mastery,[t]:(e.mastery[t]??0)+a},s=e.singletonOveruse;return"solo"===t&&"super"!==r.effectiveness?s+=1:"super"===r.effectiveness&&(s=Math.max(0,s-1)),{...e,mastery:n,singletonOveruse:s}},"s",0,function(e,t){return e.owned.includes(t)?e:{...e,owned:[...e.owned,t]}},"E",0,e=>e>=20?3:e>=10?2:1,"c",0,a],45226);let i=e=>"object"==typeof e&&null!==e&&!Array.isArray(e),o=e=>"number"==typeof e&&Number.isFinite(e),l=e=>Array.isArray(e)&&e.every(e=>"string"==typeof e),c=[{from:1,up:e=>({...e,party:a()})}],d="save",p="slot1";function u(e,t){return new Promise((r,a)=>{let n=indexedDB.open("blueprint-clash-save",1);n.onupgradeneeded=()=>n.result.createObjectStore(d),n.onerror=()=>a(n.error),n.onsuccess=()=>{let s=n.result,i=t(s.transaction(d,e).objectStore(d));i.onsuccess=()=>{s.close(),r(i.result)},i.onerror=()=>{s.close(),a(i.error)}}})}async function h(e,t){let r;try{r=await e.read()}catch{return{data:s(t),warning:"storage unavailable; progress will not persist"}}if(null===r)return{data:s(t)};let a=function(e,t=c,r=2){if("object"!=typeof e||null===e||Array.isArray(e))return{ok:!1,error:"save is not an object"};let a=e,n=a.version;if("number"!=typeof n||!Number.isInteger(n)||n<1)return{ok:!1,error:"save has no valid version"};if(n>r)return{ok:!1,error:`save is from a newer version (${n}); update the game first`};for(;n<r;){let e=t.find(e=>e.from===n);if(!e)return{ok:!1,error:`no migration from version ${n}`};a={...e.up(a),version:n+1},n+=1}return{ok:!0,data:a}}(r);if(!a.ok)return{data:s(t),warning:a.error};let d=function(e){let t=[];if(!i(e))return["save is not an object"];if(2!==e.version&&t.push("version must be 2"),o(e.createdAt)||t.push("createdAt must be a number"),o(e.updatedAt)||t.push("updatedAt must be a number"),i(e.player)&&"string"==typeof e.player.name||t.push("player.name must be a string"),l(e.badges)||t.push("badges must be a string array"),l(e.lessonsDone)||t.push("lessonsDone must be a string array"),i(e.workshop))for(let[r,a]of Object.entries(e.workshop))i(a)&&o(a.bestPhase)&&o(a.bestScore)&&o(a.attempts)||t.push(`workshop.${r} is malformed`);else t.push("workshop must be an object");if(i(e.srs))for(let[r,a]of Object.entries(e.srs))i(a)&&o(a.due)&&o(a.intervalDays)&&o(a.ease)&&o(a.reps)&&o(a.lapses)||t.push(`srs.${r} is malformed`);else t.push("srs must be an object");return n(e.party)||t.push("party is malformed"),i(e.settings)&&"boolean"==typeof e.settings.audio&&"boolean"==typeof e.settings.reducedMotion||t.push("settings is malformed"),t}(a.data);return d.length?{data:s(t),warning:`stored save is invalid: ${d[0]}`}:{data:a.data}}async function m(e,t,r,a){let n=structuredClone(t);return r(n),n.updatedAt=a,await e.write(n),n}e.s(["a",0,function(){return{read:async()=>await u("readonly",e=>e.get(p))??null,write:async e=>{await u("readwrite",t=>t.put(e,p))},clear:async()=>{await u("readwrite",e=>e.delete(p))}}},"o",0,h,"R",0,function(e){let t=e??null;return{read:async()=>null===t?null:structuredClone(t),async write(e){t=structuredClone(e)},async clear(){t=null}}},"S",0,m],91162)},22016,(e,t,r)=>{e.i(47167),Object.defineProperty(r,"__esModule",{value:!0});var a={default:function(){return b},useLinkStatus:function(){return v}};for(var n in a)Object.defineProperty(r,n,{enumerable:!0,get:a[n]});let s=e.r(90809),i=e.r(43476),o=s._(e.r(71645)),l=e.r(95057),c=e.r(8372),d=e.r(18581),p=e.r(18967),u=e.r(5550),h=e.r(88540),m=e.r(91949),f=e.r(73668),g=e.r(9396);function b(t){var r;let a,n,s,[b,v]=(0,o.useOptimistic)(m.IDLE_LINK_STATUS),w=(0,o.useRef)(null),{href:x,as:k,children:S,prefetch:_=null,passHref:A,replace:j,shallow:C,scroll:P,onClick:F,onMouseEnter:L,onTouchStart:q,legacyBehavior:T=!1,onNavigate:N,transitionTypes:D,ref:I,unstable_dynamicOnHover:R,...W}=t;a=S,T&&("string"==typeof a||"number"==typeof a)&&(a=(0,i.jsx)("a",{children:a}));let O=o.default.useContext(c.AppRouterContext),B=!1!==_,E=!1===_?"none":!0===_?"full":"auto",M="none"!==E?"auto"===E?g.FetchStrategy.PPR:g.FetchStrategy.Full:g.FetchStrategy.PPR,z="string"==typeof(r=k||x)?r:(0,l.formatUrl)(r);if(T){if(a?.$$typeof===Symbol.for("react.lazy"))throw Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag.");n=o.default.Children.only(a)}let $=T?n&&"object"==typeof n&&n.ref:I,U,V=o.default.useCallback(e=>(null!==O&&(w.current=(0,m.mountLinkInstance)(e,z,O,M,B,v,U)),()=>{w.current&&((0,m.unmountLinkForCurrentNavigation)(w.current),w.current=null),(0,m.unmountPrefetchableInstance)(e)}),[B,z,O,M,v,U]),K={ref:(0,d.useMergedRef)(V,$),onClick(t){T||"function"!=typeof F||F(t),T&&n.props&&"function"==typeof n.props.onClick&&n.props.onClick(t),!O||t.defaultPrevented||function(t,r,a,n,s,i,o,l="none"){if("u">typeof window){let c,{nodeName:d}=t.currentTarget;if("A"===d.toUpperCase()&&((c=t.currentTarget.getAttribute("target"))&&"_self"!==c||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,f.isLocalURL)(r)){n&&(t.preventDefault(),location.replace(r));return}if(t.preventDefault(),i){let e=!1;if(i({preventDefault:()=>{e=!0}}),e)return}let{navigate:p}=e.r(32916);p(r,n?"replace":"push",!1===s?h.ScrollBehavior.NoScroll:h.ScrollBehavior.Default,a.current,o,l)}}(t,z,w,j,P,N,D,E)},onMouseEnter(e){T||"function"!=typeof L||L(e),T&&n.props&&"function"==typeof n.props.onMouseEnter&&n.props.onMouseEnter(e),O&&B&&(0,m.onNavigationIntent)(e.currentTarget,!0===R)},onTouchStart:function(e){T||"function"!=typeof q||q(e),T&&n.props&&"function"==typeof n.props.onTouchStart&&n.props.onTouchStart(e),O&&B&&(0,m.onNavigationIntent)(e.currentTarget,!0===R)}};return(0,p.isAbsoluteUrl)(z)?K.href=z:T&&!A&&("a"!==n.type||"href"in n.props)||(K.href=(0,u.addBasePath)(z)),s=T?o.default.cloneElement(n,K):(0,i.jsx)("a",{...W,...K,children:a}),(0,i.jsx)(y.Provider,{value:b,children:s})}let y=(0,o.createContext)(m.IDLE_LINK_STATUS),v=()=>(0,o.useContext)(y);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},18581,(e,t,r)=>{Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return n}});let a=e.r(71645);function n(e,t){let r=(0,a.useRef)(null),n=(0,a.useRef)(null);return(0,a.useCallback)(a=>{if(null===a){let e=r.current;e&&(r.current=null,e());let t=n.current;t&&(n.current=null,t())}else e&&(r.current=s(e,a)),t&&(n.current=s(t,a))},[e,t])}function s(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},95057,(e,t,r)=>{e.i(47167),Object.defineProperty(r,"__esModule",{value:!0});var a={formatUrl:function(){return o},formatWithValidation:function(){return c},urlObjectKeys:function(){return l}};for(var n in a)Object.defineProperty(r,n,{enumerable:!0,get:a[n]});let s=e.r(90809)._(e.r(98183)),i=/https?|ftp|gopher|file/;function o(e){let{auth:t,hostname:r}=e,a=e.protocol||"",n=e.pathname||"",o=e.hash||"",l=e.query||"",c=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?c=t+e.host:r&&(c=t+(~r.indexOf(":")?`[${r}]`:r),e.port&&(c+=":"+e.port)),l&&"object"==typeof l&&(l=String(s.urlQueryToSearchParams(l)));let d=e.search||l&&`?${l}`||"";return a&&!a.endsWith(":")&&(a+=":"),e.slashes||(!a||i.test(a))&&!1!==c?(c="//"+(c||""),n&&"/"!==n[0]&&(n="/"+n)):c||(c=""),o&&"#"!==o[0]&&(o="#"+o),d&&"?"!==d[0]&&(d="?"+d),n=n.replace(/[?#]/g,encodeURIComponent),d=d.replace("#","%23"),`${a}${c}${n}${d}${o}`}let l=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function c(e){return o(e)}},73668,(e,t,r)=>{Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isLocalURL",{enumerable:!0,get:function(){return s}});let a=e.r(18967),n=e.r(52817);function s(e){if(!(0,a.isAbsoluteUrl)(e))return!0;try{let t=(0,a.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,n.hasBasePath)(r.pathname)}catch(e){return!1}}},18967,(e,t,r)=>{e.i(47167),Object.defineProperty(r,"__esModule",{value:!0});var a={DecodeError:function(){return b},MiddlewareNotFoundError:function(){return x},MissingStaticPage:function(){return w},NormalizeError:function(){return y},PageNotFoundError:function(){return v},SP:function(){return f},ST:function(){return g},WEB_VITALS:function(){return s},execOnce:function(){return i},getDisplayName:function(){return p},getLocationOrigin:function(){return c},getURL:function(){return d},isAbsoluteUrl:function(){return l},isResSent:function(){return u},loadGetInitialProps:function(){return m},normalizeRepeatedSlashes:function(){return h},stringifyError:function(){return k}};for(var n in a)Object.defineProperty(r,n,{enumerable:!0,get:a[n]});let s=["CLS","FCP","INP","LCP","TTFB"];function i(e){let t,r=!1;return(...a)=>(r||(r=!0,t=e(...a)),t)}let o=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,l=e=>{let t=e.charCodeAt(0);return!!(t>=65&&t<=90||t>=97&&t<=122)&&o.test(e)};function c(){let{protocol:e,hostname:t,port:r}=window.location;return`${e}//${t}${r?":"+r:""}`}function d(){let{href:e}=window.location,t=c();return e.substring(t.length)}function p(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function u(e){return e.finished||e.headersSent}function h(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?`?${t.slice(1).join("?")}`:"")}async function m(e,t){let r=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await m(t.Component,t.ctx)}:{};let a=await e.getInitialProps(t);if(r&&u(r))return a;if(!a)throw Error(`"${p(e)}.getInitialProps()" should resolve to an object. But found "${a}" instead.`);return a}let f="u">typeof performance,g=f&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class b extends Error{}class y extends Error{}class v extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class w extends Error{constructor(e,t){super(),this.message=`Failed to load static file for page: ${e} ${t}`}}class x extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function k(e){return JSON.stringify({message:e.message,stack:e.stack})}}])})();