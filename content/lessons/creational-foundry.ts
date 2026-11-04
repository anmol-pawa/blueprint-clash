import type { Lesson } from "@/lib/lessons/model";

/**
 * Creational Foundry lessons (CURRICULUM L3). Original wording. Every `before`/`after` program is compiled and run
 * natively by content:verify, and every `after` must pass Senior Review with no blocker or major.
 */
export const CREATIONAL_FOUNDRY_LESSONS: Lesson[] = [
  {
    id: "factory-method",
    level: "L3",
    title: "Factory Method: let subclasses choose the product",
    oneLiner: "Write the algorithm against an interface and defer the choice of concrete class to an overridable creation method.",
    cardTopic: "L3.factory-method",
    intro: `Factory Method is a **virtual function that returns a product**. A base class (the Creator) owns an algorithm that needs a Document, but it does not decide which concrete Document; a subclass overrides \`makeDocument()\` and the algorithm runs unchanged.

Do not confuse three things interviewers often blur: a **simple factory** (one function with a \`switch\`; fine and common), **Factory Method** (inheritance: the subclass decides) and **Abstract Factory** (a family of related products). In modern C++ you can often replace the subclass with a \`std::function<std::unique_ptr<Document>()>\` or a registry map from name to creator; reach for the inheritance form when the creation choice travels with other per-variant behaviour.`,
    smell: `- \`if (kind == "...") new Concrete...\` repeated in several places.
- Adding a variant means finding every switch on the kind tag.
- Code that should be reusable is tied to concrete classes by \`#include\`.
- Tests of the algorithm cannot substitute a fake product.`,
    before: `#include <iostream>
#include <string>

struct HtmlDocument {
    std::string render(const std::string& body) const { return "<p>" + body + "</p>"; }
};
struct MarkdownDocument {
    std::string render(const std::string& body) const { return "# " + body; }
};

// The publisher knows every concrete document type. A new format edits this function,
// and any other function that switches on \`kind\` has to be found and edited too.
void publish(const std::string& kind, const std::string& body) {
    if (kind == "html") {
        HtmlDocument doc;
        std::cout << doc.render(body) << "\\n";
    } else if (kind == "markdown") {
        MarkdownDocument doc;
        std::cout << doc.render(body) << "\\n";
    } else {
        std::cout << "unknown format\\n";
    }
}

int main() {
    publish("html", "hello");
    publish("markdown", "hello");
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>

// Product: what the publishing algorithm needs from a document.
class Document {
public:
    virtual ~Document() = default;
    virtual std::string render(const std::string& body) const = 0;
};

class HtmlDocument : public Document {
public:
    std::string render(const std::string& body) const override { return "<p>" + body + "</p>"; }
};

class MarkdownDocument : public Document {
public:
    std::string render(const std::string& body) const override { return "# " + body; }
};

// Creator: the algorithm is written once against Document; subclasses choose the product.
class Publisher {
public:
    virtual ~Publisher() = default;
    void publish(const std::string& body) const {
        const std::unique_ptr<Document> doc = makeDocument();
        std::cout << doc->render(body) << "\\n";
    }

protected:
    virtual std::unique_ptr<Document> makeDocument() const = 0;
};

class WebPublisher : public Publisher {
protected:
    std::unique_ptr<Document> makeDocument() const override { return std::make_unique<HtmlDocument>(); }
};

class WikiPublisher : public Publisher {
protected:
    std::unique_ptr<Document> makeDocument() const override { return std::make_unique<MarkdownDocument>(); }
};

int main() {
    const WebPublisher web;
    const WikiPublisher wiki;
    web.publish("hello");
    wiki.publish("hello");
}
`,
    beforeOutput: "<p>hello</p>\n# hello",
    afterOutput: "<p>hello</p>\n# hello",
    refactorNotes: `The publishing algorithm is written once, against \`Document\`. Adding a PDF format is a new \`PdfDocument\` and a new \`PdfPublisher\`; nothing that already works is edited, which is what a Change Storm rewards.

**Trade-off:** you pay a parallel hierarchy (one Creator subclass per product). If creators carry no other behaviour, a registry or a \`std::function\` is lighter. The factory function returns \`std::unique_ptr\` so ownership is explicit and the product is destroyed through its virtual destructor.`,
    interviewSignal: `Name the variation point before you draw boxes: "format is the thing that will change, so creation of the document is a seam". Then say which flavour you chose (simple factory, Factory Method or registry) and why. Senior signal: you mention that the registry version lets plugins register without editing the factory.`,
    overApplication: `A factory in front of a class with one implementation and no foreseeable second one is ceremony: it adds a type, an indirection and a file for nothing. Create the seam when the second variant is real or a test needs a fake, not before (YAGNI). Deep Creator hierarchies also make the code hard to follow.`,
  },
  {
    id: "abstract-factory",
    level: "L3",
    title: "Abstract Factory: families that stay consistent",
    oneLiner: "Create whole families of related objects through one interface, so you can never mix families.",
    cardTopic: "L3.abstract-factory",
    intro: `Abstract Factory is an interface with **one creation method per product in a family** (button, checkbox, ...), and one concrete factory per family (light, dark). The client holds only the interface, so it gets a consistent family by construction.

Use it when the consistency between products is the requirement: themes, database drivers (connection, statement, transaction), cross-platform widget sets. If products are independent, plain factories are enough.`,
    smell: `- The same \`switch (theme)\` appears in several creation functions.
- A bug where one widget is dark and its neighbour is light.
- Adding a new family means editing many functions in many files.
- Client code names concrete classes.`,
    before: `#include <iostream>
#include <string>

enum class Theme { Light, Dark };

// Every widget function switches on the theme. Mixing a dark button with a light checkbox
// is one forgotten branch away, and a third theme edits every function.
std::string makeButton(Theme t) { return t == Theme::Dark ? "[dark button]" : "[light button]"; }
std::string makeCheckbox(Theme t) { return t == Theme::Dark ? "[dark checkbox]" : "[light checkbox]"; }

void buildDialog(Theme t) {
    std::cout << makeButton(t) << " " << makeCheckbox(t) << "\\n";
}

int main() {
    buildDialog(Theme::Light);
    buildDialog(Theme::Dark);
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>

class Button {
public:
    virtual ~Button() = default;
    virtual std::string draw() const = 0;
};

class Checkbox {
public:
    virtual ~Checkbox() = default;
    virtual std::string draw() const = 0;
};

// The family interface: one factory creates widgets that are guaranteed to belong together.
class WidgetFactory {
public:
    virtual ~WidgetFactory() = default;
    virtual std::unique_ptr<Button> createButton() const = 0;
    virtual std::unique_ptr<Checkbox> createCheckbox() const = 0;
};

class LightButton : public Button {
public:
    std::string draw() const override { return "[light button]"; }
};
class LightCheckbox : public Checkbox {
public:
    std::string draw() const override { return "[light checkbox]"; }
};
class LightFactory : public WidgetFactory {
public:
    std::unique_ptr<Button> createButton() const override { return std::make_unique<LightButton>(); }
    std::unique_ptr<Checkbox> createCheckbox() const override { return std::make_unique<LightCheckbox>(); }
};

class DarkButton : public Button {
public:
    std::string draw() const override { return "[dark button]"; }
};
class DarkCheckbox : public Checkbox {
public:
    std::string draw() const override { return "[dark checkbox]"; }
};
class DarkFactory : public WidgetFactory {
public:
    std::unique_ptr<Button> createButton() const override { return std::make_unique<DarkButton>(); }
    std::unique_ptr<Checkbox> createCheckbox() const override { return std::make_unique<DarkCheckbox>(); }
};

// Client code never names a concrete widget, so it cannot mix families.
void buildDialog(const WidgetFactory& factory) {
    const auto button = factory.createButton();
    const auto checkbox = factory.createCheckbox();
    std::cout << button->draw() << " " << checkbox->draw() << "\\n";
}

int main() {
    buildDialog(LightFactory());
    buildDialog(DarkFactory());
}
`,
    beforeOutput: "[light button] [light checkbox]\n[dark button] [dark checkbox]",
    afterOutput: "[light button] [light checkbox]\n[dark button] [dark checkbox]",
    refactorNotes: `Adding a third theme is one new factory and its products: no existing function changes (Open/Closed along the family axis). The client cannot create a mixed set because it never names a concrete widget.

**Trade-off, and the deciding factor:** Abstract Factory is closed along the other axis. Adding a new product kind (a slider) means editing the factory interface and every concrete factory. Choose it when families change more often than product kinds; if product kinds change more, prefer a different decomposition.`,
    interviewSignal: `State the axis of change explicitly: "new themes are likely, new widget kinds are rare, so Abstract Factory fits". Interviewers probe the downside, so volunteer the rigidity when adding a product kind. Staff-level answers also mention that factories can be passed as constructor dependencies instead of being global.`,
    overApplication: `A factory interface for a single product is just Factory Method with extra steps. Families that never vary (only one theme will ever exist) turn every widget into three classes for no benefit. Count the real families before you build the interface.`,
  },
  {
    id: "builder",
    level: "L3",
    title: "Builder: readable construction with validation",
    oneLiner: "Collect optional parameters step by step, validate once in build(), and hand back an immutable object.",
    cardTopic: "L3.builder",
    intro: `A Builder separates **assembling** an object from **the object itself**. The fluent form (\`.method("POST").timeoutSeconds(5).build()\`) names every option at the call site, supplies defaults, and gives you one place to enforce rules that span several fields, such as "a GET cannot have a body".

C++ alternatives matter in an interview: a plain struct with **designated initializers** (C++20) gives named fields without any builder, and is the right answer for simple data. Use a Builder when construction has rules, many optional parts or must produce an immutable object. A **step builder** goes further and uses types to force required steps in order.`,
    smell: `- Constructors with five or more parameters, several of the same type.
- Call sites like \`Request(u, "GET", 30, true, "")\`.
- Many overloaded constructors for each combination of options (telescoping).
- Invalid combinations are only caught later, deep in the code.`,
    before: `#include <iostream>
#include <string>

// A telescoping constructor: what do \`30\`, \`true\` and \`""\` mean at the call site?
// Every new option adds a parameter and breaks every caller.
class HttpRequest {
public:
    HttpRequest(std::string url, std::string method, int timeoutSeconds, bool followRedirects, std::string body)
        : url_(url), method_(method), timeout_(timeoutSeconds), follow_(followRedirects), body_(body) {}
    void describe() const {
        std::cout << method_ << " " << url_ << " timeout=" << timeout_ << " follow=" << follow_ << " body=" << body_.size() << "\\n";
    }

private:
    std::string url_, method_;
    int timeout_;
    bool follow_;
    std::string body_;
};

int main() {
    HttpRequest a("https://example.test/a", "GET", 30, true, "");
    HttpRequest b("https://example.test/b", "POST", 5, false, "{}");  // a GET with a body slips through too
    a.describe();
    b.describe();
}
`,
    after: `#include <iostream>
#include <stdexcept>
#include <string>
#include <utility>

// Immutable product: once built it is valid for its whole life.
class HttpRequest {
public:
    const std::string& url() const { return url_; }
    const std::string& method() const { return method_; }
    int timeoutSeconds() const { return timeoutSeconds_; }
    bool followRedirects() const { return followRedirects_; }
    const std::string& body() const { return body_; }

private:
    friend class HttpRequestBuilder;  // only the builder can create or fill a request
    HttpRequest() = default;
    std::string url_;
    std::string method_ = "GET";
    int timeoutSeconds_ = 30;
    bool followRedirects_ = true;
    std::string body_;
};

class HttpRequestBuilder {
public:
    explicit HttpRequestBuilder(std::string url) { request_.url_ = std::move(url); }
    HttpRequestBuilder& method(std::string m) { request_.method_ = std::move(m); return *this; }
    HttpRequestBuilder& timeoutSeconds(int s) { request_.timeoutSeconds_ = s; return *this; }
    HttpRequestBuilder& followRedirects(bool f) { request_.followRedirects_ = f; return *this; }
    HttpRequestBuilder& body(std::string b) { request_.body_ = std::move(b); return *this; }

    // Cross-field rules live in one place and run before the object exists.
    HttpRequest build() const {
        if (request_.url_.empty()) throw std::invalid_argument("url is required");
        if (request_.timeoutSeconds_ <= 0) throw std::invalid_argument("timeout must be positive");
        if (request_.method_ == "GET" && !request_.body_.empty()) throw std::invalid_argument("GET cannot carry a body");
        return request_;
    }

private:
    HttpRequest request_;
};

void describe(const HttpRequest& r) {
    std::cout << r.method() << " " << r.url() << " timeout=" << r.timeoutSeconds()
              << " follow=" << r.followRedirects() << " body=" << r.body().size() << "\\n";
}

int main() {
    describe(HttpRequestBuilder("https://example.test/a").build());
    describe(HttpRequestBuilder("https://example.test/b").method("POST").body("{}").timeoutSeconds(5).followRedirects(false).build());
    try {
        HttpRequestBuilder("https://example.test/c").body("{}").build();
    } catch (const std::invalid_argument& e) {
        std::cout << "rejected: " << e.what() << "\\n";
    }
}
`,
    beforeOutput: "GET https://example.test/a timeout=30 follow=1 body=0\nPOST https://example.test/b timeout=5 follow=0 body=2",
    afterOutput: "GET https://example.test/a timeout=30 follow=1 body=0\nPOST https://example.test/b timeout=5 follow=0 body=2\nrejected: GET cannot carry a body",
    refactorNotes: `Call sites now read like sentences, defaults live in one place, and \`build()\` rejects an invalid combination before an invalid object can exist. \`HttpRequest\` has no setters, so it is safe to share across threads.

**Trade-off:** more code than a constructor, and a friend class to keep in step with the product. Because \`build()\` copies the product, a Builder can be reused as a template. The exception here is for illustration; in an exception-free codebase return \`std::optional\` or an error value instead.`,
    interviewSignal: `Say what the builder buys you: "named parameters, defaults and validation in one place". Mention designated initializers as the lightweight alternative. Seniors point out that validation belongs in build(), not in each setter, because rules often span fields.`,
    overApplication: `A builder for a three-field value type is noise; an aggregate with designated initializers is clearer. Builders also duplicate every field once more, and a builder whose build() does no validation is just a verbose struct.`,
  },
  {
    id: "prototype",
    level: "L3",
    title: "Prototype: copy through the base pointer",
    oneLiner: "Give objects a virtual clone() so you can copy them without knowing their concrete type.",
    cardTopic: "L3.prototype",
    intro: `Prototype means **the object copies itself**. Holding a \`Shape*\` you cannot call the copy constructor of the unknown derived class (and copying by value through the base would slice it). A virtual \`clone()\` solves that: each class returns a copy of its own dynamic type.

It is also how you create new objects from configured examples: keep a few pre-built "prototype" objects and clone them to stamp out new ones, which is handy when construction is expensive or heavily configured.`,
    smell: `- A \`switch\` on a kind tag that copies each type by hand.
- A field is added to a class and copies silently lose it.
- Object slicing: copying a derived object into a base-typed variable.
- Code that needs a "copy of whatever this is" cannot be written against the interface.`,
    before: `#include <iostream>
#include <memory>
#include <string>

enum class Kind { Circle, Label };

struct Shape {
    Kind kind;
    int size;
    std::string text;  // added later, for labels
};

// The copier switches on the kind. When Label (with its new \`text\` field) was added, nobody
// updated this function, so copies silently lose the text. No compiler warning, no failing build.
std::unique_ptr<Shape> copyShape(const Shape& s) {
    switch (s.kind) {
        case Kind::Circle: return std::make_unique<Shape>(Shape{Kind::Circle, s.size, ""});
        case Kind::Label: return std::make_unique<Shape>(Shape{Kind::Label, s.size, ""});  // forgot s.text
    }
    return nullptr;
}

int main() {
    Shape original{Kind::Label, 12, "Title"};
    auto copy = copyShape(original);
    std::cout << "original='" << original.text << "' copy='" << copy->text << "'\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>

class Shape {
public:
    virtual ~Shape() = default;
    // The object knows how to copy itself, whatever its dynamic type is.
    virtual std::unique_ptr<Shape> clone() const = 0;
    virtual std::string describe() const = 0;
    virtual void grow(int by) = 0;
};

class Circle : public Shape {
public:
    explicit Circle(int radius) : radius_(radius) {}
    // C++ cannot return unique_ptr<Circle> here (unique_ptr is not covariant),
    // so every override returns the base smart pointer.
    std::unique_ptr<Shape> clone() const override { return std::make_unique<Circle>(*this); }
    std::string describe() const override { return "circle r=" + std::to_string(radius_); }
    void grow(int by) override { radius_ += by; }

private:
    int radius_;
};

class Label : public Shape {
public:
    Label(std::string text, int size) : text_(std::move(text)), size_(size) {}
    std::unique_ptr<Shape> clone() const override { return std::make_unique<Label>(*this); }
    std::string describe() const override { return "label '" + text_ + "' size=" + std::to_string(size_); }
    void grow(int by) override { size_ += by; }

private:
    std::string text_;
    int size_;
};

int main() {
    const std::unique_ptr<Shape> prototype = std::make_unique<Label>("Title", 12);
    auto copy = prototype->clone();  // a deep, independent copy through the base pointer
    copy->grow(8);
    std::cout << prototype->describe() << "\\n" << copy->describe() << "\\n";
    const auto circle = Circle(3).clone();
    std::cout << circle->describe() << "\\n";
}
`,
    beforeOutput: "original='Title' copy=''",
    afterOutput: "label 'Title' size=12\nlabel 'Title' size=20\ncircle r=3",
    refactorNotes: `Each class copies itself with its own copy constructor, so adding a field cannot be forgotten in a distant switch: the compiler-generated copy constructor handles it. The caller works only with \`Shape\`.

**C++ catch:** \`unique_ptr<Circle>\` is not covariant with \`unique_ptr<Shape>\`, so the override returns the base smart pointer. Another catch: \`clone()\` must be overridden in every concrete class, and the compiler will not remind you if you forget in a deeper subclass. A CRTP helper can automate it at the cost of more complex code. Clones are **deep** here because the members own their data; with raw pointer members you would need to decide deliberately.`,
    interviewSignal: `Mention slicing and the covariance limitation of smart pointers; that shows real C++ depth. Say whether the copy is deep or shallow and why. Also say when you would not do this: a closed set of types fits \`std::variant\`, which copies for free.`,
    overApplication: `If the object is a plain value type, just copy it. A clone() on every class in a hierarchy that never needs polymorphic copying is boilerplate that has to be kept in sync with each new subclass.`,
  },
  {
    id: "singleton",
    level: "L3",
    title: "Singleton: one instance, and why to be careful",
    oneLiner: "Guarantee a single instance with a function-local static, but pass it in as a dependency instead of reaching for it.",
    cardTopic: "L3.singleton",
    intro: `A Singleton ensures **one instance and a global access point**. The correct modern C++ implementation is the **Meyers singleton**: a function-local \`static\`. Since C++11 its initialisation is thread-safe (the standard guarantees exactly-once initialisation even if several threads arrive together), and it is destroyed at program exit. Delete the copy operations and make the constructor private.

The honest critique: a singleton is a **global variable with a nicer name**. It hides dependencies, couples every caller to a concrete class, and makes tests share state. The thread-safe creation does not make the object's methods thread-safe: you still need a mutex or atomics inside it.`,
    smell: `- \`Logger::instance()\` calls scattered inside business logic.
- A hand-rolled \`if (!instance_) instance_ = new ...\` (a data race, plus a leak).
- Tests that fail depending on run order because they share the instance.
- A class whose constructor signature hides what it really depends on.`,
    before: `#include <iostream>
#include <string>

// A classic singleton: global state with a hidden, hard-wired dependency.
class Logger {
public:
    static Logger& instance() {
        if (instance_ == nullptr) instance_ = new Logger();  // racy if two threads arrive together
        return *instance_;
    }
    void log(const std::string& msg) { std::cout << "LOG " << msg << "\\n"; }

private:
    Logger() = default;
    static Logger* instance_;
};
Logger* Logger::instance_ = nullptr;

class OrderService {
public:
    // Nothing in the signature says this class writes logs, and a test cannot intercept them.
    void place(int id) { Logger::instance().log("order " + std::to_string(id)); }
};

int main() {
    OrderService().place(7);
}
`,
    after: `#include <iostream>
#include <string>
#include <vector>

class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(const std::string& msg) = 0;
};

// The one real logger. A function-local static is initialised exactly once and thread-safely
// since C++11, and is destroyed at exit; no manual locking and no leaked raw pointer.
class ConsoleLogger : public Logger {
public:
    static ConsoleLogger& instance() {
        static ConsoleLogger logger;
        return logger;
    }
    ConsoleLogger(const ConsoleLogger&) = delete;
    ConsoleLogger& operator=(const ConsoleLogger&) = delete;
    void log(const std::string& msg) override { std::cout << "LOG " << msg << "\\n"; }

private:
    ConsoleLogger() = default;
};

class RecordingLogger : public Logger {
public:
    void log(const std::string& msg) override { lines_.push_back(msg); }
    const std::vector<std::string>& lines() const { return lines_; }

private:
    std::vector<std::string> lines_;
};

// The business class asks for a Logger; it does not know a singleton exists.
class OrderService {
public:
    explicit OrderService(Logger& logger) : logger_(logger) {}
    void place(int id) { logger_.log("order " + std::to_string(id)); }

private:
    Logger& logger_;
};

int main() {
    OrderService production(ConsoleLogger::instance());  // the composition root picks the singleton
    production.place(7);

    RecordingLogger recorder;  // a test passes a fake instead
    OrderService underTest(recorder);
    underTest.place(8);
    std::cout << "recorded " << recorder.lines().size() << ": " << recorder.lines().front() << "\\n";
}
`,
    beforeOutput: "LOG order 7",
    afterOutput: "LOG order 7\nrecorded 1: order 8",
    refactorNotes: `The singleton still exists, but only the **composition root** (\`main\`) touches it. \`OrderService\` asks for a \`Logger&\`, so a test passes a \`RecordingLogger\` and checks what was logged. Uniqueness is now a deployment decision, not a hard-wired language feature.

**Trade-off:** you pass an extra constructor argument around. In return you get testability, visible dependencies and the freedom to have two instances later. Remaining Meyers caveat: static destruction order across translation units, so avoid using a singleton from another static object's destructor.`,
    interviewSignal: `The expected answer has three parts: implement it correctly (Meyers), name its costs (global state, hidden coupling, testability), and offer the alternative (dependency injection with a single instance created in main). Interviewers at senior level want you to say "I'd avoid it unless the resource is truly unique, and even then I'd inject it".`,
    overApplication: `Making things singletons "because we only need one" turns configuration, caches, loggers and databases into globals. Needing one instance is a wiring decision; it rarely needs to be a language-level guarantee. Prefer creating it once in main and passing it down.`,
  },
  {
    id: "object-pool",
    level: "L3",
    title: "Object Pool: reuse expensive objects",
    oneLiner: "Keep a fixed set of costly objects and lend them out, returning them automatically with RAII.",
    cardTopic: "L3.object-pool",
    intro: `An Object Pool pre-creates objects that are **expensive to build or limited in number** (database connections, threads, large buffers) and lends them to callers. The pool bounds resource use and removes the cost of repeated creation.

The C++ idiom is a **lease**: a \`unique_ptr\` with a custom deleter that returns the object to the pool instead of deleting it. The caller cannot forget to release, even on an early return or an exception. Decide what happens when the pool is empty: block, fail fast (shown here), grow, or shed load.`,
    smell: `- Opening and closing a connection (or allocating a big buffer) per request.
- Latency spikes caused by creation cost.
- Unbounded resource use under load, hitting a server's connection limit.
- Manual \`acquire()\`/\`release()\` pairs that leak when an error path skips the release.`,
    before: `#include <iostream>

class Connection {
public:
    explicit Connection(int id) : id_(id) { std::cout << "open " << id_ << "\\n"; }
    ~Connection() { std::cout << "close " << id_ << "\\n"; }
    int id() const { return id_; }

private:
    int id_;
};

// Pretend opening a connection costs a network round trip. Every request pays it again.
void handleRequest(int requestId) {
    Connection conn(requestId);
    std::cout << "request " << requestId << " used connection " << conn.id() << "\\n";
}

int main() {
    handleRequest(1);
    handleRequest(2);
    handleRequest(3);
}
`,
    after: `#include <cstddef>
#include <iostream>
#include <memory>
#include <vector>

class Connection {
public:
    explicit Connection(int id) : id_(id) { std::cout << "open " << id_ << "\\n"; }
    ~Connection() { std::cout << "close " << id_ << "\\n"; }
    int id() const { return id_; }

private:
    int id_;
};

// A fixed-size pool. A lease is a unique_ptr whose deleter hands the object back instead of
// destroying it, so a caller cannot forget to release (RAII). The pool must outlive its leases.
class ConnectionPool {
public:
    explicit ConnectionPool(std::size_t size) {
        for (std::size_t i = 0; i < size; ++i) idle_.push_back(std::make_unique<Connection>(static_cast<int>(i)));
    }

    class Returner {
    public:
        explicit Returner(ConnectionPool* pool) : pool_(pool) {}
        void operator()(Connection* c) const { pool_->giveBack(c); }

    private:
        ConnectionPool* pool_;
    };
    using Lease = std::unique_ptr<Connection, Returner>;

    // Returns an empty lease when exhausted: the caller decides whether to wait, fail or shed load.
    Lease acquire() {
        if (idle_.empty()) return Lease(nullptr, Returner(this));
        Connection* c = idle_.back().release();
        idle_.pop_back();
        return Lease(c, Returner(this));
    }
    std::size_t idleCount() const { return idle_.size(); }

private:
    void giveBack(Connection* c) { idle_.push_back(std::unique_ptr<Connection>(c)); }
    std::vector<std::unique_ptr<Connection>> idle_;
};

void handleRequest(ConnectionPool& pool, int requestId) {
    ConnectionPool::Lease lease = pool.acquire();
    if (!lease) {
        std::cout << "request " << requestId << " rejected: pool exhausted\\n";
        return;
    }
    std::cout << "request " << requestId << " used connection " << lease->id() << "\\n";
}  // the lease goes out of scope here and the connection returns to the pool

int main() {
    ConnectionPool pool(2);
    handleRequest(pool, 1);
    handleRequest(pool, 2);
    {
        auto a = pool.acquire();
        auto b = pool.acquire();
        handleRequest(pool, 3);  // both leased: rejected
    }
    std::cout << "idle " << pool.idleCount() << "\\n";
}
`,
    beforeOutput: "open 1\nrequest 1 used connection 1\nclose 1\nopen 2\nrequest 2 used connection 2\nclose 2\nopen 3\nrequest 3 used connection 3\nclose 3",
    afterOutput: "open 0\nopen 1\nrequest 1 used connection 1\nrequest 2 used connection 1\nrequest 3 rejected: pool exhausted\nidle 2\nclose 0\nclose 1",
    refactorNotes: `Two connections are opened once and reused by every request. The lease's deleter returns the connection when the scope ends, and an exhausted pool is an explicit, testable outcome rather than a crash.

**Trade-offs:** pooled objects are long-lived, so they must be reset to a clean state before reuse (stale state leaks between callers). The pool must outlive its leases. This version is single-threaded: a real pool needs a mutex around the idle list and a condition variable if callers wait. And a pool only pays off if creation is genuinely costly; measure first.`,
    interviewSignal: `Show the lease idea (RAII return) and name the policy for exhaustion. Mention reset-on-return, lifetime ordering (the pool outlives the leases) and thread safety. Many machine-coding rounds (connection pool, thread pool, rate limiter) are this pattern plus concurrency.`,
    overApplication: `Pooling cheap objects makes things slower and more complex than \`make_unique\`, since allocators are already fast. Pools also hide bugs: a dirty object handed to the next caller causes data leaks that are hard to reproduce.`,
  },
  {
    id: "di",
    level: "L3",
    title: "Dependency Injection: receive, do not construct",
    oneLiner: "A class should be given its collaborators (usually by constructor), not create them itself.",
    cardTopic: "L3.di",
    intro: `Dependency Injection (DI) is the practical form of the Dependency Inversion Principle: a class **receives** the things it depends on, as interfaces, instead of building them. The most common form is **constructor injection**, because the dependency is required, visible and fixed for the object's life.

Where does \`new\` go then? In the **composition root**, normally \`main\`, the one place that knows concrete types and decides lifetimes. A **DI container** (conceptually) automates that wiring using registered recipes; C++ has no runtime reflection, so containers rely on templates or lambdas. Hand-wiring is usually enough, and is what interviewers expect.`,
    smell: `- A class creates its own collaborators in its constructor or fields.
- You cannot unit test a class without a real network, file or clock.
- Changing a channel (email to SMS) edits the business class.
- Constructors that quietly start threads or open files.`,
    before: `#include <iostream>
#include <string>

class SmtpClient {
public:
    void send(const std::string& to, const std::string& text) { std::cout << "smtp -> " << to << ": " << text << "\\n"; }
};

// The service builds its own dependency: it cannot be tested without a real mail server,
// and switching to another channel means editing this class.
class WelcomeService {
public:
    void welcome(const std::string& user) { smtp_.send(user, "welcome!"); }

private:
    SmtpClient smtp_;
};

int main() {
    WelcomeService().welcome("ada");
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

class Notifier {
public:
    virtual ~Notifier() = default;
    virtual void notify(const std::string& to, const std::string& text) = 0;
};

class SmtpNotifier : public Notifier {
public:
    void notify(const std::string& to, const std::string& text) override { std::cout << "smtp -> " << to << ": " << text << "\\n"; }
};

class SmsNotifier : public Notifier {
public:
    void notify(const std::string& to, const std::string& text) override { std::cout << "sms -> " << to << ": " << text << "\\n"; }
};

class FakeNotifier : public Notifier {
public:
    void notify(const std::string& to, const std::string&) override { sent_.push_back(to); }
    const std::vector<std::string>& sent() const { return sent_; }

private:
    std::vector<std::string> sent_;
};

// Constructor injection: the dependency is visible, required and swappable.
// The service borrows the notifier; the caller decides who owns it.
class WelcomeService {
public:
    explicit WelcomeService(Notifier& notifier) : notifier_(notifier) {}
    void welcome(const std::string& user) { notifier_.notify(user, "welcome!"); }

private:
    Notifier& notifier_;
};

int main() {
    // The composition root is the one place that knows the concrete types and their lifetimes.
    // This is hand-written DI; a DI container only automates this wiring when the graph gets large.
    SmtpNotifier smtp;
    SmsNotifier sms;
    WelcomeService(smtp).welcome("ada");
    WelcomeService(sms).welcome("ada");

    FakeNotifier fake;
    WelcomeService(fake).welcome("grace");
    std::cout << "fake saw " << fake.sent().size() << " message(s) for " << fake.sent().front() << "\\n";
}
`,
    beforeOutput: "smtp -> ada: welcome!",
    afterOutput: "smtp -> ada: welcome!\nsms -> ada: welcome!\nfake saw 1 message(s) for grace",
    refactorNotes: `\`WelcomeService\` now depends on the \`Notifier\` abstraction. Email, SMS and a test fake all work without touching it. The signature tells the truth about what the class needs.

**Ownership choice:** a reference member says "borrowed, must outlive me", \`std::unique_ptr\` says "I own it" (sink), and \`std::shared_ptr\` says shared ownership (use sparingly). Pick deliberately and state it. **Trade-off:** more interfaces and a wiring step; a container adds indirection and makes control flow harder to trace.`,
    interviewSignal: `Say "constructor injection, wired in the composition root" and justify the ownership choice. Distinguish DI from the Service Locator (a hidden global registry, which is the Singleton problem again). Mentioning that a container is optional and what it costs is a senior signal.`,
    overApplication: `Injecting everything, including trivial value helpers and pure functions, produces huge constructors and interfaces with one implementation. Inject across real seams (I/O, time, randomness, other bounded contexts), and keep simple collaborators concrete.`,
  },
];
