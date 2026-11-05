(()=>{"use strict";(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,6706,e=>{var t=e.i(43476),a=e.i(71645),i=e.i(93423),r=e.i(34052);let n=[{id:"sable-quill",name:"Sable Quill",deckId:"solid-square",topics:["L2.srp","L2.cohesion","L2.ocp","L2.kiss","L2.dry"],cardCount:6,foeName:"SABLE'S DRAFT",intro:"Sable Quill wants to know what you do when a class has three reasons to change.",win:"Sable nods. Reasons to change, not method count: you have it.",lose:"Sable slides a red pen across. Read the explanations, then come back."},{id:"rook-ferris",name:"Rook Ferris",deckId:"solid-square",topics:["L2.dip","L2.isp","L2.lsp","L2.coupling"],cardCount:6,foeName:"ROOK'S DRAFT",intro:"Rook Ferris plugs in a fake clock and asks which way the arrows should point.",win:"Rook grins. The policy owns the interface; the detail plugs in.",lose:"Rook shrugs and resets the fake clock. Study the misses and rematch."},{id:"dova-kiln",name:"Dova Kiln",deckId:"creational-foundry",topics:["L3.factory-method","L3.abstract-factory","L3.builder"],cardCount:6,foeName:"DOVA'S MOLD",intro:"Dova Kiln has a line that must make three kinds of widget and a manager who will add a fourth next month.",win:"Dova hangs up her gloves. Callers ask for a thing, one place decides which: well cast.",lose:"Dova scrapes the mould clean. Re-read the explanations, then pour again."},{id:"bram-cask",name:"Bram Cask",deckId:"creational-foundry",topics:["L3.prototype","L3.singleton","L3.object-pool","L3.di"],cardCount:6,foeName:"BRAM'S CASK",intro:"Bram Cask counts buffers out of a barrel and wants to know who owns what, and how many there should be.",win:"Bram taps the barrel twice. One owner, one lifetime, injected: nicely done.",lose:"Bram rolls the barrel back to you. Study the misses and rematch."},{id:"nerys-quay",name:"Nerys Quay",deckId:"structural-bridges",topics:["L4.adapter","L4.facade","L4.proxy"],cardCount:6,foeName:"NERYS'S GATE",intro:"Nerys Quay runs the harbour gate: every ship speaks a different dialect and only some are allowed in.",win:"Nerys stamps your pass. Translate at the edge, hide the tangle, guard behind the same face: well done.",lose:"Nerys keeps the gate shut. Read the explanations, then come back to the quay."},{id:"tobin-reef",name:"Tobin Reef",deckId:"structural-bridges",topics:["L4.composite","L4.decorator","L4.bridge","L4.flyweight"],cardCount:6,foeName:"TOBIN'S REEF",intro:"Tobin Reef stacks crates, wraps cargo and counts how many identical labels the harbour really needs.",win:"Tobin tips his cap. Trees of parts, layers by choice, two axes apart, shared state shared: good.",lose:"Tobin points at the tide table. Study the misses and rematch."}],s=e=>`duel:${e.id}`;function o(e){return n.find(t=>t.id===e)}let l={...r.R,foeHp:36};var c=e.i(47268),d=e.i(48319),u=e.i(37727),h=e.i(40942),p=e.i(24298),m=e.i(50395),f=e.i(91162),g=e.i(93078);function y({deckId:e,trainerId:n}){let b=(0,i.N)(e),w=o(n),[v]=(0,a.useState)(()=>{var e;let t,a,r;return w?(e=Math.floor(997*Math.random()),t=new Set(w.topics),r=0===(a=(0,i.N)(w.deckId).cards.filter(e=>t.has(e.topic))).length?0:e%a.length,[...a.slice(r),...a.slice(0,r)].slice(0,w.cardCount)):b.cards}),x=(0,a.useRef)(null),k=(0,a.useRef)(null),[S,_]=(0,a.useState)(()=>w?(0,r.f)(v,1,{...l}):(0,r.f)(v,1)),[A,C]=(0,a.useState)("intro"),[T,I]=(0,a.useState)([]),[q,L]=(0,a.useState)(null),[F,j]=(0,a.useState)(null),[D,R]=(0,a.useState)(!1);(0,a.useEffect)(()=>((0,m.N)("old-town"),()=>(0,m.a)()),[]),(0,a.useEffect)(()=>{let e=new c.T(x.current,d.f,u.f,b.scene);return k.current=e,e.init().then(()=>e.intro()).then(()=>{R(!0),C("answering")}),()=>{e.destroy(),k.current=null}},[]);let P=("resolving"===A||"feedback"===A?F:(0,r.m)(S))??void 0,M=!!P&&P.answer.length>1,N=(0,a.useCallback)(e=>{"answering"===A&&I(t=>M?t.includes(e)?t.filter(t=>t!==e):[...t,e]:[e])},[A,M]),W=(0,a.useCallback)(async()=>{if("answering"!==A||0===T.length)return;let{state:e,result:t}=(0,r.r)(S,T);j((0,r.m)(S)??null),C("resolving"),L(t),_(e),t.correct?m.$.correct():m.$.wrong();let a=k.current;a&&(t.correct?await a.playerStrike(t.damageToFoe):await a.foeStrike(t.damageToPlayer),"won"===e.status?await a.faint("foe"):"lost"===e.status&&await a.faint("player"),"won"===e.status?m.$.victory():"lost"===e.status&&m.$.defeat(),await a.beat()),C("feedback")},[A,T,S]),E=(0,a.useCallback)(()=>{"feedback"===A&&(I([]),L(null),C("asking"===S.status?"answering":"over"))},[A,S.status]);(0,a.useEffect)(()=>{let e=e=>{e.key>="1"&&e.key<="9"?N(Number(e.key)-1):"Enter"===e.key&&(e.preventDefault(),"answering"===A?W():"feedback"===A&&E())};return window.addEventListener("keydown",e),()=>window.removeEventListener("keydown",e)},[N,W,E,A]);let O=(0,a.useRef)(!1);(0,a.useEffect)(()=>{"over"!==A||O.current||0===S.missed.length||(O.current=!0,(async()=>{try{let e=(0,f.a)(),{data:t,warning:a}=await (0,f.o)(e,Date.now());if(a)return;await (0,f.S)(e,t,e=>S.missed.forEach(t=>(0,g.w)(e.srs,t,!1,Date.now())),Date.now())}catch{}})())},[A,S.missed]);let B=(0,a.useRef)(!1);(0,a.useEffect)(()=>{w&&"over"===A&&"won"===S.status&&!B.current&&(B.current=!0,(async()=>{try{let e=(0,f.a)(),{data:t,warning:a}=await (0,f.o)(e,Date.now());if(a)return;await (0,f.S)(e,t,e=>{e.lessonsDone.includes(s(w))||e.lessonsDone.push(s(w))},Date.now())}catch{}})())},[A,S.status,w]);let z=v.length,V=(0,r.x)(S);return(0,t.jsxs)("main",{className:"fixed inset-0 flex flex-col bg-[var(--bg)] md:flex-row",children:[(0,t.jsxs)("section",{className:"flex min-h-0 flex-[0_0_36%] flex-col md:flex-[1_1_55%]",children:[(0,t.jsxs)("div",{className:"flex items-end gap-3 px-3 pt-2",children:[(0,t.jsx)(p.e,{label:w?w.foeName:u.f.name,hp:S.foeHp,max:S.config.foeHp,tone:"#e0524b"}),(0,t.jsx)(h.f,{}),(0,t.jsx)(p.e,{label:`DRAFTLING${S.streak>=2?` \xd7${S.streak}`:""}`,hp:S.playerHp,max:S.config.playerHp,tone:"#4bd37b"})]}),(0,t.jsx)("div",{ref:x,className:"relative min-h-0 flex-1","aria-label":"Battle stage"})]}),(0,t.jsx)("section",{className:"panel m-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 md:m-3 md:max-w-xl md:flex-[1_1_45%]","aria-label":"Card",children:"over"===A?(0,t.jsxs)("div",{className:"flex flex-1 flex-col items-center justify-center gap-3 text-center",children:[(0,t.jsx)("h1",{className:"font-display text-3xl text-[var(--accent-2)]",children:"won"===S.status?"VICTORY!":"DEFEATED"}),(0,t.jsxs)("div",{className:"text-4xl","aria-label":`${V} of 3 stars`,children:["★".repeat(V),(0,t.jsx)("span",{className:"text-white/20",children:"★".repeat(3-V)})]}),w&&(0,t.jsx)("p",{className:"text-sm text-[var(--accent-2)]",children:"won"===S.status?w.win:w.lose}),(0,t.jsxs)("p",{className:"text-sm text-white/70",children:[S.answered," cards answered, ",S.missed.length," missed.",S.missed.length>0&&" Missed cards return in the Daily Review."]}),(0,t.jsxs)("div",{className:"flex gap-2",children:[(0,t.jsx)("button",{className:"px-btn px-btn-primary px-4 py-3",onClick:()=>{window.location.reload()},children:"Rematch"}),(0,t.jsx)("a",{href:"../play/",className:"px-btn px-4 py-3",children:"Back to town"})]})]}):D&&P?(0,t.jsx)(t.Fragment,{children:(0,t.jsx)(p.a,{card:P,phase:A,selected:T,result:q,counter:`${Math.min(S.answered+1,z)} \xb7 ${S.queue.length} left`,nextLabel:"asking"===S.status?"Next card":"Finish",onToggle:N,onSubmit:()=>void W(),onNext:E})}):(0,t.jsxs)("p",{className:"font-display m-auto text-center text-[var(--accent-2)]",children:[w?`${w.name} challenges you!`:"A wild ROUGH DRAFT appears!",(0,t.jsx)("span",{className:"mt-1 block text-xs text-white/60",children:w?w.intro:`${b.title} deck`})]})})]})}let b=()=>()=>{},w=()=>window.location.search,v=()=>null;e.s(["BattleEntry",0,function(){let e=(0,a.useSyncExternalStore)(b,w,v);if(null===e)return(0,t.jsx)("main",{className:"fixed inset-0 bg-[var(--bg)]"});let r=o(new URLSearchParams(e).get("trainer"));return(0,t.jsx)(y,{deckId:r?r.deckId:(0,i.r)(e),trainerId:r?.id})}],6706)},40942,e=>{var t=e.i(43476),a=e.i(71645),i=e.i(37417),r=e.i(50395);let n=i.z;e.s(["f",0,function(){let e=(0,a.useSyncExternalStore)(r.A,r.Z,()=>n);(0,a.useEffect)(()=>{let e=()=>r.$.unlock();return window.addEventListener("pointerdown",e,{once:!0}),window.addEventListener("keydown",e,{once:!0}),()=>{window.removeEventListener("pointerdown",e),window.removeEventListener("keydown",e)}},[]);let i=!e.music&&!e.sfx;return(0,t.jsx)("button",{type:"button",className:"px-btn flex h-11 w-11 shrink-0 items-center justify-center p-0 text-lg","aria-label":i?"Unmute sound":"Mute sound","aria-pressed":i,title:i?"Sound off":"Sound on",onClick:()=>{(0,r.y)(i),(0,r.c)(i),i&&r.$.click()},children:(0,t.jsx)("span",{"aria-hidden":!0,children:i?"🔇":"🔊"})})}])},93423,93078,e=>{var t=e.i(70073),a=e.i(94448),i=e.i(60517);let r=[{id:"sb-mcq-ad-intent",kind:"mcq",topic:"L4.adapter",level:1,prompt:"What problem does the Adapter pattern solve?",options:["An existing class has the behaviour you need but the wrong interface, so a wrapper translates it to the interface your code expects","It lets an object change behaviour when its internal state changes","It guarantees only one instance of a class exists","It lets many objects share one copy of common data"],answer:[0],explain:"Adapter changes the shape of an interface, not the behaviour behind it. It is the tool for third-party or legacy code you cannot edit. State, Singleton and Flyweight solve unrelated problems."},{id:"sb-pat-ad-sdk",kind:"pattern",topic:"L4.adapter",level:1,prompt:"Your app talks to a `PaymentGateway` interface. A vendor SDK offers `charge(cents, currencyCode)` with different names and types, and you cannot change it. Which Patternling fits?",options:["Axolink (Adapter)","Flytile (Flyweight)","Facadeon (Facade)","Shellcrab (Decorator)"],answer:[0],explain:"You have one target interface and one incompatible class: Adapter. A Facade would simplify a whole subsystem behind a new interface of its own choosing, and a Decorator keeps the interface the same while adding behaviour."},{id:"sb-pred-ad-temp",kind:"predict",topic:"L4.adapter",level:2,prompt:"What does this program print?",code:`#include <iostream>
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
};`,options:["Caching and remote access are tangled in one class; Single Responsibility (a caching Proxy over a plain client would separate them)","A fat interface; Interface Segregation","A subclass breaking its base contract; Liskov Substitution","An unnecessary abstract class; Open/Closed"],answer:[0],explain:"The client both talks to the network and manages cache policy (expiry is missing too). A CachingWeather proxy implementing the same Weather interface keeps each concern testable, and the cache can be added, removed or swapped without touching the HTTP code."},{id:"sb-mcq-px-kinds",kind:"mcq",topic:"L4.proxy",level:2,prompt:"Which of these is a protection proxy rather than a virtual, caching or remote proxy?",options:["A wrapper that checks the caller's role before forwarding a delete request","A wrapper that loads a large file on first access","A local stub that serialises calls and sends them to a server","A wrapper that remembers the result of an expensive call"],answer:[0],explain:"Access control is the protection proxy's job. The others are, in order, a virtual proxy, a remote proxy and a caching proxy. Naming the kind in an interview shows you are choosing the pattern, not reciting it."},{id:"sb-mcq-x-wrapper-pick",kind:"mcq",topic:"L4.compare",level:3,prompt:"You wrap an object with the same interface and forward calls. Which question best chooses between Decorator, Proxy and Adapter?",options:["Do I change the interface (Adapter), add behaviour the caller opts into (Decorator), or control access to the subject (Proxy)?","Which one has the fewest lines of code?","Which one is mentioned first in the GoF book?","Whether the class has a virtual destructor"],answer:[0],explain:"All three are wrappers, which is why interviews love this question. Answer with the axis that distinguishes them: interface change, added responsibility or access control. Then give one concrete example of each."},{id:"sb-mcq-x-over-engineer",kind:"mcq",topic:"L4.compare",level:3,prompt:"In a 45-minute machine-coding round you need to add logging to one service call. What is the pragmatic choice?",options:["Add the log line directly or one small decorator if several services need it; do not build a framework of wrappers for one call site","Create a Decorator, Proxy and Facade hierarchy to show you know patterns","Rewrite the service as a Composite","Skip logging; interviewers never care"],answer:[0],explain:"Patterns exist to remove a real pain. One call site has no pain. Strong candidates say what they would extract once a second use appears, and keep the first version obvious. Over-application is a common SDE II to Senior differentiator in feedback."},{id:"sb-pat-x-ui-tree",kind:"pattern",topic:"L4.compare",level:2,prompt:"A UI toolkit lets a Panel contain Buttons and other Panels, and calling render() on the root draws everything. Which Patternling fits?",options:["Fractree (Composite)","Facadeon (Facade)","Bridgeback (Bridge)","Flytile (Flyweight)"],answer:[0],explain:"A panel holds children of the same Widget interface and renders them recursively: Composite. If many buttons shared one icon bitmap you might add Flyweight on top, but the container structure is Composite."}],n=[{id:"old-town",title:"Old Town",district:"Foundations: classes, polymorphism, composition",cards:t.f,scene:"old-town"},{id:"solid-square",title:"SOLID Square",district:"SRP, OCP, LSP, ISP, DIP and the supporting heuristics",cards:a.f,scene:"solid-square"},{id:"creational-foundry",title:"Creational Foundry",district:"Factory Method, Abstract Factory, Builder, Prototype, Singleton, pools and DI",cards:i.f,scene:"foundry"},{id:"structural-bridges",title:"Structural Bridges",district:"Adapter, Bridge, Composite, Decorator, Facade, Flyweight and Proxy",cards:r,scene:"bridges"}];function s(e){return n.find(t=>t.id===e)??n.find(e=>"old-town"===e.id)}e.s(["Z",0,n,"r",0,function(e){return s(new URLSearchParams(e).get("deck")).id},"N",0,s],93423),e.s(["O",0,["unseen","seen","learning","practiced","mastered","ingrained"],"D",0,function(e,t,a,i={max:10,maxNew:4}){return[...t.filter(t=>e[t]&&e[t].due<=a).sort((t,a)=>e[t].due-e[a].due),...t.filter(t=>!e[t]).slice(0,i.maxNew)].slice(0,i.max)},"H",0,function(e){return e?0===e.reps?"seen":e.intervalDays>=60?"ingrained":e.intervalDays>=21?"mastered":e.reps>=3?"practiced":"learning":"unseen"},"w",0,function(e,t,a,i,r=!1){e[t]=function(e,t,a,i=!1){let r=e??{due:a,intervalDays:0,ease:2.3,reps:0,lapses:0};if(!t)return{due:a+6e5,intervalDays:0,ease:Math.max(1.3,+(r.ease-.2).toFixed(2)),reps:0,lapses:r.lapses+1};if(i)return{...r};let n=r.reps+1,s=1===n?1:2===n?3:Math.max(r.intervalDays+1,Math.round(r.intervalDays*r.ease));return{due:a+864e5*s,intervalDays:s,ease:Math.min(2.8,+(r.ease+.05).toFixed(2)),reps:n,lapses:r.lapses}}(e[t],a,i,r)},"L",0,function(e,t){if(!e||0===e.reps||t<=e.due)return 0;let a=(t-e.due)/(864e5*Math.max(1,e.intervalDays));return a>=1?2:+(a>=.25)}],93078)},50395,37417,e=>{function t(e){return 440*Math.pow(2,(e-69)/12)}let a={id:"old-town",bpm:96,rootMidi:60,scale:[0,2,4,7,9,12],bass:[0,-3,-7,-5],stepsPerBar:8,lead:[2,null,3,null,4,3,2,null,1,null,2,null,3,2,1,null,0,null,1,null,2,1,0,null,1,2,3,null,2,null,1,null]},i={id:"warden-fight",bpm:132,rootMidi:57,scale:[0,3,5,7,10,12],bass:[0,0,-4,-2],stepsPerBar:8,lead:[3,null,3,4,3,null,2,null,3,null,3,4,5,null,4,null,2,null,2,3,2,null,1,null,2,3,4,null,3,null,2,1]},r={[a.id]:a,[i.id]:i};function n(e){return 60/e.bpm/2}function s(e,t){let a=e.bass.length*e.stepsPerBar,i=(t%a+a)%a,r=Math.floor(i/e.stepsPerBar),n=i%e.stepsPerBar,s=e.bass[r],o=e.lead[i%e.lead.length]??null;return{bass:0===n||4===n?e.rootMidi-12+s:null,lead:null===o?null:e.rootMidi+12+s+e.scale[o],drum:4===n?2:+(n%2==0)}}let o={volume:.6,music:!0,sfx:!0};function l(e){if(!e)return{...o};try{let t=JSON.parse(e);return{volume:"number"==typeof t.volume&&Number.isFinite(t.volume)?Math.min(1,Math.max(0,t.volume)):o.volume,music:"boolean"==typeof t.music?t.music:o.music,sfx:"boolean"==typeof t.sfx?t.sfx:o.sfx}}catch{return{...o}}}e.s(["z",0,o,"_",0,r,"T",0,t,"c",0,l,"h",0,s,"$",0,n],37417);let c="blueprint-clash:audio",d=null,u=null,h=null,p=null,m={...o},f=!1,g=null,y=null,b=new Set;function w(){if(!f){f=!0;try{m=l(window.localStorage.getItem(c))}catch{m={...o}}}}function v(){if(!d){let e=window.AudioContext||window.webkitAudioContext;if(!e)return null;w(),(u=(d=new e).createGain()).gain.value=m.volume,u.connect(d.destination),(h=d.createGain()).gain.value=.22*!!m.music,h.connect(u);let t=(p=d.createBuffer(1,d.sampleRate,d.sampleRate)).getChannelData(0);for(let e=0;e<t.length;e++)t[e]=2*Math.random()-1}return"suspended"===d.state&&d.resume(),d}function x(){try{window.localStorage.setItem(c,JSON.stringify(m))}catch{}u&&(u.gain.value=m.volume),h&&(h.gain.value=.22*!!m.music),b.forEach(e=>e())}function k(e,t,a={}){let i=v();if(!i||!u)return;let r=i.currentTime+(a.delay??0),n=i.createOscillator(),s=i.createGain();n.type=a.type??"sine",n.frequency.setValueAtTime(e,r),a.slide&&n.frequency.exponentialRampToValueAtTime(Math.max(20,e*a.slide),r+t),s.gain.setValueAtTime(1e-4,r),s.gain.exponentialRampToValueAtTime(a.gain??.2,r+.01),s.gain.exponentialRampToValueAtTime(1e-4,r+t),n.connect(s).connect(a.dest??u),n.start(r),n.stop(r+t+.05)}function S(e,t={}){let a=v();if(!a||!u||!p)return;let i=a.currentTime+(t.delay??0),r=a.createBufferSource();r.buffer=p;let n=a.createBiquadFilter();n.type="bandpass",n.frequency.setValueAtTime(t.freq??1200,i),t.sweep&&n.frequency.exponentialRampToValueAtTime(t.sweep,i+e),n.Q.value=t.q??.8;let s=a.createGain();s.gain.setValueAtTime(t.gain??.3,i),s.gain.exponentialRampToValueAtTime(1e-4,i+e),r.connect(n).connect(s).connect(t.dest??u),r.start(i),r.stop(i+e+.05)}function _(e){return()=>{w(),m.sfx&&e()}}let A={unlock(){v()},click:_(()=>k(880,.06,{type:"square",gain:.05})),select:_(()=>k(1100,.04,{type:"square",gain:.035})),blip:_(()=>k(520+120*Math.random(),.03,{type:"square",gain:.02})),step:_(()=>S(.04,{gain:.03,freq:300})),correct:_(()=>{k(784,.1,{type:"triangle",gain:.1}),k(1175,.18,{type:"triangle",gain:.1,delay:.08})}),wrong:_(()=>{k(220,.14,{type:"square",gain:.08}),k(165,.22,{type:"square",gain:.08,delay:.12})}),hit:_(()=>{k(90,.35,{type:"sine",gain:.45,slide:.4}),S(.22,{gain:.3,freq:900,sweep:150}),k(1320,.12,{type:"triangle",gain:.06,slide:.6,delay:.02})}),hurt:_(()=>{k(160,.3,{type:"square",gain:.12,slide:.35}),S(.2,{gain:.25,freq:600,sweep:120})}),faint:_(()=>{k(330,.7,{type:"triangle",gain:.1,slide:.25}),S(.5,{gain:.08,freq:1500,sweep:200})}),victory:_(()=>{[523,659,784,1047].forEach((e,t)=>k(e,.4,{type:"triangle",gain:.12,delay:.12*t})),k(1047,1.2,{type:"sine",gain:.08,delay:.5})}),defeat:_(()=>{[392,330,262,196].forEach((e,t)=>k(e,.5,{type:"sawtooth",gain:.06,delay:.2*t}))}),judgePass:_(()=>{[659,784,988,1319].forEach((e,t)=>k(e,.2,{type:"square",gain:.05,delay:.07*t}))}),judgeFail:_(()=>{k(300,.15,{type:"sawtooth",gain:.06,slide:.7}),k(200,.3,{type:"sawtooth",gain:.06,slide:.6,delay:.14})}),badge:_(()=>{[523,659,784,1047,1319].forEach((e,t)=>k(e,.28,{type:"square",gain:.06,delay:.1*t})),k(1047,1.4,{type:"sine",gain:.08,delay:.55}),k(1568,1.4,{type:"sine",gain:.05,delay:.55})}),evolving:_(()=>{[392,440,494,554,622,698,784,880].forEach((e,t)=>k(e,.18,{type:"triangle",gain:.06,delay:.22*t}))}),evolved:_(()=>{[587,740,880,1175].forEach((e,t)=>k(e,.3,{type:"square",gain:.05,delay:.09*t})),k(880,1,{type:"sine",gain:.07,delay:.36}),k(1319,1,{type:"sine",gain:.05,delay:.36})})};function C(){g&&clearInterval(g),g=null}function T(e){let a=r[e];if(!a||(w(),y===e&&g)||(C(),y=e,!m.music))return;let i=v();if(!i||!h)return;let o=n(a),l=0,c=i.currentTime+.08,u=()=>{if(d&&h){if("running"!==d.state){c=d.currentTime+.08;return}for(;c<d.currentTime+.25;){let e=s(a,l),i=Math.max(0,c-d.currentTime);null!==e.bass&&k(t(e.bass),3.6*o,{type:"triangle",gain:.2,delay:i,dest:h}),null!==e.lead&&k(t(e.lead),1.6*o,{type:"square",gain:.05,delay:i,dest:h}),1===e.drum?S(.03,{gain:.04,freq:8e3,delay:i,dest:h}):2===e.drum&&S(.12,{gain:.1,freq:1800,delay:i,dest:h}),l++,c+=o}}};g=setInterval(u,60),u()}e.s(["Z",0,function(){return w(),m},"y",0,function(e){w(),m={...m,music:e},x(),e?y&&T(y):C()},"c",0,function(e){w(),m={...m,sfx:e},x()},"$",0,A,"N",0,T,"a",0,function(){C(),y=null},"A",0,function(e){return b.add(e),()=>b.delete(e)}],50395)},37727,e=>{var t=e.i(70968);let a=(0,e.i(71773).j)(t.f,"rough-draft","ROUGH DRAFT",150);e.s(["f",0,a])},71773,e=>{function t(e){let t=parseInt(e.slice(1),16);return[t>>16&255,t>>8&255,255&t]}e.s(["b",0,".","c",0,()=>[255,255,255],"w",0,function(e,a,i){let r=new Uint8ClampedArray(e.w*e.h*4),n=new Map;for(let[a,r]of Object.entries(e.palette))n.set(a,i?i(t(r)):t(r));for(let t=0;t<e.h;t++){let i=a[t];for(let a=0;a<e.w;a++){let s=n.get(i[a]);if(!s)continue;let o=(t*e.w+a)*4;r[o]=s[0],r[o+1]=s[1],r[o+2]=s[2],r[o+3]=255}}return r},"Y",0,t,"j",0,function(e,a,i,r){let n={};for(let[a,i]of Object.entries(e.palette)){let[e,s,o]=function([e,t,a],i){let[r,n,s]=[e/255,t/255,a/255],o=Math.max(r,n,s),l=Math.min(r,n,s),c=(o+l)/2,d=o-l;if(0===d)return[e,t,a];let u=d/(1-Math.abs(2*c-1)),h=o===r?(n-s)/d%6:o===n?(s-r)/d+2:(r-n)/d+4,p=(1-Math.abs(2*c-1))*u,m=p*(1-Math.abs((h=((60*h+i)%360+360)%360)/60%2-1)),f=c-p/2,[g,y,b]=h<60?[p,m,0]:h<120?[m,p,0]:h<180?[0,p,m]:h<240?[0,m,p]:h<300?[m,0,p]:[p,0,m];return[Math.round((g+f)*255),Math.round((y+f)*255),Math.round((b+f)*255)]}(t(i),r);n[a]=`#${(0x1000000|e<<16|s<<8|o).toString(16).slice(1)}`}return{...e,id:a,name:i,palette:n}}])},91162,45226,e=>{function t(e){return e.singletonOveruse>=3}let a=["chamelstrat","solo","forgebot"],i=()=>({...{owned:[],mastery:{},singletonOveruse:0},owned:[...a]});function r(e){return"object"==typeof e&&null!==e&&!(!Array.isArray(e.owned)||!e.owned.every(e=>"string"==typeof e)||"number"!=typeof e.singletonOveruse||!Number.isFinite(e.singletonOveruse)||"object"!=typeof e.mastery||null===e.mastery||Array.isArray(e.mastery))&&Object.values(e.mastery).every(e=>"number"==typeof e&&Number.isFinite(e))}function n(e){return{version:2,createdAt:e,updatedAt:e,player:{name:"Apprentice"},badges:[],lessonsDone:[],workshop:{},srs:{},party:i(),settings:{audio:!0,reducedMotion:!1}}}e.s(["A",0,function(e,a){return t(e)&&"super"!==a.effectiveness?.8*a.multiplier:a.multiplier},"n",0,t,"N",0,r,"k",0,function(e){let t=1,a=10,i=Math.max(0,e);for(;t<30&&i>=a;)i-=a,t+=1,a+=10;return t},"e",0,function(e,t,a){let i="super"===a.effectiveness?3:+("neutral"===a.effectiveness),r={...e.mastery,[t]:(e.mastery[t]??0)+i},n=e.singletonOveruse;return"solo"===t&&"super"!==a.effectiveness?n+=1:"super"===a.effectiveness&&(n=Math.max(0,n-1)),{...e,mastery:r,singletonOveruse:n}},"s",0,function(e,t){return e.owned.includes(t)?e:{...e,owned:[...e.owned,t]}},"E",0,e=>e>=20?3:e>=10?2:1,"c",0,i],45226);let s=e=>"object"==typeof e&&null!==e&&!Array.isArray(e),o=e=>"number"==typeof e&&Number.isFinite(e),l=e=>Array.isArray(e)&&e.every(e=>"string"==typeof e),c=[{from:1,up:e=>({...e,party:i()})}],d="save",u="slot1";function h(e,t){return new Promise((a,i)=>{let r=indexedDB.open("blueprint-clash-save",1);r.onupgradeneeded=()=>r.result.createObjectStore(d),r.onerror=()=>i(r.error),r.onsuccess=()=>{let n=r.result,s=t(n.transaction(d,e).objectStore(d));s.onsuccess=()=>{n.close(),a(s.result)},s.onerror=()=>{n.close(),i(s.error)}}})}async function p(e,t){let a;try{a=await e.read()}catch{return{data:n(t),warning:"storage unavailable; progress will not persist"}}if(null===a)return{data:n(t)};let i=function(e,t=c,a=2){if("object"!=typeof e||null===e||Array.isArray(e))return{ok:!1,error:"save is not an object"};let i=e,r=i.version;if("number"!=typeof r||!Number.isInteger(r)||r<1)return{ok:!1,error:"save has no valid version"};if(r>a)return{ok:!1,error:`save is from a newer version (${r}); update the game first`};for(;r<a;){let e=t.find(e=>e.from===r);if(!e)return{ok:!1,error:`no migration from version ${r}`};i={...e.up(i),version:r+1},r+=1}return{ok:!0,data:i}}(a);if(!i.ok)return{data:n(t),warning:i.error};let d=function(e){let t=[];if(!s(e))return["save is not an object"];if(2!==e.version&&t.push("version must be 2"),o(e.createdAt)||t.push("createdAt must be a number"),o(e.updatedAt)||t.push("updatedAt must be a number"),s(e.player)&&"string"==typeof e.player.name||t.push("player.name must be a string"),l(e.badges)||t.push("badges must be a string array"),l(e.lessonsDone)||t.push("lessonsDone must be a string array"),s(e.workshop))for(let[a,i]of Object.entries(e.workshop))s(i)&&o(i.bestPhase)&&o(i.bestScore)&&o(i.attempts)||t.push(`workshop.${a} is malformed`);else t.push("workshop must be an object");if(s(e.srs))for(let[a,i]of Object.entries(e.srs))s(i)&&o(i.due)&&o(i.intervalDays)&&o(i.ease)&&o(i.reps)&&o(i.lapses)||t.push(`srs.${a} is malformed`);else t.push("srs must be an object");return r(e.party)||t.push("party is malformed"),s(e.settings)&&"boolean"==typeof e.settings.audio&&"boolean"==typeof e.settings.reducedMotion||t.push("settings is malformed"),t}(i.data);return d.length?{data:n(t),warning:`stored save is invalid: ${d[0]}`}:{data:i.data}}async function m(e,t,a,i){let r=structuredClone(t);return a(r),r.updatedAt=i,await e.write(r),r}e.s(["a",0,function(){return{read:async()=>await h("readonly",e=>e.get(u))??null,write:async e=>{await h("readwrite",t=>t.put(e,u))},clear:async()=>{await h("readwrite",e=>e.delete(u))}}},"o",0,p,"R",0,function(e){let t=e??null;return{read:async()=>null===t?null:structuredClone(t),async write(e){t=structuredClone(e)},async clear(){t=null}}},"S",0,m],91162)},39936,85376,52910,e=>{let t,a;var i=e.i(47760);let r={extension:{type:i.x.Environment,name:"browser",priority:-1},test:()=>!0,load:async()=>{await e.A(86043)}},n={extension:{type:i.x.Environment,name:"webworker",priority:0},test:()=>"u">typeof self&&void 0!==self.WorkerGlobalScope,load:async()=>{await e.A(62925)}};e.i(10463),e.i(99650),e.i(58035),e.i(95932),i.H.add(r,n),e.s([],39936);var s=e.i(27402),o=e.i(2351);async function l(e={}){return void 0!==a?a:a=await (async()=>{let t=s.f.get().getNavigator().gpu;if(!t)return!1;try{let a=await t.requestAdapter(e);return await a.requestDevice(),!0}catch(e){return!1}})()}let c=["webgl","webgpu","canvas"];async function d(a){let i,r=[];a.preference?Array.isArray(a.preference)?r=a.preference.slice():(r.push(a.preference),c.forEach(e=>{e!==a.preference&&r.push(e)})):r=c.slice();let n={};for(let c=0;c<r.length;c++){let d=r[c];if("webgpu"===d&&await l()){let{WebGPURenderer:t}=await e.A(53088);i=t,n={...a,...a.webgpu};break}if("webgl"===d&&function(e){return void 0!==t?t:t=(()=>{let t={stencil:!0,failIfMajorPerformanceCaveat:e??o.f.defaultOptions.failIfMajorPerformanceCaveat};try{if(!s.f.get().getWebGLRenderingContext())return!1;let e=s.f.get().createCanvas().getContext("webgl",t),a=!!e?.getContextAttributes()?.stencil;if(e){let t=e.getExtension("WEBGL_lose_context");t&&t.loseContext()}return e=null,a}catch(e){return!1}})()}(a.failIfMajorPerformanceCaveat??o.f.defaultOptions.failIfMajorPerformanceCaveat)){let{WebGLRenderer:t}=await e.A(99331);i=t,n={...a,...a.webgl};break}if("canvas"===d){let{CanvasRenderer:t}=await e.A(35640);i=t,n={...a,...a.canvasOptions};break}}if(delete n.webgpu,delete n.webgl,delete n.canvasOptions,!i)throw Error("No available renderer for the current environment");let d=new i;return await d.init(n),d}var u=e.i(50147),h=e.i(81834),p=e.i(49864);class m{static init(e){Object.defineProperty(this,"resizeTo",{configurable:!0,set(e){globalThis.removeEventListener("resize",this.queueResize),this._resizeTo=e,e&&(globalThis.addEventListener("resize",this.queueResize),this.resize())},get(){return this._resizeTo}}),this.queueResize=()=>{this._resizeTo&&(this._cancelResize(),this._resizeId=requestAnimationFrame(()=>this.resize()))},this._cancelResize=()=>{this._resizeId&&(cancelAnimationFrame(this._resizeId),this._resizeId=null)},this.resize=()=>{let e,t;if(this._resizeTo){if(this._cancelResize(),this._resizeTo===globalThis.window)e=globalThis.innerWidth,t=globalThis.innerHeight;else{let{clientWidth:a,clientHeight:i}=this._resizeTo;e=a,t=i}this.renderer.resize(e,t),this.render()}},this._resizeId=null,this._resizeTo=null,this.resizeTo=e.resizeTo||null}static destroy(){globalThis.removeEventListener("resize",this.queueResize),this._cancelResize(),this._cancelResize=null,this.queueResize=null,this.resizeTo=null,this.resize=null}}m.extension=i.x.Application;var f=e.i(59750),g=e.i(6972);class y{static init(e){e=Object.assign({autoStart:!0,sharedTicker:!1},e),Object.defineProperty(this,"ticker",{configurable:!0,set(e){this._ticker&&this._ticker.remove(this.render,this),this._ticker=e,e&&e.add(this.render,this,f.f.LOW)},get(){return this._ticker}}),this.stop=()=>{this._ticker.stop()},this.start=()=>{this._ticker.start()},this._ticker=null,this.ticker=e.sharedTicker?g.f.shared:new g.f,e.autoStart&&this.start()}static destroy(){if(this._ticker){let e=this._ticker;this.ticker=null,e.destroy()}}}y.extension=i.x.Application,i.H.add(m),i.H.add(y);let b=class e{constructor(...e){this.stage=new u.t,void 0!==e[0]&&(0,p.K)(p.e,"Application constructor options are deprecated, please use Application.init() instead.")}async init(t){t={...t},this.stage||(this.stage=new u.t),this.renderer=await d(t),e._plugins.forEach(e=>{e.init.call(this,t)})}render(){this.renderer.render({container:this.stage})}get canvas(){return this.renderer.canvas}get view(){return(0,p.K)(p.e,"Application.view is deprecated, please use Application.canvas instead."),this.renderer.canvas}get screen(){return this.renderer.screen}get domContainerRoot(){return this.renderer.renderPipes.dom?._domElement}destroy(t=!1,a=!1){let i=e._plugins.slice(0);i.reverse(),i.forEach(e=>{e.destroy.call(this)}),this.stage.destroy(a),this.stage=null,this.renderer.destroy(t),this.renderer=null}};b._plugins=[],i.H.handleByList(i.x.Application,b._plugins),i.H.add(h.L),e.s(["f",0,b],85376);var w=u,v=e.i(40069),x=e.i(31320),k=e.i(71773);function S(e,t,a=!1){let i=document.createElement("canvas");i.width=e.w,i.height=e.h;let r=(0,k.w)(e,t,a?k.c:void 0);return i.getContext("2d").putImageData(new ImageData(r,e.w,e.h),0,0),i}let _=new Map;function A(e,t,a=!1){let i=`${e.id}/${t}/${a?"w":"c"}`,r=_.get(i);return r||(r=(e.anims[t]??e.anims.idle).map(t=>{let i=x.f.from(S(e,t,a));return i.source.scaleMode="nearest",i}),_.set(i,r)),r}class C extends w.t{def;sprite;flashSprite;anim;frame;acc;loop;hold;onDone;constructor(e,t=3){super(),this.def=e,this.anim="idle",this.frame=0,this.acc=0,this.loop=!0,this.hold=!1;let a=A(e,"idle");for(let i of(this.sprite=new v.f(a[0]),this.flashSprite=new v.f(A(e,"idle",!0)[0]),[this.sprite,this.flashSprite]))i.anchor.set(.5,1),i.scale.set(t),i.roundPixels=!0;this.flashSprite.alpha=0,this.addChild(this.sprite,this.flashSprite)}get flashAmount(){return this.flashSprite.alpha}set flashAmount(e){this.flashSprite.alpha=e}play(e,t="idle"===e,a=!1){return this.onDone?.(),this.anim=this.def.anims[e]?e:"idle",this.frame=0,this.acc=0,this.loop=t,this.hold=a,this.apply(),new Promise(e=>this.onDone=t?void 0:e)}update(e){let t=this.def.anims[this.anim],a=this.def.fps?.[this.anim]??4;for(this.acc+=e;this.acc>=1/a;)if(this.acc-=1/a,this.frame+1<t.length)this.frame++;else if(this.loop)this.frame=0;else if(this.hold){this.acc=0;let e=this.onDone;this.onDone=void 0,e?.();break}else{let e=this.onDone;this.onDone=void 0,this.anim="idle",this.frame=0,this.loop=!0,e?.()}this.apply()}apply(){this.sprite.texture=A(this.def,this.anim)[this.frame],this.flashSprite.texture=A(this.def,this.anim,!0)[this.frame]}}e.s(["_",0,C,"K",0,A,"O",0,S],52910)},68750,e=>{var t=e.i(94359),a=e.i(31320);let i={};e.s(["f",0,function(e,r,n){let s=0x811c9dc5;for(let t=0;t<r;t++)s^=e[t].uid,s=Math.imul(s,0x1000193)>>>0;return i[s]||function(e,r,n,s){let o={},l=0;for(let t=0;t<s;t++){let i=t<r?e[t]:a.f.EMPTY.source;o[l++]=i.source,o[l++]=i.style}let c=new t.f(o);return i[n]=c,c}(e,r,s,n)}])},61805,77718,e=>{let t;var a=e.i(57471),i=e.i(27402),r=e.i(56881);function n(e){let t=i.f.get().createCanvas(6,1),a=t.getContext("2d");return a.fillStyle=e,a.fillRect(0,0,6,1),t}function s(){if(void 0!==t)return t;try{let e=n("#ff00ff"),a=n("#ffff00"),r=i.f.get().createCanvas(6,1).getContext("2d");r.globalCompositeOperation="multiply",r.drawImage(e,0,0),r.drawImage(a,2,0);let s=r.getImageData(2,0,1,1);if(s){let e=s.data;t=255===e[0]&&0===e[1]&&0===e[2]}else t=!1}catch(e){t=!1}return t}e.s(["f",0,s],77718);let o={canvas:null,convertTintToImage:!1,cacheStepsPerColorChannel:8,canUseMultiply:s(),tintMethod:null,_canvasSourceCache:new WeakMap,_unpremultipliedCache:new WeakMap,getCanvasSource:e=>{let t=e.source,a=t?.resource;if(!a)return null;let r="premultiplied-alpha"===t.alphaMode,n=t.resourceWidth??t.pixelWidth,s=t.resourceHeight??t.pixelHeight,l=n!==t.pixelWidth||s!==t.pixelHeight;if(r){if((a instanceof HTMLCanvasElement||"u">typeof OffscreenCanvas&&a instanceof OffscreenCanvas)&&!l)return a;let e=o._unpremultipliedCache.get(t);if(e?.resourceId===t._resourceId)return e.canvas}if(a instanceof Uint8Array||a instanceof Uint8ClampedArray||a instanceof Int8Array||a instanceof Uint16Array||a instanceof Int16Array||a instanceof Uint32Array||a instanceof Int32Array||a instanceof Float32Array||a instanceof ArrayBuffer){let e=o._canvasSourceCache.get(t);if(e?.resourceId===t._resourceId)return e.canvas;let r=i.f.get().createCanvas(t.pixelWidth,t.pixelHeight),n=r.getContext("2d"),s=n.createImageData(t.pixelWidth,t.pixelHeight),l=s.data,c=a instanceof ArrayBuffer?new Uint8Array(a):new Uint8Array(a.buffer,a.byteOffset,a.byteLength);if("bgra8unorm"===t.format)for(let e=0;e<l.length&&e+3<c.length;e+=4)l[e]=c[e+2],l[e+1]=c[e+1],l[e+2]=c[e],l[e+3]=c[e+3];else l.set(c.subarray(0,l.length));return n.putImageData(s,0,0),o._canvasSourceCache.set(t,{canvas:r,resourceId:t._resourceId}),r}if(r){let e=i.f.get().createCanvas(t.pixelWidth,t.pixelHeight),r=e.getContext("2d",{willReadFrequently:!0});e.width=t.pixelWidth,e.height=t.pixelHeight,r.drawImage(a,0,0);let n=r.getImageData(0,0,e.width,e.height),s=n.data;for(let e=0;e<s.length;e+=4){let t=s[e+3];if(t>0){let a=255/t;s[e]=Math.min(255,s[e]*a+.5),s[e+1]=Math.min(255,s[e+1]*a+.5),s[e+2]=Math.min(255,s[e+2]*a+.5)}}return r.putImageData(n,0,0),o._unpremultipliedCache.set(t,{canvas:e,resourceId:t._resourceId}),e}if(l){let e=o._canvasSourceCache.get(t);if(e?.resourceId===t._resourceId)return e.canvas;let r=i.f.get().createCanvas(t.pixelWidth,t.pixelHeight),n=r.getContext("2d");return r.width=t.pixelWidth,r.height=t.pixelHeight,n.drawImage(a,0,0),o._canvasSourceCache.set(t,{canvas:r,resourceId:t._resourceId}),r}return a},getTintedCanvas:(e,t)=>{let r=e.texture,n=a.f.shared.setValue(t).toHex(),s=r.tintCache||(r.tintCache={}),l=s[n],c=r.source._resourceId;if(l?.tintId===c)return l;let d=l&&"getContext"in l?l:i.f.get().createCanvas();if(o.tintMethod(r,t,d),d.tintId=c,o.convertTintToImage&&void 0!==d.toDataURL){let e=i.f.get().createImage();e.src=d.toDataURL(),e.tintId=c,s[n]=e}else s[n]=d;return s[n]},getTintedPattern:(e,t)=>{let r=a.f.shared.setValue(t).toHex(),n=e.patternCache||(e.patternCache={}),s=e.source._resourceId,l=n[r];return l?.tintId===s||(o.canvas||(o.canvas=i.f.get().createCanvas()),o.tintMethod(e,t,o.canvas),(l=o.canvas.getContext("2d").createPattern(o.canvas,"repeat")).tintId=s,n[r]=l),l},applyPatternTransform:(e,t,a=!0)=>{if(!t||!e.setTransform)return;let i=globalThis.DOMMatrix;if(!i)return;let r=new i([t.a,t.b,t.c,t.d,t.tx,t.ty]);e.setTransform(a?r.inverse():r)},tintWithMultiply:(e,t,i)=>{let n=i.getContext("2d"),s=e.frame.clone(),l=e.source._resolution??e.source.resolution??1,c=e.rotate;s.x*=l,s.y*=l,s.width*=l,s.height*=l;let d=r.f.isVertical(c),u=d?s.height:s.width,h=d?s.width:s.height;i.width=Math.ceil(u),i.height=Math.ceil(h),n.save(),0xffffff!==t&&(n.fillStyle=a.f.shared.setValue(t).toHex(),n.fillRect(0,0,u,h),n.globalCompositeOperation="multiply");let p=o.getCanvasSource(e);p&&(c&&o._applyInverseRotation(n,c,s.width,s.height),n.drawImage(p,s.x,s.y,s.width,s.height,0,0,s.width,s.height),0xffffff!==t&&(n.globalCompositeOperation="destination-atop",n.drawImage(p,s.x,s.y,s.width,s.height,0,0,s.width,s.height))),n.restore()},tintWithOverlay:(e,t,i)=>{let n=i.getContext("2d"),s=e.frame.clone(),l=e.source._resolution??e.source.resolution??1,c=e.rotate;s.x*=l,s.y*=l,s.width*=l,s.height*=l;let d=r.f.isVertical(c),u=d?s.height:s.width,h=d?s.width:s.height;i.width=Math.ceil(u),i.height=Math.ceil(h),n.save(),n.globalCompositeOperation="copy",n.fillStyle=a.f.shared.setValue(t).toHex(),n.fillRect(0,0,u,h),n.globalCompositeOperation="destination-atop";let p=o.getCanvasSource(e);p&&(c&&o._applyInverseRotation(n,c,s.width,s.height),n.drawImage(p,s.x,s.y,s.width,s.height,0,0,s.width,s.height)),n.restore()},tintWithPerPixel:(e,t,a)=>{let i=a.getContext("2d"),n=e.frame.clone(),s=e.source._resolution??e.source.resolution??1,l=e.rotate;n.x*=s,n.y*=s,n.width*=s,n.height*=s;let c=r.f.isVertical(l),d=c?n.height:n.width,u=c?n.width:n.height;a.width=Math.ceil(d),a.height=Math.ceil(u),i.save(),i.globalCompositeOperation="copy";let h=o.getCanvasSource(e);if(!h)return void i.restore();l&&o._applyInverseRotation(i,l,n.width,n.height),i.drawImage(h,n.x,n.y,n.width,n.height,0,0,n.width,n.height),i.restore();let p=t>>16&255,m=t>>8&255,f=255&t,g=i.getImageData(0,0,d,u),y=g.data;for(let e=0;e<y.length;e+=4)y[e]=y[e]*p/255,y[e+1]=y[e+1]*m/255,y[e+2]=y[e+2]*f/255;i.putImageData(g,0,0)},_applyInverseRotation:(e,t,a,i)=>{let n=r.f.inv(t),s=r.f.uX(n),o=r.f.uY(n),l=r.f.vX(n),c=r.f.vY(n),d=-Math.min(0,s*a,l*i,s*a+l*i),u=-Math.min(0,o*a,c*i,o*a+c*i);e.transform(s,o,l,c,d,u)}};o.tintMethod=o.canUseMultiply?o.tintWithMultiply:o.tintWithPerPixel,e.s(["f",0,o],61805)},16203,e=>{var t=e.i(47760),a=e.i(95627);class i extends a.f{constructor(e){super(e),this.uploadMethodId="image",this.autoGarbageCollect=!0}static test(e){return globalThis.HTMLImageElement&&e instanceof HTMLImageElement||"u">typeof ImageBitmap&&e instanceof ImageBitmap||globalThis.VideoFrame&&e instanceof VideoFrame}}i.extension=t.x.TextureSource,e.s(["f",0,i])},70298,e=>{var t=e.i(41163);let a=new(e.i(69553)).f;e.s(["f",0,function(e,i,r,n,s=!1,o){a.minX=0,a.minY=0,a.maxX=e.width/n|0,a.maxY=e.height/n|0;let l=t.f.getOptimalTexture({width:a.width,height:a.height,resolution:n,autoGenerateMipmaps:s,scaleMode:o});return l.source.uploadMethodId="image",l.source.resource=e,l.source.alphaMode="premultiply-alpha-on-upload",l.frame.width=i/n,l.frame.height=r/n,l.source.emit("update",l.source),l.updateUvs(),l}])}])})();