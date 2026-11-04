import type { Lesson } from "@/lib/lessons/model";

/**
 * Structural Bridges lessons (CURRICULUM L4). Original wording. Every `before`/`after` program is compiled and run
 * natively by content:verify, and every `after` must pass Senior Review with no blocker or major.
 */
export const STRUCTURAL_BRIDGES_LESSONS: Lesson[] = [
  {
    id: "adapter",
    level: "L4",
    title: "Adapter: make an incompatible class fit the interface you own",
    oneLiner: "Wrap a class you cannot change in a thin translator so the rest of the code keeps talking to one interface.",
    cardTopic: "L4.adapter",
    intro: `An Adapter **implements the interface your code expects and forwards to an object whose interface you cannot (or should not) change**: a vendor SDK, a legacy class, generated code. It translates names, units and error conventions, and nothing else.

Two forms: the **object adapter** (holds the adaptee as a member; composition, the default in C++) and the **class adapter** (inherits privately from the adaptee; rarely worth it, it couples you to the adaptee's layout and lifetime). Adapter changes an interface *after the fact*; a Facade simplifies a set of interfaces; a Decorator keeps the same interface and adds behaviour. Interviewers like to hear that distinction.`,
    smell: `- Callers convert units or rename calls at every use site.
- Vendor types (and their quirks) leak into business logic and tests.
- Swapping the vendor means editing dozens of files.
- Tests need the real vendor class because there is no seam.`,
    before: `#include <iostream>

// Vendor class we cannot edit: reports Fahrenheit through a differently named method.
class LegacyThermometer {
public:
    double readFahrenheit() const { return 98.6; }
};

// Business logic is welded to the vendor type and does the conversion itself.
bool hasFever(const LegacyThermometer& t) {
    const double celsius = (t.readFahrenheit() - 32.0) * 5.0 / 9.0;
    return celsius >= 38.0;
}

int main() {
    LegacyThermometer t;
    std::cout << (hasFever(t) ? "fever" : "normal") << "\\n";
}
`,
    after: `#include <iostream>

// Interface the application owns: Celsius, one method.
class TemperatureSensor {
public:
    virtual ~TemperatureSensor() = default;
    virtual double celsius() const = 0;
};

// Vendor class we cannot edit.
class LegacyThermometer {
public:
    double readFahrenheit() const { return 98.6; }
};

// Object adapter: composition, translation only.
class LegacyThermometerAdapter : public TemperatureSensor {
public:
    explicit LegacyThermometerAdapter(const LegacyThermometer& legacy) : legacy_(legacy) {}
    double celsius() const override { return (legacy_.readFahrenheit() - 32.0) * 5.0 / 9.0; }

private:
    const LegacyThermometer& legacy_;
};

bool hasFever(const TemperatureSensor& sensor) { return sensor.celsius() >= 38.0; }

int main() {
    const LegacyThermometer legacy;
    const LegacyThermometerAdapter sensor(legacy);
    std::cout << (hasFever(sensor) ? "fever" : "normal") << "\\n";
}
`,
    refactorNotes: `\`hasFever\` now depends on \`TemperatureSensor\`, so a fake sensor makes it trivially testable and a new vendor is one new adapter class. The unit conversion lives in exactly one place.

**Trade-off:** one more type and one more hop. The adapter stores a reference, so the adaptee must outlive it; if ownership should transfer, hold a \`std::unique_ptr\` instead. Keep adapters dumb: if one grows business rules it has become a service.`,
    interviewSignal: `Say "I own the interface, the vendor does not, so I will put an adapter on the boundary". Mention where the adapter lives (the infrastructure edge, not the domain), that it is a pure translation layer, and how you would test it (contract test against the real vendor once, fakes everywhere else).`,
    overApplication: `Adapting a class you own is usually just a rename: change the class. Wrapping every third-party call in its own adapter and interface, even for a stable library you will never swap, multiplies types and hides useful features of the library. Put the seam where change or test pain is real.`,
    beforeOutput: "normal",
    afterOutput: "normal",
  },
  {
    id: "bridge",
    level: "L4",
    title: "Bridge: split two dimensions that vary independently",
    oneLiner: "Keep the abstraction and its implementation in separate hierarchies joined by composition, so M x N classes become M + N.",
    cardTopic: "L4.bridge",
    intro: `Bridge applies when a class varies along **two independent axes** (what the thing is, and how it is done on a platform). Inheritance alone gives you a class per combination. Bridge keeps the *abstraction* (Shape) holding a pointer or reference to an *implementor* (Renderer), so each axis grows by adding one class.

It is designed up front, unlike Adapter, which retrofits. The tell is a class-name grid: \`CircleSvg\`, \`CircleCanvas\`, \`SquareSvg\`, \`SquareCanvas\`. It is the structural cousin of Strategy: same shape in code, different intent (Bridge separates two hierarchies that both evolve; Strategy swaps one algorithm).`,
    smell: `- Class names that are the product of two adjectives.
- Adding one platform means adding a class for every existing shape.
- Copy-pasted drawing code across sibling classes.
- A change to the rendering API touches every shape.`,
    before: `#include <iostream>

// Two axes (shape, output format) multiplied into four classes; a third shape or format makes it 6 or 9.
class CircleSvg { public: void draw() const { std::cout << "<circle/>\\n"; } };
class CircleText { public: void draw() const { std::cout << "(circle)\\n"; } };
class SquareSvg { public: void draw() const { std::cout << "<rect/>\\n"; } };
class SquareText { public: void draw() const { std::cout << "[square]\\n"; } };

int main() {
    CircleSvg a; CircleText b; SquareSvg c; SquareText d;
    a.draw(); b.draw(); c.draw(); d.draw();
}
`,
    after: `#include <iostream>

// Implementor axis: how to draw primitives.
class Renderer {
public:
    virtual ~Renderer() = default;
    virtual void circle() const = 0;
    virtual void square() const = 0;
};

class SvgRenderer : public Renderer {
public:
    void circle() const override { std::cout << "<circle/>\\n"; }
    void square() const override { std::cout << "<rect/>\\n"; }
};

class TextRenderer : public Renderer {
public:
    void circle() const override { std::cout << "(circle)\\n"; }
    void square() const override { std::cout << "[square]\\n"; }
};

// Abstraction axis: what to draw. Holds the bridge to the implementor.
class Shape {
public:
    explicit Shape(const Renderer& renderer) : renderer_(renderer) {}
    virtual ~Shape() = default;
    virtual void draw() const = 0;

protected:
    const Renderer& renderer() const { return renderer_; }

private:
    const Renderer& renderer_;
};

class Circle : public Shape {
public:
    using Shape::Shape;
    void draw() const override { renderer().circle(); }
};

class Square : public Shape {
public:
    using Shape::Shape;
    void draw() const override { renderer().square(); }
};

int main() {
    const SvgRenderer svg;
    const TextRenderer text;
    const Circle a(svg), b(text);
    const Square c(svg), d(text);
    a.draw(); b.draw(); c.draw(); d.draw();
}
`,
    refactorNotes: `Two shapes and two renderers are now four small classes instead of four combined ones, and a Canvas renderer is **one** new class that every shape already works with. The output is identical, which is the point of a refactor.

**Trade-off:** the Renderer interface must be stable and wide enough for every shape; if shapes keep needing new primitives the bridge is leaking and every renderer changes. For two combinations total, Bridge is more machinery than the problem needs.`,
    interviewSignal: `Draw the grid first: "this is shape by output; inheritance gives me a class per cell, so I separate the axes and compose". Say that the composition is chosen at construction (or at runtime) and name the risk: a bloated implementor interface.`,
    overApplication: `If only one axis really varies, a Bridge is a plain interface with extra ceremony. Splitting every class into abstraction plus implementor "in case" of a second platform doubles the number of types and the number of places a reader must look. Wait for the second axis to appear.`,
    beforeOutput: "<circle/>\n(circle)\n<rect/>\n[square]",
    afterOutput: "<circle/>\n(circle)\n<rect/>\n[square]",
  },
  {
    id: "composite",
    level: "L4",
    title: "Composite: treat one and many the same way",
    oneLiner: "Give leaves and containers one interface so clients can work on a tree without asking what each node is.",
    cardTopic: "L4.composite",
    intro: `Composite models **part-whole trees** (files and folders, UI widgets, org charts, expression trees). A \`Node\` interface is implemented by both leaves and containers; a container holds children as \`Node\` and forwards the operation, combining the results.

The decision that matters: **where child management lives**. Putting \`add()\` on the shared interface is transparent but lets you call it on a leaf; putting it only on the container is safe but clients must know which is which. State your choice. Own children with \`std::unique_ptr<Node>\` so the tree frees itself.`,
    smell: `- \`if (isFolder) { for (...) ... } else { ... }\` repeated in every operation.
- Each new operation (size, print, search) rewrites the traversal.
- Callers use \`dynamic_cast\` to find out what a node is.
- Depth is capped by what the traversal code remembered to handle.`,
    before: `#include <iostream>
#include <vector>

struct File { int bytes; };
struct Folder {
    std::vector<File> files;
    std::vector<Folder> folders;
};

// The caller must handle both shapes by hand, and again for every new operation.
int totalSize(const Folder& f) {
    int sum = 0;
    for (const File& file : f.files) sum += file.bytes;
    for (const Folder& sub : f.folders) sum += totalSize(sub);
    return sum;
}

int main() {
    Folder root{{{10}, {20}}, {Folder{{{5}}, {}}}};
    std::cout << totalSize(root) << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <vector>

class Node {
public:
    virtual ~Node() = default;
    virtual int size() const = 0;
};

class File : public Node {
public:
    explicit File(int bytes) : bytes_(bytes) {}
    int size() const override { return bytes_; }

private:
    int bytes_;
};

class Folder : public Node {
public:
    // Child management lives on the container only: a File cannot be asked to add().
    void add(std::unique_ptr<Node> child) { children_.push_back(std::move(child)); }
    int size() const override {
        int sum = 0;
        for (const auto& child : children_) sum += child->size();
        return sum;
    }

private:
    std::vector<std::unique_ptr<Node>> children_;
};

int main() {
    Folder root;
    root.add(std::make_unique<File>(10));
    root.add(std::make_unique<File>(20));
    auto sub = std::make_unique<Folder>();
    sub->add(std::make_unique<File>(5));
    root.add(std::move(sub));
    std::cout << root.size() << "\\n";
}
`,
    refactorNotes: `The client calls \`size()\` on any node and never asks what it is. A new node kind (a symlink with size 0, a zip) is one class; the existing traversal is untouched.

**Trade-off:** I kept \`add()\` off the interface, which is type-safe but means building code must hold a \`Folder\`. The uniform version is simpler for clients but lets you call \`add\` on a \`File\`, which must then fail somehow. Unbounded recursion on very deep trees is a stack risk; mention an iterative walk if depth is user controlled. Cycles are impossible with \`unique_ptr\` ownership, which is a feature.`,
    interviewSignal: `Name it from the data shape: "files and folders are a tree where a folder is also a file for the purposes of size". Volunteer the transparency vs safety choice and who owns the children. Level signal: say how you would cache the size of a large subtree and invalidate it.`,
    overApplication: `A Composite for a structure that is two levels deep and fixed (an order with lines) is just a vector. Forcing everything behind one interface can also hide operations that only make sense on one kind, ending in empty or throwing methods on leaves. Use it when recursion is real.`,
    beforeOutput: "35",
    afterOutput: "35",
  },
  {
    id: "decorator",
    level: "L4",
    title: "Decorator: stack behaviour without an inheritance explosion",
    oneLiner: "Wrap an object in another object with the same interface to add behaviour at runtime, in any combination.",
    cardTopic: "L4.decorator",
    intro: `A Decorator **implements the interface and holds one instance of the same interface**; it does its extra work before or after delegating. Stacking decorators composes behaviour (compress, then encrypt, then log) without a subclass for every combination.

Same interface in, same interface out: that separates it from Adapter (changes the interface) and Proxy (controls access to the same object, usually one layer). **Order matters**: encrypt then compress is not compress then encrypt, and a good answer says so. In C++ the wrapped object is usually a \`std::unique_ptr<Interface>\` the decorator owns.`,
    smell: `- Subclass names like \`LoggedCompressedEncryptedSender\`.
- Boolean flags (\`compress\`, \`encrypt\`, \`log\`) threaded through one big method.
- A new feature needs a new subclass for each existing combination.
- Features cannot be toggled per instance at runtime.`,
    before: `#include <cctype>
#include <iostream>
#include <string>

class Sender {
public:
    virtual ~Sender() = default;
    virtual std::string send(const std::string& msg) const { return msg; }
};
// One subclass per combination: 2 features = 3 extra classes, 3 features = 7.
class UpperSender : public Sender {
public:
    std::string send(const std::string& msg) const override {
        std::string out = msg;
        for (char& c : out) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
        return out;
    }
};
class BracketSender : public Sender {
public:
    std::string send(const std::string& msg) const override { return "[" + msg + "]"; }
};
class UpperBracketSender : public Sender {
public:
    std::string send(const std::string& msg) const override { return "[" + UpperSender().send(msg) + "]"; }
};

int main() {
    std::cout << UpperBracketSender().send("hi") << "\\n";
}
`,
    after: `#include <cctype>
#include <iostream>
#include <memory>
#include <string>

class Sender {
public:
    virtual ~Sender() = default;
    virtual std::string send(const std::string& msg) const = 0;
};

class PlainSender : public Sender {
public:
    std::string send(const std::string& msg) const override { return msg; }
};

// Decorators share the interface and own the thing they wrap.
class SenderDecorator : public Sender {
protected:
    explicit SenderDecorator(std::unique_ptr<Sender> inner) : inner_(std::move(inner)) {}
    const Sender& inner() const { return *inner_; }

private:
    std::unique_ptr<Sender> inner_;
};

class UpperSender : public SenderDecorator {
public:
    explicit UpperSender(std::unique_ptr<Sender> inner) : SenderDecorator(std::move(inner)) {}
    std::string send(const std::string& msg) const override {
        std::string out = inner().send(msg);
        for (char& c : out) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
        return out;
    }
};

class BracketSender : public SenderDecorator {
public:
    explicit BracketSender(std::unique_ptr<Sender> inner) : SenderDecorator(std::move(inner)) {}
    std::string send(const std::string& msg) const override { return "[" + inner().send(msg) + "]"; }
};

int main() {
    const std::unique_ptr<Sender> sender =
        std::make_unique<BracketSender>(std::make_unique<UpperSender>(std::make_unique<PlainSender>()));
    std::cout << sender->send("hi") << "\\n";
}
`,
    refactorNotes: `Each feature is one class, and the combination is chosen where the object is built. A new feature (a timestamp) adds one class and works with every existing stack. The observable output is unchanged.

**Trade-off:** stacks are harder to debug (the call goes through N frames) and identity checks (\`dynamic_cast\`) stop working through the wrappers. Order is behaviour: \`Bracket(Upper(x))\` equals \`Upper(Bracket(x))\` for these two but not for, say, truncate and bracket. In C++ also consider policy-based composition (templates) when stacks are fixed at compile time and virtual calls matter.`,
    interviewSignal: `Count the combinations aloud: "three optional features is eight subclasses, so I wrap instead". State the interface rule (same in, same out), the ordering caveat, and where the stack is assembled (a factory or the composition root).`,
    overApplication: `One optional behaviour is just an \`if\` or a parameter. Decorating everything yields a pile of one-method classes whose order nobody can see, and a debugger that shows six identical frames. Stack decorators when combinations are real and chosen at runtime.`,
    beforeOutput: "[HI]",
    afterOutput: "[HI]",
  },
  {
    id: "facade",
    level: "L4",
    title: "Facade: one friendly door to a messy subsystem",
    oneLiner: "Offer a small, task-shaped interface over several collaborating classes so callers stop depending on all of them.",
    cardTopic: "L4.facade",
    intro: `A Facade is a **simplified entry point** to a subsystem: it knows the right order of calls and the glue between the parts, and callers state their intent (\`placeOrder\`). The subsystem classes stay public for advanced users; the facade does not forbid them, it just makes the common path easy.

It differs from Adapter (which makes one thing fit an expected interface) and from a Mediator (which coordinates peers that know about it). A facade is also a natural **layer boundary** and a seam for tests. Beware the "god facade" that accumulates unrelated methods.`,
    smell: `- Every caller repeats the same five-step sequence in the same order.
- Callers import and construct half the subsystem.
- A subsystem change (a new step) edits every caller.
- Sequencing bugs: someone forgets to release stock when payment fails.`,
    before: `#include <iostream>
#include <string>

struct Inventory { bool reserve(const std::string& item) const { return item != "ghost"; } };
struct Payment { bool charge(int cents) const { return cents <= 5000; } };
struct Shipping { void ship(const std::string& item) const { std::cout << "shipped " << item << "\\n"; } };

int main() {
    // Each call site re-implements the workflow and its error handling.
    Inventory inventory;
    Payment payment;
    Shipping shipping;
    const std::string item = "lamp";
    if (inventory.reserve(item) && payment.charge(1999)) {
        shipping.ship(item);
    } else {
        std::cout << "order failed\\n";
    }
}
`,
    after: `#include <iostream>
#include <string>

struct Inventory { bool reserve(const std::string& item) const { return item != "ghost"; } };
struct Payment { bool charge(int cents) const { return cents <= 5000; } };
struct Shipping { void ship(const std::string& item) const { std::cout << "shipped " << item << "\\n"; } };

// The facade owns the workflow; callers say what they want.
class OrderFacade {
public:
    bool placeOrder(const std::string& item, int cents) const {
        if (!inventory_.reserve(item) || !payment_.charge(cents)) {
            std::cout << "order failed\\n";
            return false;
        }
        shipping_.ship(item);
        return true;
    }

private:
    Inventory inventory_;
    Payment payment_;
    Shipping shipping_;
};

int main() {
    const OrderFacade orders;
    orders.placeOrder("lamp", 1999);
}
`,
    refactorNotes: `The sequence and its failure handling are written once. Adding a fraud check changes \`OrderFacade\` only. Callers depend on one class instead of three.

**Trade-off:** the facade hardcodes its collaborators; to test it in isolation inject the subsystem interfaces (constructor injection, see the DI lesson) instead of owning concrete members. A facade that keeps growing methods is a god object: split by use case.`,
    interviewSignal: `Use the word "workflow": "callers should not know the order of reserve, charge and ship". Note that the facade is the boundary where you decide transactions and compensation (what to undo if payment fails); that is the senior detail.`,
    overApplication: `A facade over a single class is a pointless pass-through. A facade that hides the subsystem completely, so power users cannot reach it, becomes a bottleneck that needs a new method for every need. Keep it thin, task-shaped and optional.`,
    beforeOutput: "shipped lamp",
    afterOutput: "shipped lamp",
  },
  {
    id: "flyweight",
    level: "L4",
    title: "Flyweight: share the heavy, immutable part",
    oneLiner: "When there are huge numbers of similar objects, split intrinsic (shared, immutable) state from extrinsic (per-instance) state and share the former.",
    cardTopic: "L4.flyweight",
    intro: `Flyweight saves memory when you have **many objects that mostly carry the same data**: glyphs in a document, trees in a forest, tiles in a map. Intrinsic state (font, mesh, sprite) is immutable and shared through a factory or cache; extrinsic state (position, colour tint) lives in the instance or is passed in.

Prove it with numbers: a million trees with a 2 KB mesh each is 2 GB; sharing one mesh per species leaves a few MB plus 16 bytes per tree. Two rules make it safe: shared objects must be **immutable**, and the cache must manage lifetime (\`std::shared_ptr\`, or never free if the set is small). Thread-safety of the cache is part of the answer.`,
    smell: `- Memory grows linearly with the object count, and most bytes are identical copies.
- Profilers show the same string or struct duplicated thousands of times.
- Per-instance fields that are never changed after construction.`,
    before: `#include <iostream>
#include <string>
#include <vector>

// Every tree carries its own copy of the species data.
struct Tree {
    std::string species;  // intrinsic, repeated
    std::string texture;  // intrinsic, repeated
    int x;
    int y;
};

int main() {
    std::vector<Tree> forest;
    for (int i = 0; i < 4; ++i) forest.push_back({"oak", "oak-bark.png", i, i});
    std::cout << forest.size() << " trees, " << forest.size() << " texture copies\\n";
}
`,
    after: `#include <iostream>
#include <map>
#include <memory>
#include <string>
#include <vector>

// Flyweight: immutable, shared.
class TreeType {
public:
    TreeType(std::string species, std::string texture) : species_(std::move(species)), texture_(std::move(texture)) {}
    const std::string& species() const { return species_; }

private:
    std::string species_;
    std::string texture_;
};

class TreeTypeFactory {
public:
    std::shared_ptr<const TreeType> get(const std::string& species, const std::string& texture) {
        auto it = cache_.find(species);
        if (it == cache_.end()) {
            it = cache_.emplace(species, std::make_shared<const TreeType>(species, texture)).first;
        }
        return it->second;
    }
    std::size_t distinctTypes() const { return cache_.size(); }

private:
    std::map<std::string, std::shared_ptr<const TreeType>> cache_;
};

// Context: only the extrinsic state plus a pointer to the shared part.
struct Tree {
    std::shared_ptr<const TreeType> type;
    int x;
    int y;
};

int main() {
    TreeTypeFactory factory;
    std::vector<Tree> forest;
    for (int i = 0; i < 4; ++i) forest.push_back({factory.get("oak", "oak-bark.png"), i, i});
    std::cout << forest.size() << " trees, " << factory.distinctTypes() << " texture copies\\n";
}
`,
    refactorNotes: `Four trees now share one \`TreeType\`; the per-tree cost is a pointer and two ints. The output line changes on purpose, because the count of copies is the whole point.

**Trade-off:** one more indirection per access (cache misses, pointer chasing), a cache that needs a lifetime and locking policy, and a hard rule that shared state never mutates. Measure first: for 10,000 small objects the saving may be irrelevant. For big counts, a \`std::vector<TreeType>\` plus integer ids is even cheaper than \`shared_ptr\` (no atomic refcount).`,
    interviewSignal: `Start with arithmetic: "objects times bytes, what fraction is identical". Name intrinsic vs extrinsic, insist on immutability, and mention the id-into-array variant used in games and databases (string interning, dictionary encoding).`,
    overApplication: `Flyweight is a memory optimisation; applying it without measuring trades clarity for bytes you did not need. It also makes object identity and mutation subtle, because changing a "shared" object changes every user. Do not share mutable state.`,
    beforeOutput: "4 trees, 4 texture copies",
    afterOutput: "4 trees, 1 texture copies",
  },
  {
    id: "proxy",
    level: "L4",
    title: "Proxy: a stand-in that controls access to the real thing",
    oneLiner: "Hand clients an object with the same interface that decides when, whether or how the real object is used.",
    cardTopic: "L4.proxy",
    intro: `A Proxy **has the same interface as the real subject** and sits in front of it. Common kinds: **virtual** (create the expensive object on first use), **protection** (check permissions), **caching**, **remote** (represent an object in another process, as an RPC stub does), and **logging/metrics**. The client cannot tell it apart, which is the point.

Do not mix it up with Decorator: a decorator *adds responsibilities* and is typically stacked; a proxy *controls access* to one subject and often manages its lifecycle. In practice the code looks alike, so state the intent. Be honest about the cost: a lazy proxy adds a branch and, if shared across threads, needs synchronisation (\`std::call_once\`).`,
    smell: `- Callers check \`if (!loaded) load();\` before every use.
- An expensive object is built at startup even though most runs never touch it.
- Permission or cache logic is copy-pasted around call sites.
- Switching to a remote service changes every caller.`,
    before: `#include <iostream>
#include <string>

class HeavyReport {
public:
    HeavyReport() { std::cout << "loading report\\n"; }
    std::string text() const { return "quarterly numbers"; }
};

int main() {
    HeavyReport report;  // paid for even if the user never opens it
    std::cout << "app started\\n";
    std::cout << report.text() << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>

class Report {
public:
    virtual ~Report() = default;
    virtual std::string text() const = 0;
};

class HeavyReport : public Report {
public:
    HeavyReport() { std::cout << "loading report\\n"; }
    std::string text() const override { return "quarterly numbers"; }
};

// Virtual proxy: same interface, builds the real report on first use.
class LazyReport : public Report {
public:
    std::string text() const override {
        if (!real_) real_ = std::make_unique<HeavyReport>();
        return real_->text();
    }

private:
    mutable std::unique_ptr<HeavyReport> real_;
};

int main() {
    const LazyReport report;  // cheap
    std::cout << "app started\\n";
    std::cout << report.text() << "\\n";
}
`,
    refactorNotes: `Start-up no longer pays for the report; the load happens at the first \`text()\`, and the printed order shows it. Clients depend on \`Report\`, so replacing the lazy proxy with a caching or remote one is invisible to them.

**Trade-off:** the first call is slow (latency moves, it does not vanish), \`mutable\` hides a state change inside a \`const\` method, and this version is **not thread-safe**; guard with \`std::call_once\` or a mutex if shared. Failure moves too: an error in loading now surfaces at an arbitrary later call.`,
    interviewSignal: `Say which proxy you mean (virtual, protection, caching, remote) and what it moves in time or place. Then raise the concurrency and failure-timing consequences unprompted; that is the senior part. Contrast it with Decorator in one sentence.`,
    overApplication: `A proxy for an object that is cheap or always needed is only indirection. Layering several proxies (auth, cache, log, retry) without a clear order creates behaviour nobody can predict; when it is cross-cutting, consider a single well-defined middleware chain instead.`,
    beforeOutput: "loading report\napp started\nquarterly numbers",
    afterOutput: "app started\nloading report\nquarterly numbers",
  },
];
