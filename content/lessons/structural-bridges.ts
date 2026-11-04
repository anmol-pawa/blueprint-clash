import type { Lesson } from "@/lib/lessons/model";

/**
 * Structural Bridges lessons (CURRICULUM L4). Original wording. Every `before`/`after` program is compiled and run
 * natively by content:verify, and every `after` must pass Senior Review with no blocker or major.
 */
export const STRUCTURAL_BRIDGES_LESSONS: Lesson[] = [
  {
    id: "adapter",
    level: "L4",
    title: "Adapter: make a foreign interface fit yours",
    oneLiner: "Wrap an incompatible class behind the interface your code already expects, so the translation lives in exactly one place.",
    cardTopic: "L4.adapter",
    intro: `An Adapter **converts one interface into another** that the client expects. You reach for it when you cannot (or should not) change the other side: a vendor SDK, a legacy module, a generated client. The adapter holds the foreign object (composition) and implements your interface by translating calls, units and error conventions.

Keep two cousins apart: a **Decorator** keeps the interface and adds behaviour; a **Proxy** keeps the interface and controls access; an **Adapter** changes the interface. In C++ prefer an object adapter (holds the adaptee) over private inheritance from it, unless you need to override its virtual functions.`,
    smell: `- Callers include a vendor header and do unit or format conversion inline.
- The same conversion formula is copy-pasted in several functions.
- Swapping the vendor means editing domain code.
- Tests need the real vendor class because there is no seam.`,
    before: `#include <iostream>

// A vendor class we cannot change. It speaks Fahrenheit.
class VendorThermometer {
public:
    double readFahrenheit() const { return 98.6; }
};

// Callers reach into the vendor type and convert units by hand, in every place that needs a reading.
double averageCelsius(const VendorThermometer& a, const VendorThermometer& b) {
    return ((a.readFahrenheit() - 32.0) * 5.0 / 9.0 + (b.readFahrenheit() - 32.0) * 5.0 / 9.0) / 2.0;
}

int main() {
    const VendorThermometer a;
    const VendorThermometer b;
    std::cout << averageCelsius(a, b) << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>

// The interface our code wants: Celsius, nothing vendor-specific.
class TemperatureSensor {
public:
    virtual ~TemperatureSensor() = default;
    virtual double readCelsius() const = 0;
};

// A vendor class we cannot change. It speaks Fahrenheit.
class VendorThermometer {
public:
    double readFahrenheit() const { return 98.6; }
};

// The adapter owns the vendor object (composition) and translates the call and the unit in one place.
class VendorSensorAdapter : public TemperatureSensor {
public:
    explicit VendorSensorAdapter(VendorThermometer vendor) : vendor_(vendor) {}
    double readCelsius() const override { return (vendor_.readFahrenheit() - 32.0) * 5.0 / 9.0; }

private:
    VendorThermometer vendor_;
};

// Domain code depends on the interface only, so a test double or a different vendor drops in.
double averageCelsius(const TemperatureSensor& a, const TemperatureSensor& b) {
    return (a.readCelsius() + b.readCelsius()) / 2.0;
}

int main() {
    const VendorSensorAdapter a{VendorThermometer{}};
    const VendorSensorAdapter b{VendorThermometer{}};
    std::cout << averageCelsius(a, b) << "\\n";
}
`,
    beforeOutput: "37",
    afterOutput: "37",
    refactorNotes: `The domain code (\`averageCelsius\`) now depends on \`TemperatureSensor\` only. The Fahrenheit knowledge lives in \`VendorSensorAdapter\`, so a second vendor is a second adapter and a unit test uses a fake sensor.

**Trade-off:** one more type and one virtual call per read. If there is a single call site and the vendor will never change, a plain conversion function is honest and cheaper. The adapter earns its place when the interface is used widely or must be faked in tests.`,
    interviewSignal: `Say "I do not own that API, so I put an adapter at the boundary and keep my domain vocabulary clean". Mention that the adapter is also where you translate errors and retries (an anti-corruption layer in domain-driven design terms). Senior signal: you distinguish it from Facade (simplifies many classes) and Decorator (same interface).`,
    overApplication: `Wrapping every library call "in case we switch" produces a pass-through layer that mirrors the vendor API one to one and hides nothing. Adapt at real boundaries you actually test or might replace, and let the adapter speak your domain language, not a renamed copy of theirs.`,
  },
  {
    id: "bridge",
    level: "L4",
    title: "Bridge: split two axes of variation",
    oneLiner: "Separate an abstraction from its implementation so each can vary on its own, instead of multiplying subclasses.",
    cardTopic: "L4.bridge",
    intro: `Bridge is for **two independent dimensions** of change. If you have \`UrgentEmailAlert\`, \`UrgentSmsAlert\`, \`NormalEmailAlert\`, \`NormalSmsAlert\`, inheritance has multiplied urgency by channel. Bridge keeps one hierarchy for the abstraction (Alert) and one for the implementation (Channel); the abstraction holds a pointer to the implementation.

Structurally it looks like Strategy. The difference is intent: Strategy swaps one algorithm inside a stable class, whereas Bridge is planned up front so two whole hierarchies grow separately. The pointer-to-implementation (pimpl) idiom is a Bridge used to hide a class's private details and cut compile-time dependencies.`,
    smell: `- Class names that are a cross product: \`RedCircle\`, \`BlueCircle\`, \`RedSquare\`...
- Adding one option on one axis means adding N classes.
- Copy-pasted bodies that differ only in one word.
- A subclass hierarchy that is secretly two hierarchies.`,
    before: `#include <iostream>
#include <string>

// Two independent axes (how urgent, which channel) multiplied into one class per combination.
// A third channel adds two classes; a third urgency adds three.
struct UrgentEmailAlert {
    std::string send(const std::string& text) const { return "EMAIL !!! " + text; }
};
struct UrgentSmsAlert {
    std::string send(const std::string& text) const { return "SMS !!! " + text; }
};
struct NormalEmailAlert {
    std::string send(const std::string& text) const { return "EMAIL " + text; }
};
struct NormalSmsAlert {
    std::string send(const std::string& text) const { return "SMS " + text; }
};

int main() {
    std::cout << UrgentEmailAlert{}.send("disk full") << "\\n";
    std::cout << NormalSmsAlert{}.send("backup done") << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>

// Implementation axis: how a message is delivered.
class Channel {
public:
    virtual ~Channel() = default;
    virtual std::string deliver(const std::string& text) const = 0;
};

class EmailChannel : public Channel {
public:
    std::string deliver(const std::string& text) const override { return "EMAIL " + text; }
};

class SmsChannel : public Channel {
public:
    std::string deliver(const std::string& text) const override { return "SMS " + text; }
};

// Abstraction axis: what kind of alert it is. It holds a Channel (the bridge) instead of inheriting one.
class Alert {
public:
    explicit Alert(std::unique_ptr<Channel> channel) : channel_(std::move(channel)) {}
    virtual ~Alert() = default;
    virtual std::string send(const std::string& text) const = 0;

protected:
    const Channel& channel() const { return *channel_; }

private:
    std::unique_ptr<Channel> channel_;
};

class NormalAlert : public Alert {
public:
    using Alert::Alert;
    std::string send(const std::string& text) const override { return channel().deliver(text); }
};

class UrgentAlert : public Alert {
public:
    using Alert::Alert;
    std::string send(const std::string& text) const override { return channel().deliver("!!! " + text); }
};

int main() {
    const UrgentAlert urgentEmail(std::make_unique<EmailChannel>());
    const NormalAlert normalSms(std::make_unique<SmsChannel>());
    std::cout << urgentEmail.send("disk full") << "\\n";
    std::cout << normalSms.send("backup done") << "\\n";
}
`,
    beforeOutput: "EMAIL !!! disk full\nSMS backup done",
    afterOutput: "EMAIL !!! disk full\nSMS backup done",
    refactorNotes: `Alerts and channels now vary independently: two alert kinds and two channels cost four objects at run time but only four classes in total, and a third channel adds one class instead of two. The alert **owns** its channel through \`std::unique_ptr\`, so lifetime is explicit.

**Trade-off:** an extra indirection, and a design that is only worth it when both axes really do grow. With one axis, plain inheritance or a single strategy is simpler.`,
    interviewSignal: `Count the variation axes out loud: "notification kind and delivery channel are independent, so I will not subclass the product of them". Interviewers listen for whether you can name the two axes before drawing UML. Senior signal: you can say how this differs from Strategy and when pimpl is the same pattern.`,
    overApplication: `Designing a Bridge for an axis that has one value, "because it might grow", gives you two hierarchies with one class each and an indirection nobody needs. Wait for the second value on the second axis, then refactor; the move is mechanical.`,
  },
  {
    id: "composite",
    level: "L4",
    title: "Composite: treat one and many the same",
    oneLiner: "Give leaves and containers a common interface so callers handle a single item and a whole tree with the same code.",
    cardTopic: "L4.composite",
    intro: `Composite models a **part-whole tree**: folders and files, menus and menu items, UI panels and widgets, expression trees. Leaves and containers implement one interface; a container forwards the call to its children and combines the answers.

The design question is where to put child-management methods (\`add\`, \`remove\`). Putting them on the base gives uniformity but lets you call \`add\` on a leaf (a run-time failure); putting them only on the container is type-safe but callers must know which they hold. Most C++ designs choose safety: \`add\` lives on the container, and the shared interface has only the operations that make sense for both.`,
    smell: `- Two parallel collections (\`files\` and \`folders\`) and callers that loop over both.
- \`dynamic_cast\` or a type tag to ask "is this a leaf?".
- Every new node kind edits every traversal function.
- Recursive algorithms duplicated per operation.`,
    before: `#include <iostream>
#include <string>
#include <vector>

struct File {
    std::string name;
    long long bytes;
};

struct Folder {
    std::string name;
    std::vector<File> files;
    std::vector<Folder> folders;
};

// The caller must know there are two kinds of thing and walk them differently.
// Adding a third kind (a symlink, say) edits every function like this one.
long long totalBytes(const Folder& f) {
    long long sum = 0;
    for (const auto& file : f.files) sum += file.bytes;
    for (const auto& sub : f.folders) sum += totalBytes(sub);
    return sum;
}

int main() {
    Folder root{"root", {{"a.txt", 100}}, {Folder{"docs", {{"b.txt", 40}, {"c.txt", 60}}, {}}}};
    std::cout << totalBytes(root) << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

// Leaf and composite share one interface, so callers treat a file and a whole tree the same way.
class Node {
public:
    virtual ~Node() = default;
    virtual long long totalBytes() const = 0;
};

class File : public Node {
public:
    File(std::string name, long long bytes) : name_(std::move(name)), bytes_(bytes) {}
    long long totalBytes() const override { return bytes_; }

private:
    std::string name_;
    long long bytes_;
};

class Folder : public Node {
public:
    explicit Folder(std::string name) : name_(std::move(name)) {}
    // The folder owns its children; add() takes ownership.
    void add(std::unique_ptr<Node> child) { children_.push_back(std::move(child)); }
    long long totalBytes() const override {
        long long sum = 0;
        for (const auto& child : children_) sum += child->totalBytes();
        return sum;
    }

private:
    std::string name_;
    std::vector<std::unique_ptr<Node>> children_;
};

int main() {
    auto docs = std::make_unique<Folder>("docs");
    docs->add(std::make_unique<File>("b.txt", 40));
    docs->add(std::make_unique<File>("c.txt", 60));
    Folder root("root");
    root.add(std::make_unique<File>("a.txt", 100));
    root.add(std::move(docs));
    std::cout << root.totalBytes() << "\\n";
}
`,
    beforeOutput: "200",
    afterOutput: "200",
    refactorNotes: `\`totalBytes()\` is now a virtual call that works on a file or on a whole tree, and a new node kind (a symlink) is a new class with no edit to \`Folder\`. The folder owns its children through \`std::unique_ptr<Node>\`, so there is no manual \`delete\` and no shared ownership.

**Trade-off:** operations are virtual methods on the nodes. If you need many unrelated operations over a stable set of node kinds, a Visitor (or \`std::variant\` with \`std::visit\`) keeps the node classes small.`,
    interviewSignal: `Recognise the tree in the prompt: "a folder can contain folders, so I will use Composite and a shared Node interface". Name the safety trade-off for \`add\` on the base. Senior signal: you mention cycle prevention, parent pointers (non-owning) and how you would cache a size in a large tree.`,
    overApplication: `Making every collection a Composite when the structure is flat adds a base class and virtual calls for nothing. A tree of exactly two fixed levels is often clearer as two plain types. Reach for Composite when the depth is genuinely unbounded and callers should not care.`,
  },
  {
    id: "decorator",
    level: "L4",
    title: "Decorator: stack behaviour without subclass explosions",
    oneLiner: "Wrap an object in another with the same interface to add one responsibility, and stack as many wrappers as you need at run time.",
    cardTopic: "L4.decorator",
    intro: `A Decorator **is-a** component (same interface) and **has-a** component (the wrapped object). It forwards the call and adds one behaviour before or after. Because wrappers compose, \`Bracketed(Uppercase(PlainText))\` and \`Bracketed(PlainText)\` need no new classes, and the caller picks the order.

C++ standard streams and middleware chains work this way (compression over encryption over a socket, logging around a repository). Compare with Proxy: a proxy controls access to the same object; a decorator adds behaviour and is meant to be stacked. Order matters, so document it (compress then encrypt, never the reverse).`,
    smell: `- Boolean flags (\`upper\`, \`bracket\`, \`log\`) piling up in constructors.
- A subclass per combination: \`LoggedCompressedReader\`.
- One function with an if for each option in a fixed order.
- A new option edits an existing, working class.`,
    before: `#include <iostream>
#include <string>

// Every optional behaviour is a flag, and the order is baked into one function.
// A new option edits this class; a caller who wants the other order cannot have it.
class TextSource {
public:
    TextSource(bool upper, bool bracket) : upper_(upper), bracket_(bracket) {}
    std::string read() const {
        std::string s = "hello";
        if (upper_) {
            for (auto& c : s) c = static_cast<char>(c - 'a' + 'A');
        }
        if (bracket_) s = "[" + s + "]";
        return s;
    }

private:
    bool upper_;
    bool bracket_;
};

int main() {
    std::cout << TextSource(true, true).read() << "\\n";
    std::cout << TextSource(false, true).read() << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>

class TextSource {
public:
    virtual ~TextSource() = default;
    virtual std::string read() const = 0;
};

class PlainText : public TextSource {
public:
    std::string read() const override { return "hello"; }
};

// A decorator IS a TextSource and HAS a TextSource. It adds one behaviour and forwards the rest.
class Uppercase : public TextSource {
public:
    explicit Uppercase(std::unique_ptr<TextSource> inner) : inner_(std::move(inner)) {}
    std::string read() const override {
        std::string s = inner_->read();
        for (auto& c : s) c = static_cast<char>(c - 'a' + 'A');
        return s;
    }

private:
    std::unique_ptr<TextSource> inner_;
};

class Bracketed : public TextSource {
public:
    explicit Bracketed(std::unique_ptr<TextSource> inner) : inner_(std::move(inner)) {}
    std::string read() const override { return "[" + inner_->read() + "]"; }

private:
    std::unique_ptr<TextSource> inner_;
};

int main() {
    // Stacking order is chosen by the caller, at run time.
    const Bracketed both(std::make_unique<Uppercase>(std::make_unique<PlainText>()));
    const Bracketed onlyBrackets(std::make_unique<PlainText>());
    std::cout << both.read() << "\\n";
    std::cout << onlyBrackets.read() << "\\n";
}
`,
    beforeOutput: "[HELLO]\n[hello]",
    afterOutput: "[HELLO]\n[hello]",
    refactorNotes: `Each behaviour is its own small class, and new behaviours add a class without touching the others (Open/Closed). The caller chooses stacking order. Every decorator owns its inner source through \`std::unique_ptr\`.

**Trade-off:** many small objects, deeper stack traces, and identity gets murky (the wrapper is not the original). Do not use it when behaviours are not independent or when order-dependence would surprise callers.`,
    interviewSignal: `Say "these features combine in any order, so inheritance would explode; I will use decorators on a narrow interface". Senior signal: you warn about interface width (a wide base makes every decorator forward dozens of methods) and about order-sensitive pairs.`,
    overApplication: `Three decorators over a type that will only ever be used one way is ceremony; a function parameter or one extra method is simpler. Decorators on a fat interface force boilerplate forwarding in each wrapper. Keep the component interface narrow.`,
  },
  {
    id: "facade",
    level: "L4",
    title: "Facade: one simple door to a messy subsystem",
    oneLiner: "Provide a small, task-oriented entry point over several collaborating classes so callers stop repeating the protocol.",
    cardTopic: "L4.facade",
    intro: `A Facade is a **simplifying front** over a subsystem. The caller wants "place an order"; the subsystem needs inventory, payments and shipping called in the right order with the right error handling. The facade owns that protocol.

It does not hide the subsystem: power users can still reach the classes underneath. That distinguishes it from Adapter (changes an interface so it fits) and Mediator (the parts talk through it). In service code the application service or use-case class is usually a facade over the domain.`,
    smell: `- Every caller repeats the same three-step call sequence.
- Ordering rules ("reserve before charge") live in the callers' heads.
- A change to the subsystem touches dozens of call sites.
- Clients include half a dozen headers to do one thing.`,
    before: `#include <iostream>
#include <string>

class Inventory {
public:
    bool reserve(const std::string& sku) const { return sku != "out-of-stock"; }
};
class Payments {
public:
    bool charge(int cents) const { return cents > 0; }
};
class Shipping {
public:
    std::string schedule(const std::string& sku) const { return "shipped " + sku; }
};

// Every caller repeats the three-step protocol and its ordering rules.
// Forget to charge, or charge before reserving, and the bug is in the caller.
int main() {
    const Inventory inventory;
    const Payments payments;
    const Shipping shipping;
    if (inventory.reserve("lamp") && payments.charge(2500)) std::cout << shipping.schedule("lamp") << "\\n";
    if (inventory.reserve("out-of-stock") && payments.charge(900)) std::cout << shipping.schedule("out-of-stock") << "\\n";
    else std::cout << "order failed\\n";
}
`,
    after: `#include <iostream>
#include <string>

class Inventory {
public:
    bool reserve(const std::string& sku) const { return sku != "out-of-stock"; }
};
class Payments {
public:
    bool charge(int cents) const { return cents > 0; }
};
class Shipping {
public:
    std::string schedule(const std::string& sku) const { return "shipped " + sku; }
};

// One simple entry point that owns the protocol: reserve, then charge, then ship.
// The subsystems stay public and usable on their own; the facade only removes the need to.
class OrderFacade {
public:
    std::string place(const std::string& sku, int cents) const {
        if (!inventory_.reserve(sku)) return "order failed";
        if (!payments_.charge(cents)) return "order failed";
        return shipping_.schedule(sku);
    }

private:
    Inventory inventory_;
    Payments payments_;
    Shipping shipping_;
};

int main() {
    const OrderFacade orders;
    std::cout << orders.place("lamp", 2500) << "\\n";
    std::cout << orders.place("out-of-stock", 900) << "\\n";
}
`,
    beforeOutput: "shipped lamp\norder failed",
    afterOutput: "shipped lamp\norder failed",
    refactorNotes: `The order-and-failure protocol now lives in \`OrderFacade::place\`: reserve, charge, ship, and fail fast. Callers get a single call and a result. The subsystems are untouched and still testable alone.

**Trade-off:** a facade can grow into a god class if every new use case is dumped into it. Keep one facade per cohesive task area, and let it delegate rather than reimplement.`,
    interviewSignal: `Use it to show layering: "the controller calls an OrderService facade; the facade orchestrates domain objects". Senior signal: you point out that the facade is where transaction boundaries and compensation (undo the reservation if payment fails) belong, and you keep it free of business rules that belong in the domain.`,
    overApplication: `A facade with one subsystem class behind it is a forwarding layer. A facade that every module must go through, including ones that need fine control, becomes a bottleneck and a god class. Add it when several callers repeat a protocol, not before.`,
  },
  {
    id: "flyweight",
    level: "L4",
    title: "Flyweight: share the heavy, identical part",
    oneLiner: "Split an object into shared immutable (intrinsic) state and per-instance (extrinsic) state, so thousands of objects share a few heavy ones.",
    cardTopic: "L4.flyweight",
    intro: `Flyweight is a **memory optimisation by sharing**. When many objects carry the same heavy data (a tree model, a glyph, a texture, an interned string), keep one immutable copy and let each instance hold a pointer to it plus its own small state (position).

It needs three things: the shared part must be **immutable** (or sharing is a bug), a **factory** that returns the existing instance for a key, and a clear split between **intrinsic** (shared) and **extrinsic** (per-instance) state. It is a measured optimisation, not a default: confirm the duplicate data is actually the memory cost first.`,
    smell: `- Thousands of objects, each with an identical copy of a big field.
- Memory or load time grows linearly with the object count.
- The same asset is loaded or built over and over.
- Profiling shows duplicate strings, meshes or tables.`,
    before: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

static int g_modelsBuilt = 0;

// Heavy, identical-for-every-oak data is copied into every single tree.
class Tree {
public:
    Tree(int x, int y, const std::string& species) : x_(x), y_(y), species_(species) {
        ++g_modelsBuilt;  // stands for loading a mesh and textures for this tree
    }
    int x() const { return x_; }

private:
    int x_;
    int y_;
    std::string species_;
};

int main() {
    std::vector<Tree> forest;
    for (int i = 0; i < 1000; ++i) forest.emplace_back(i, i, i % 2 == 0 ? "oak" : "pine");
    std::cout << "trees: " << forest.size() << ", models built: " << g_modelsBuilt << "\\n";
}
`,
    after: `#include <iostream>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

static int g_modelsBuilt = 0;

// Intrinsic state: identical for every tree of a species, immutable, shareable.
class TreeModel {
public:
    explicit TreeModel(std::string species) : species_(std::move(species)) {
        ++g_modelsBuilt;  // stands for loading a mesh and textures once per species
    }
    const std::string& species() const { return species_; }

private:
    std::string species_;
};

// The factory hands out one shared model per species.
class TreeModelFactory {
public:
    std::shared_ptr<const TreeModel> get(const std::string& species) {
        auto it = models_.find(species);
        if (it == models_.end()) it = models_.emplace(species, std::make_shared<const TreeModel>(species)).first;
        return it->second;
    }

private:
    std::map<std::string, std::shared_ptr<const TreeModel>> models_;
};

// Extrinsic state (position) stays in the tree; the heavy part is a pointer to the shared flyweight.
class Tree {
public:
    Tree(int x, int y, std::shared_ptr<const TreeModel> model) : x_(x), y_(y), model_(std::move(model)) {}
    int x() const { return x_; }
    const TreeModel& model() const { return *model_; }

private:
    int x_;
    int y_;
    std::shared_ptr<const TreeModel> model_;
};

int main() {
    TreeModelFactory models;
    std::vector<Tree> forest;
    for (int i = 0; i < 1000; ++i) forest.emplace_back(i, i, models.get(i % 2 == 0 ? "oak" : "pine"));
    std::cout << "trees: " << forest.size() << ", models built: " << g_modelsBuilt << "\\n";
}
`,
    beforeOutput: "trees: 1000, models built: 1000",
    afterOutput: "trees: 1000, models built: 2",
    refactorNotes: `The harness counts how many models are built: 1000 before, 2 after (one per species). Each \`Tree\` now stores a position and a \`std::shared_ptr<const TreeModel>\`; \`const\` makes the immutability explicit, and the factory owns the cache.

**Trade-off:** extra indirection per access, a lookup on creation, and shared ownership instead of simple value semantics. The factory also keeps models alive until it is cleared, so a long-lived cache needs an eviction story. Thread-safety needs a lock or pre-population.`,
    interviewSignal: `Tie it to a number: "a million trees, 4 species, 50 KB model: 50 GB versus 200 KB plus positions". Interviewers like the intrinsic/extrinsic vocabulary and the immutability point. Senior signal: you mention interning, \`std::shared_ptr\` cost versus plain indices into a table, and cache-friendliness.`,
    overApplication: `Applying it to small objects or low counts costs more than it saves (pointer chasing, a map lookup, lifetime complexity). Mutable shared state is worse still: one object's change leaks into the others. Measure first.`,
  },
  {
    id: "proxy",
    level: "L4",
    title: "Proxy: control access behind the same interface",
    oneLiner: "Stand in for another object with the same interface to add lazy loading, caching, access checks or remote calls without the caller noticing.",
    cardTopic: "L4.proxy",
    intro: `A Proxy has the **same interface** as the real subject and decides when and how to forward. Common kinds: a **virtual proxy** (create the expensive object on first use), a **protection proxy** (check permissions), a **caching proxy**, a **remote proxy** (a stub that talks over the network), and a **smart reference** (\`std::shared_ptr\` is one).

The difference from Decorator is intent: a decorator adds a responsibility and is stacked; a proxy governs access to the object and usually manages its lifecycle. The difference from Adapter is that the interface does not change.`,
    smell: `- Expensive objects are built up front but often never used.
- Access checks or caching code is mixed into the real class.
- Callers know whether the object is local or remote.
- Start-up time or memory is dominated by things nobody touched.`,
    before: `#include <iostream>
#include <string>
#include <utility>

// Constructing a Photo does the expensive load immediately, whether or not anyone ever views it.
class Photo {
public:
    explicit Photo(std::string path) : path_(std::move(path)) { std::cout << "loading " << path_ << "\\n"; }
    void show() const { std::cout << "showing " << path_ << "\\n"; }

private:
    std::string path_;
};

int main() {
    const Photo a("a.png");
    const Photo b("b.png");
    const Photo c("c.png");
    b.show();
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>

class Image {
public:
    virtual ~Image() = default;
    virtual void show() const = 0;
};

class Photo : public Image {
public:
    explicit Photo(std::string path) : path_(std::move(path)) { std::cout << "loading " << path_ << "\\n"; }
    void show() const override { std::cout << "showing " << path_ << "\\n"; }

private:
    std::string path_;
};

// A virtual proxy: same interface as Photo, but it defers the expensive load until the first show().
// Callers cannot tell the difference, which is the point (and the risk: latency now hides in show()).
class LazyPhoto : public Image {
public:
    explicit LazyPhoto(std::string path) : path_(std::move(path)) {}
    void show() const override {
        if (!real_) real_ = std::make_unique<Photo>(path_);
        real_->show();
    }

private:
    std::string path_;
    mutable std::unique_ptr<Photo> real_;
};

int main() {
    const LazyPhoto a("a.png");
    const LazyPhoto b("b.png");
    const LazyPhoto c("c.png");
    b.show();
    b.show();
}
`,
    beforeOutput: "loading a.png\nloading b.png\nloading c.png\nshowing b.png",
    afterOutput: "loading b.png\nshowing b.png\nshowing b.png",
    refactorNotes: `Constructing three \`LazyPhoto\` objects loads nothing; the first \`show()\` on \`b\` loads it once and later calls reuse it. The proxy owns the real photo through \`std::unique_ptr\` and uses \`mutable\` because lazy creation does not change the logical state.

**Trade-off:** the cost moves to the first call, so latency hides behind an innocent-looking method. A lazy proxy is also not thread-safe unless you add \`std::call_once\` or a lock. Remote proxies must expose failure (timeouts), because a network call is not a local call.`,
    interviewSignal: `Name the kind of proxy you want and why: "lazy for start-up, protection for permissions, caching for read-heavy calls". Senior signal: you say what the proxy must not hide (failure and latency of remote calls) and you can compare it with Decorator and Adapter in one sentence each.`,
    overApplication: `A proxy in front of a cheap object only adds a type and a call. Hiding a remote call behind a local-looking interface invites loops of network calls; give remote operations explicit, coarse-grained APIs with errors in the type.`,
  },
];
