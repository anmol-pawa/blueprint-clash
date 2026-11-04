import type { Lesson } from "@/lib/lessons/model";

/**
 * Structural Bridges lessons (CURRICULUM L4). Original wording. Every `before`/`after` program is compiled and run
 * natively by content:verify, and every `after` must pass Senior Review with no blocker or major.
 */
export const STRUCTURAL_BRIDGES_LESSONS: Lesson[] = [
  {
    id: "adapter",
    level: "L4",
    title: "Adapter: make the old interface fit the new caller",
    oneLiner: "Wrap a class you cannot (or should not) change so it speaks the interface your code already depends on.",
    cardTopic: "L4.adapter",
    intro: `An Adapter is a thin class that **implements the interface your code wants** and **forwards to the interface you were given**. The caller never learns that a legacy library, a vendor SDK or a generated client is underneath.

Two shapes exist. An **object adapter** holds the adaptee as a member (composition) and is what you want almost every time in C++. A **class adapter** inherits from the adaptee privately and from the target publicly; it needs multiple inheritance, ties you to one concrete adaptee and cannot adapt a subclass. Interviewers like to hear that you picked the object form and why.

An Adapter changes the shape of a call (units, names, argument order, error style). It should not add behaviour. If it starts caching or checking permissions, that is a Proxy; if it starts simplifying a whole subsystem, that is a Facade.`,
    smell: `- The same unit or format conversion is copy-pasted at every call site.
- Business code includes a vendor header or names a legacy type directly.
- Swapping the vendor means editing dozens of files.
- Tests need the real legacy system because there is no seam to fake.`,
    before: `#include <iostream>

// A legacy class we do not own. It reports Fahrenheit.
class LegacyThermometer {
public:
    explicit LegacyThermometer(double fahrenheit) : fahrenheit_(fahrenheit) {}
    double readFahrenheit() const { return fahrenheit_; }

private:
    double fahrenheit_;
};

// Every caller repeats the conversion and the legacy type leaks into business code.
void printReading(const LegacyThermometer& t) {
    std::cout << (t.readFahrenheit() - 32.0) * 5.0 / 9.0 << " C\\n";
}

bool isHot(const LegacyThermometer& t) {
    return (t.readFahrenheit() - 32.0) * 5.0 / 9.0 > 30.0;
}

int main() {
    const LegacyThermometer t(104.0);
    printReading(t);
    std::cout << (isHot(t) ? "hot" : "ok") << "\\n";
}
`,
    after: `#include <iostream>

// The legacy class, unchanged.
class LegacyThermometer {
public:
    explicit LegacyThermometer(double fahrenheit) : fahrenheit_(fahrenheit) {}
    double readFahrenheit() const { return fahrenheit_; }

private:
    double fahrenheit_;
};

// Target: the interface the application wants.
class TemperatureSource {
public:
    virtual ~TemperatureSource() = default;
    virtual double celsius() const = 0;
};

// Object adapter: owns a copy of the (cheap) adaptee and converts in exactly one place.
class FahrenheitAdapter : public TemperatureSource {
public:
    explicit FahrenheitAdapter(const LegacyThermometer& legacy) : legacy_(legacy) {}
    double celsius() const override { return (legacy_.readFahrenheit() - 32.0) * 5.0 / 9.0; }

private:
    LegacyThermometer legacy_;
};

// A native implementation needs no adapter.
class CelsiusProbe : public TemperatureSource {
public:
    explicit CelsiusProbe(double celsius) : celsius_(celsius) {}
    double celsius() const override { return celsius_; }

private:
    double celsius_;
};

void printReading(const TemperatureSource& source) { std::cout << source.celsius() << " C\\n"; }
bool isHot(const TemperatureSource& source) { return source.celsius() > 30.0; }

int main() {
    const FahrenheitAdapter legacy{LegacyThermometer(104.0)};
    const CelsiusProbe modern(25.0);
    printReading(legacy);
    std::cout << (isHot(legacy) ? "hot" : "ok") << "\\n";
    printReading(modern);
    std::cout << (isHot(modern) ? "hot" : "ok") << "\\n";
}
`,
    beforeOutput: "40 C\nhot",
    afterOutput: "40 C\nhot\n25 C\nok",
    refactorNotes: `Application code now depends on \`TemperatureSource\` and never sees Fahrenheit. The conversion lives in one class with one test, and a second sensor type (here a native Celsius probe) plugs in without touching \`printReading\` or \`isHot\`.

**Trade-off:** an extra class and a virtual call per reading. That is nothing next to the cost of a vendor type leaking everywhere, but if you have exactly one call site and no plans to swap the library, a local helper function is a perfectly honest answer. The adapter stores the adaptee by value because it is small; for a heavyweight adaptee hold a \`std::unique_ptr\` or a reference and state who owns the lifetime.`,
    interviewSignal: `Say "this is a seam against something I do not control". Name the object-versus-class adapter choice and pick composition. Senior signal: you keep the adapter free of business rules, mention that it is where you translate error models (error codes to exceptions or \`std::optional\`) as well as units, and point out that it makes the vendor replaceable and fakeable in tests.`,
    overApplication: `Adapting your own code is a smell: if you control both sides, change one of them instead of stacking a wrapper. A pile of adapters can also hide a bad abstraction, because every layer is a place where meaning can be lost or a performance cost (copies, allocations) can creep in. One adapter per foreign boundary is healthy; adapters between your own modules usually are not.`,
  },
  {
    id: "bridge",
    level: "L4",
    title: "Bridge: two dimensions that vary independently",
    oneLiner: "Split an abstraction from its implementation so each can grow on its own, instead of one subclass per combination.",
    cardTopic: "L4.bridge",
    intro: `Bridge is **composition used to avoid a subclass grid**. When a type varies along two axes (what kind of message, and over which channel), inheritance gives you one class per pair: \`AlertByEmail\`, \`AlertBySms\`, \`ReminderByEmail\`, \`ReminderBySms\`. Add a third channel and you add a class per message kind; add a third message kind and you add one per channel. That is M times N.

Bridge puts one axis behind an interface and **holds it as a member** of the other. The abstraction (Notification and its subclasses) delegates the low-level work to the implementor (Channel and its subclasses). M plus N classes instead of M times N.

Bridge is decided up front, at design time, and is about two hierarchies. Strategy looks identical in code but is about swapping one algorithm; Bridge is about keeping two real hierarchies from multiplying. Adapter is applied afterwards to existing code; Bridge is designed in.`,
    smell: `- Class names that are two nouns glued together: \`AlertByEmail\`, \`ReminderBySms\`.
- Adding one new variant forces you to add several classes.
- Copy-pasted bodies between the combination classes.
- A \`switch\` on the second dimension inside every subclass of the first.`,
    before: `#include <iostream>
#include <string>

// Four classes for two message kinds times two channels. A third channel means two more classes.
class AlertByEmail {
public:
    void send(const std::string& text) const { std::cout << "email: ALERT: " << text << "\\n"; }
};
class AlertBySms {
public:
    void send(const std::string& text) const { std::cout << "sms: ALERT: " << text << "\\n"; }
};
class ReminderByEmail {
public:
    void send(const std::string& text) const { std::cout << "email: Reminder: " << text << "\\n"; }
};
class ReminderBySms {
public:
    void send(const std::string& text) const { std::cout << "sms: Reminder: " << text << "\\n"; }
};

int main() {
    AlertByEmail().send("disk full");
    AlertBySms().send("disk full");
    ReminderByEmail().send("standup at 10");
    ReminderBySms().send("standup at 10");
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>

// Implementor hierarchy: how the text travels.
class Channel {
public:
    virtual ~Channel() = default;
    virtual void deliver(const std::string& text) const = 0;
};

class EmailChannel : public Channel {
public:
    void deliver(const std::string& text) const override { std::cout << "email: " << text << "\\n"; }
};

class SmsChannel : public Channel {
public:
    void deliver(const std::string& text) const override { std::cout << "sms: " << text << "\\n"; }
};

// Abstraction hierarchy: what is being said. The bridge is the owned Channel.
class Notification {
public:
    explicit Notification(std::unique_ptr<Channel> channel) : channel_(std::move(channel)) {}
    virtual ~Notification() = default;
    virtual void send(const std::string& text) const = 0;

protected:
    const Channel& channel() const { return *channel_; }

private:
    std::unique_ptr<Channel> channel_;
};

class Alert : public Notification {
public:
    using Notification::Notification;
    void send(const std::string& text) const override { channel().deliver("ALERT: " + text); }
};

class Reminder : public Notification {
public:
    using Notification::Notification;
    void send(const std::string& text) const override { channel().deliver("Reminder: " + text); }
};

int main() {
    Alert(std::make_unique<EmailChannel>()).send("disk full");
    Alert(std::make_unique<SmsChannel>()).send("disk full");
    Reminder(std::make_unique<EmailChannel>()).send("standup at 10");
    Reminder(std::make_unique<SmsChannel>()).send("standup at 10");
}
`,
    beforeOutput: "email: ALERT: disk full\nsms: ALERT: disk full\nemail: Reminder: standup at 10\nsms: Reminder: standup at 10",
    afterOutput: "email: ALERT: disk full\nsms: ALERT: disk full\nemail: Reminder: standup at 10\nsms: Reminder: standup at 10",
    refactorNotes: `Same output, different growth curve. A Push channel is one new class; an Escalation message kind is one new class; neither touches the other axis. The channel is owned by the notification through a \`unique_ptr\`, so lifetime is unambiguous, and the protected accessor keeps subclasses from reassigning it.

**Trade-off:** two hierarchies and one level of delegation. With two message kinds and two channels the grid is only four classes, and you may be better off waiting. The deciding factor is whether **both** axes are really going to grow. If only one axis ever changes, a single interface (or Strategy) is enough.`,
    interviewSignal: `Draw the class grid first, count it, then show the M plus N split. Say "I am keeping two axes of change apart". Senior signal: you distinguish Bridge from Strategy (two hierarchies versus one swappable algorithm) and from Adapter (designed up front versus retrofitted), and you decide which axis is the abstraction by asking which one callers think in.`,
    overApplication: `Bridge on a single axis is a needless interface plus a forwarding layer. It also invites a leaky Implementor interface: if every new abstraction needs a new method on Channel, the two sides are not really independent and you have just moved the coupling. Count the real variants today and the ones a requirement will plausibly add before paying for the split.`,
  },
  {
    id: "composite",
    level: "L4",
    title: "Composite: treat one and many the same way",
    oneLiner: "Give leaves and containers a common interface so recursive structures need no special cases at the call site.",
    cardTopic: "L4.composite",
    intro: `Composite models a **tree** where a group can be used anywhere a single item can. Files and folders, shapes and groups, menu items and sub-menus, expressions and sub-expressions, org charts. Both leaf and container implement one \`Node\` interface; the container forwards each call to its children and combines the answers.

The payoff is that client code asks \`root.bytes()\` and never asks "is this a file or a folder?". Recursion lives in the container, once per operation, not in every caller.

The classic design question is **where to put \`add()\` and \`remove()\`**. On the base interface (transparency: uniform, but leaves must refuse the call) or only on the container (safety: leaves are honest, but a caller needs the container type to build the tree). In C++ the safer form usually wins, because a leaf with a method that always throws or does nothing violates the Liskov substitution principle.`,
    smell: `- A container class with a separate list per child kind (files and folders) and each operation looping over each.
- \`if (isFolder)\` checks scattered through client code.
- Adding a new leaf kind means a new list and an edit to every recursive function.
- Depth is limited or special-cased because the code was written for two levels.`,
    before: `#include <iostream>
#include <string>
#include <vector>

class File {
public:
    explicit File(int bytes) : bytes_(bytes) {}
    int bytes() const { return bytes_; }

private:
    int bytes_;
};

// A folder keeps one list per kind of child. Every operation loops over both, and a new
// kind of child (a shortcut, say) would need a third list and an edit to every operation.
class Folder {
public:
    void addFile(File f) { files_.push_back(f); }
    void addFolder(Folder f) { folders_.push_back(std::move(f)); }
    int bytes() const {
        int total = 0;
        for (const File& f : files_) total += f.bytes();
        for (const Folder& f : folders_) total += f.bytes();
        return total;
    }
    int fileCount() const {
        int count = static_cast<int>(files_.size());
        for (const Folder& f : folders_) count += f.fileCount();
        return count;
    }

private:
    std::vector<File> files_;
    std::vector<Folder> folders_;
};

int main() {
    Folder docs;
    docs.addFile(File(10));
    docs.addFile(File(20));
    Folder root;
    root.addFolder(std::move(docs));
    root.addFile(File(40));
    std::cout << "bytes=" << root.bytes() << "\\n";
    std::cout << "files=" << root.fileCount() << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

// Component: the one interface that leaves and containers share.
class Node {
public:
    virtual ~Node() = default;
    virtual int bytes() const = 0;
    virtual int fileCount() const = 0;
};

class File : public Node {
public:
    explicit File(int bytes) : bytes_(bytes) {}
    int bytes() const override { return bytes_; }
    int fileCount() const override { return 1; }

private:
    int bytes_;
};

// Composite: owns its children and combines their answers. add() lives here, not on Node,
// so a File never has to pretend it can hold children.
class Folder : public Node {
public:
    void add(std::unique_ptr<Node> child) { children_.push_back(std::move(child)); }
    int bytes() const override {
        int total = 0;
        for (const auto& child : children_) total += child->bytes();
        return total;
    }
    int fileCount() const override {
        int count = 0;
        for (const auto& child : children_) count += child->fileCount();
        return count;
    }

private:
    std::vector<std::unique_ptr<Node>> children_;
};

int main() {
    auto docs = std::make_unique<Folder>();
    docs->add(std::make_unique<File>(10));
    docs->add(std::make_unique<File>(20));
    Folder root;
    root.add(std::move(docs));
    root.add(std::make_unique<File>(40));
    std::cout << "bytes=" << root.bytes() << "\\n";
    std::cout << "files=" << root.fileCount() << "\\n";
}
`,
    beforeOutput: "bytes=70\nfiles=3",
    afterOutput: "bytes=70\nfiles=3",
    refactorNotes: `A Symlink or Archive is now one new \`Node\` subclass; \`Folder\` does not change. Each operation is written once per class, with the recursion inside the container. The folder owns its children through \`unique_ptr<Node>\`, so a whole tree is destroyed correctly through the virtual destructor and cannot be copied by accident.

**Trade-off:** the Component interface must be broad enough for every operation yet stay meaningful for leaves. If you keep adding methods that only containers care about, you have a wide interface in disguise (see Interface Segregation). Also decide up front whether children know their parent: it makes upward queries easy and ownership cycles easy, so use a non-owning raw pointer or a \`weak_ptr\` for the back link.`,
    interviewSignal: `Spot the tree in the requirements: "a group of X is itself an X". Name the transparency-versus-safety trade-off for \`add()\` and choose one with a reason. Senior signal: you mention traversal cost (a naive \`bytes()\` is O(n) per call, so cache with invalidation if it is hot), ownership of children, and that a visitor can add operations without growing the Component interface.`,
    overApplication: `If the data is a flat list, or a tree whose depth is fixed at two and never queried recursively, a plain \`vector\` of structs is simpler and faster. A Composite also pushes virtual calls and pointer chasing into hot loops; for millions of small nodes consider a flat array with indices. Do not build a uniform interface just because a diagram has the word "group" in it.`,
  },
  {
    id: "decorator",
    level: "L4",
    title: "Decorator: stack behaviour without a subclass per combination",
    oneLiner: "Wrap an object in another object with the same interface to add one behaviour, and stack wrappers in any order at run time.",
    cardTopic: "L4.decorator",
    intro: `A Decorator **implements the same interface it wraps** and holds the wrapped object as a member. A call does its own small piece of work and forwards to the inner object (before, after or around it). Because every decorator is also a \`TextSource\`, you can wrap a wrapper, and the combination is chosen by the caller when the object is built.

The point is to escape **inheritance explosion**. With features A and B you would write A, B, A-then-B and B-then-A as subclasses. With decorators you write A and B once and compose. Order matters, and that is a feature: truncate-then-bracket and bracket-then-truncate give different results, and both are expressible.

It is how streams are layered in many standard libraries (buffering, compression, encryption around a raw stream) and how middleware stacks work. Contrast with Proxy: a decorator **adds behaviour**, a proxy **controls access** to the same behaviour.`,
    smell: `- Class names like \`TruncatedThenBracketed\`: a feature list encoded in a type name.
- Flags and \`if\` chains inside one class to switch features on and off.
- A new feature requires doubling the number of subclasses.
- Behaviour that is optional per object is baked in for all objects of the type.`,
    before: `#include <iostream>
#include <string>

// Each combination of features is its own class, and order is baked into the name.
class BracketedMessage {
public:
    explicit BracketedMessage(std::string text) : text_(std::move(text)) {}
    std::string text() const { return "[" + text_ + "]"; }

private:
    std::string text_;
};

class TruncatedMessage {
public:
    TruncatedMessage(std::string text, std::size_t limit) : text_(std::move(text)), limit_(limit) {}
    std::string text() const { return text_.substr(0, limit_); }

private:
    std::string text_;
    std::size_t limit_;
};

class TruncatedThenBracketedMessage {
public:
    TruncatedThenBracketedMessage(std::string text, std::size_t limit) : text_(std::move(text)), limit_(limit) {}
    std::string text() const { return "[" + text_.substr(0, limit_) + "]"; }

private:
    std::string text_;
    std::size_t limit_;
};

class BracketedThenTruncatedMessage {
public:
    BracketedThenTruncatedMessage(std::string text, std::size_t limit) : text_(std::move(text)), limit_(limit) {}
    std::string text() const { return ("[" + text_ + "]").substr(0, limit_); }

private:
    std::string text_;
    std::size_t limit_;
};

int main() {
    std::cout << BracketedMessage("hello").text() << "\\n";
    std::cout << TruncatedMessage("hello", 3).text() << "\\n";
    std::cout << TruncatedThenBracketedMessage("hello", 3).text() << "\\n";
    std::cout << BracketedThenTruncatedMessage("hello", 3).text() << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>

// Component.
class TextSource {
public:
    virtual ~TextSource() = default;
    virtual std::string text() const = 0;
};

class PlainText : public TextSource {
public:
    explicit PlainText(std::string text) : text_(std::move(text)) {}
    std::string text() const override { return text_; }

private:
    std::string text_;
};

// Decorators: each adds exactly one behaviour and owns what it wraps.
class Bracketed : public TextSource {
public:
    explicit Bracketed(std::unique_ptr<TextSource> inner) : inner_(std::move(inner)) {}
    std::string text() const override { return "[" + inner_->text() + "]"; }

private:
    std::unique_ptr<TextSource> inner_;
};

class Truncated : public TextSource {
public:
    Truncated(std::unique_ptr<TextSource> inner, std::size_t limit) : inner_(std::move(inner)), limit_(limit) {}
    std::string text() const override { return inner_->text().substr(0, limit_); }

private:
    std::unique_ptr<TextSource> inner_;
    std::size_t limit_;
};

int main() {
    const std::unique_ptr<TextSource> a = std::make_unique<Bracketed>(std::make_unique<PlainText>("hello"));
    const std::unique_ptr<TextSource> b = std::make_unique<Truncated>(std::make_unique<PlainText>("hello"), 3);
    const std::unique_ptr<TextSource> c =
        std::make_unique<Bracketed>(std::make_unique<Truncated>(std::make_unique<PlainText>("hello"), 3));
    const std::unique_ptr<TextSource> d =
        std::make_unique<Truncated>(std::make_unique<Bracketed>(std::make_unique<PlainText>("hello")), 3);
    std::cout << a->text() << "\\n" << b->text() << "\\n" << c->text() << "\\n" << d->text() << "\\n";
}
`,
    beforeOutput: "[hello]\nhel\n[hel]\n[he",
    afterOutput: "[hello]\nhel\n[hel]\n[he",
    refactorNotes: `Two behaviours, two classes, any order. A third feature (say \`Uppercased\`) is one class, not a doubling of the grid. The caller composes at the construction site, which is also where the order decision is visible and testable.

**Trade-off:** the pipeline is assembled from many small objects, so debugging a long chain is harder, identity checks stop working (a decorated object is not the object you wrapped), and each layer is a virtual call and sometimes an allocation. Hide the construction behind a factory or builder so callers do not hand-assemble stacks. For compile-time composition without virtuals, C++ also allows mixin or policy templates; mention it, but the run-time form is the pattern interviewers mean.`,
    interviewSignal: `Say "the features combine, so I do not want one class per combination". Show that order matters with a concrete example. Senior signal: you contrast Decorator with Proxy and Adapter by intent (add behaviour, control access, change shape), name the debugging and identity downsides, and note that decorators must respect the interface's contract (do not narrow what the inner object promises).`,
    overApplication: `A decorator for a feature that is always on is just an extra indirection: put it in the class. Deep chains of tiny wrappers make stack traces and profiles unreadable, and an interface with many methods makes every decorator a pile of boilerplate forwarding (one forgotten method silently skips a layer). If the combinations are few and fixed, a couple of plain classes or a policy enum is easier to read.`,
  },
  {
    id: "facade",
    level: "L4",
    title: "Facade: one simple door into a messy subsystem",
    oneLiner: "Provide a small, task-shaped interface over several collaborating classes so callers stop orchestrating them by hand.",
    cardTopic: "L4.facade",
    intro: `A Facade is a **class with a few intention-revealing methods that coordinate a subsystem**. Instead of every caller creating a lexer, a parser and an emitter and calling them in the right order with the right checks, one \`Translator::translate(text)\` does it.

It reduces coupling (callers depend on one class), centralises the call sequence (so it changes in one place) and gives you a natural seam to fake in tests. It does **not** hide the subsystem: power users can still reach the parts when they need to. That is the difference from an encapsulation boundary you enforce with the module system.

Facade differs from Adapter in intent (simplify many classes versus translate one interface), and from a Mediator (a Facade is one-way: the subsystem does not know about it).`,
    smell: `- The same three-step call sequence copied into several callers.
- Callers know the subsystem's internal order, invariants and error handling.
- A change inside the subsystem breaks many unrelated files.
- Onboarding docs say "first call A, then B, then check C".`,
    before: `#include <iostream>
#include <sstream>
#include <string>
#include <vector>

class Lexer {
public:
    std::vector<std::string> tokenize(const std::string& source) const {
        std::vector<std::string> tokens;
        std::istringstream in(source);
        std::string word;
        while (in >> word) tokens.push_back(word);
        return tokens;
    }
};

class Parser {
public:
    bool valid(const std::vector<std::string>& tokens) const { return !tokens.empty(); }
};

class Emitter {
public:
    std::string emit(const std::vector<std::string>& tokens) const {
        std::string out;
        for (std::size_t i = 0; i < tokens.size(); ++i) {
            if (i > 0) out += ",";
            out += tokens[i];
        }
        return out;
    }
};

int main() {
    // Every caller has to know the order, the validity check and the error text.
    const Lexer lexer;
    const Parser parser;
    const Emitter emitter;
    for (const std::string source : {"a b c", ""}) {
        const auto tokens = lexer.tokenize(source);
        if (!parser.valid(tokens)) {
            std::cout << "error: empty input\\n";
        } else {
            std::cout << emitter.emit(tokens) << "\\n";
        }
    }
}
`,
    after: `#include <iostream>
#include <sstream>
#include <string>
#include <vector>

// Subsystem classes, unchanged.
class Lexer {
public:
    std::vector<std::string> tokenize(const std::string& source) const {
        std::vector<std::string> tokens;
        std::istringstream in(source);
        std::string word;
        while (in >> word) tokens.push_back(word);
        return tokens;
    }
};

class Parser {
public:
    bool valid(const std::vector<std::string>& tokens) const { return !tokens.empty(); }
};

class Emitter {
public:
    std::string emit(const std::vector<std::string>& tokens) const {
        std::string out;
        for (std::size_t i = 0; i < tokens.size(); ++i) {
            if (i > 0) out += ",";
            out += tokens[i];
        }
        return out;
    }
};

// Facade: the one call most callers need. It owns the sequence and the error text.
class Translator {
public:
    std::string translate(const std::string& source) const {
        const auto tokens = lexer_.tokenize(source);
        if (!parser_.valid(tokens)) return "error: empty input";
        return emitter_.emit(tokens);
    }

private:
    Lexer lexer_;
    Parser parser_;
    Emitter emitter_;
};

int main() {
    const Translator translator;
    std::cout << translator.translate("a b c") << "\\n";
    std::cout << translator.translate("") << "\\n";
}
`,
    beforeOutput: "a,b,c\nerror: empty input",
    afterOutput: "a,b,c\nerror: empty input",
    refactorNotes: `The call sequence, the validity check and the error wording now exist once. Changing the subsystem (a new pass, a different order) edits \`Translator\` and nothing else. The subsystem classes are untouched and still usable directly by the rare caller that needs a single stage.

**Trade-off:** the Facade is a new thing to maintain, and it decides what the "simple" cases are. If it grows a method for every caller's need it turns into a god class, the opposite of what you wanted. Keep it task-shaped, keep logic in the subsystem, and let it accept its collaborators through the constructor if you want to fake them in tests.`,
    interviewSignal: `Say "callers should depend on what they want done, not on how the parts are sequenced". Senior signal: you mention that a Facade must stay thin (it coordinates, it does not own business rules), that it makes a good test seam and a good place for cross-cutting concerns such as logging, and that you would not use one to paper over a subsystem that is itself badly designed.`,
    overApplication: `A Facade over two collaborators that one caller uses once adds nothing. A Facade that every layer must go through becomes a bottleneck of changes and a god class (see the Senior Review god-class rule). And a Facade that hides too much forces power users to bypass it, leaving two ways of doing everything. Add one when the same orchestration appears in at least two places.`,
  },
  {
    id: "flyweight",
    level: "L4",
    title: "Flyweight: share the identical part",
    oneLiner: "When huge numbers of objects repeat the same read-only data, store that data once and point to it.",
    cardTopic: "L4.flyweight",
    intro: `Flyweight splits an object's state in two. **Intrinsic state** is identical across many objects and never changes (a tree species and its texture, a glyph's outline, a chess piece's sprite). **Extrinsic state** is unique per object (the position). You store intrinsic state once in a shared, immutable object and let each instance hold a pointer to it plus its own extrinsic fields. A small factory hands out the shared objects and reuses them by key.

This is a **memory optimisation**, and the numbers should drive it. A million trees each carrying an own copy of a 512 KB texture is a problem; a few hundred trees is not. Immutability is what makes sharing safe, including across threads: no one can change the shared state under another owner's feet.

In C++ the shared part is naturally a \`std::shared_ptr<const T>\`, or an index into a table if you need a compact representation.`,
    smell: `- Many instances carry identical copies of the same strings, tables or images.
- Memory profile shows duplicates, and instance counts run to the hundreds of thousands.
- The duplicated fields are never modified after construction.
- Creating one more object is noticeably expensive because of the repeated data.`,
    before: `#include <iostream>
#include <string>
#include <vector>

// Every tree owns its own copy of the species data, which never changes.
class Tree {
public:
    Tree(int x, int y, std::string species, std::string texture)
        : x_(x), y_(y), species_(std::move(species)), texture_(std::move(texture)) {}
    std::string describe() const { return species_ + "@(" + std::to_string(x_) + "," + std::to_string(y_) + ")"; }

private:
    int x_;
    int y_;
    std::string species_;
    std::string texture_;  // imagine this is a large image
};

int main() {
    std::vector<Tree> forest;
    forest.emplace_back(1, 2, "oak", "oak-bark-512px");
    forest.emplace_back(3, 4, "pine", "pine-needle-512px");
    forest.emplace_back(5, 6, "oak", "oak-bark-512px");
    for (const Tree& t : forest) std::cout << t.describe() << "\\n";
    std::cout << "texture copies=" << forest.size() << "\\n";
}
`,
    after: `#include <iostream>
#include <map>
#include <memory>
#include <string>
#include <vector>

// Flyweight: immutable intrinsic state, shared.
class TreeType {
public:
    TreeType(std::string name, std::string texture) : name_(std::move(name)), texture_(std::move(texture)) {}
    const std::string& name() const { return name_; }
    const std::string& texture() const { return texture_; }

private:
    std::string name_;
    std::string texture_;
};

// Flyweight factory: one TreeType per species. (Not thread-safe; guard it if shared.)
class TreeTypeFactory {
public:
    std::shared_ptr<const TreeType> get(const std::string& name, const std::string& texture) {
        const auto found = types_.find(name);
        if (found != types_.end()) return found->second;
        std::shared_ptr<const TreeType> created = std::make_shared<TreeType>(name, texture);
        types_.emplace(name, created);
        return created;
    }
    std::size_t count() const { return types_.size(); }

private:
    std::map<std::string, std::shared_ptr<const TreeType>> types_;
};

// Context object: extrinsic state (position) plus a pointer to the shared part.
class Tree {
public:
    Tree(int x, int y, std::shared_ptr<const TreeType> type) : x_(x), y_(y), type_(std::move(type)) {}
    std::string describe() const { return type_->name() + "@(" + std::to_string(x_) + "," + std::to_string(y_) + ")"; }

private:
    int x_;
    int y_;
    std::shared_ptr<const TreeType> type_;
};

int main() {
    TreeTypeFactory types;
    std::vector<Tree> forest;
    forest.emplace_back(1, 2, types.get("oak", "oak-bark-512px"));
    forest.emplace_back(3, 4, types.get("pine", "pine-needle-512px"));
    forest.emplace_back(5, 6, types.get("oak", "oak-bark-512px"));
    for (const Tree& t : forest) std::cout << t.describe() << "\\n";
    std::cout << "type objects=" << types.count() << "\\n";
}
`,
    beforeOutput: "oak@(1,2)\npine@(3,4)\noak@(5,6)\ntexture copies=3",
    afterOutput: "oak@(1,2)\npine@(3,4)\noak@(5,6)\ntype objects=2",
    refactorNotes: `Three trees, two texture objects, and the gap widens with every tree you plant: a million oaks still share one texture. The shared type is immutable (\`shared_ptr<const TreeType>\`), which is what makes the sharing safe.

**Trade-off:** you pay a factory, an indirection per access, and an atomic reference count if you use \`shared_ptr\`. If the set of types is fixed and known up front, an index into a \`std::vector<TreeType>\` is cheaper than a pointer and avoids counting. Only do any of this after measuring: it trades clarity for bytes.`,
    interviewSignal: `Lead with a number: "a million objects times the duplicated field is X MB, so it is worth sharing". Separate intrinsic from extrinsic state out loud. Senior signal: you insist the shared object is immutable, discuss thread-safety of the factory, mention cache locality (pointer chasing versus a table index), and know that string interning and the Java-style integer cache are the same idea.`,
    overApplication: `Flyweight without a measured memory problem is complexity with no payoff: the factory, the split state and the pointer indirection make code harder to read and debug. It also fails quietly if the "shared" state turns out to need per-object changes later, because then every instance is affected. If you have hundreds of objects, copy the data and move on.`,
  },
  {
    id: "proxy",
    level: "L4",
    title: "Proxy: a stand-in that controls access",
    oneLiner: "Put an object with the same interface in front of another to add laziness, caching, protection or remoting without the caller noticing.",
    cardTopic: "L4.proxy",
    intro: `A Proxy **implements the same interface as the real object and holds (or lazily creates) it**. The caller cannot tell the difference, but every call passes through the proxy, which can decide whether, when and how to forward it.

Four common jobs: a **virtual proxy** defers an expensive construction until first use; a **caching proxy** remembers results; a **protection proxy** checks permissions; a **remote proxy** hides a network call behind a local-looking method. Rate limiting, retries, logging and circuit breakers are the same shape, which is why service clients in real systems are often a stack of them.

The line between Proxy and Decorator is intent. A decorator adds new behaviour to the output; a proxy controls access to the same behaviour. The code is nearly identical, so say the intent out loud.`,
    smell: `- Every caller that needs a cache writes its own, and one forgets.
- Permission or null checks repeated before each use of an object.
- The expensive resource is created at start-up although most runs never use it.
- Changing the caching or retry policy means editing many call sites.`,
    before: `#include <iostream>
#include <map>
#include <memory>
#include <string>

class RealPriceService {
public:
    explicit RealPriceService(int& calls) : calls_(calls) {}
    int priceCents(const std::string& sku) {
        ++calls_;  // imagine a slow remote lookup
        return sku == "apple" ? 40 : 55;
    }

private:
    int& calls_;
};

// Caching is done by hand at some call sites and forgotten at others.
void showPrice(RealPriceService& service, std::map<std::string, int>& cache, const std::string& sku) {
    if (cache.find(sku) == cache.end()) cache[sku] = service.priceCents(sku);
    std::cout << sku << "=" << cache[sku] << "\\n";
}

void showTotal(RealPriceService& service, const std::string& sku, int quantity) {
    std::cout << "total=" << service.priceCents(sku) * quantity << "\\n";  // bypasses the cache
}

int main() {
    int calls = 0;
    RealPriceService service(calls);
    std::map<std::string, int> cache;
    showPrice(service, cache, "apple");
    showPrice(service, cache, "apple");
    showTotal(service, "apple", 3);
    std::cout << "real calls=" << calls << "\\n";
}
`,
    after: `#include <iostream>
#include <map>
#include <memory>
#include <string>
#include <utility>

// Subject: the interface callers depend on. Not const: even a read may update a cache.
class PriceService {
public:
    virtual ~PriceService() = default;
    virtual int priceCents(const std::string& sku) = 0;
};

class RealPriceService : public PriceService {
public:
    explicit RealPriceService(int& calls) : calls_(calls) {}
    int priceCents(const std::string& sku) override {
        ++calls_;  // imagine a slow remote lookup
        return sku == "apple" ? 40 : 55;
    }

private:
    int& calls_;
};

// Caching proxy: same interface, remembers answers. Callers cannot forget to use it.
class CachingPriceProxy : public PriceService {
public:
    explicit CachingPriceProxy(std::unique_ptr<PriceService> real) : real_(std::move(real)) {}
    int priceCents(const std::string& sku) override {
        const auto found = cache_.find(sku);
        if (found != cache_.end()) return found->second;
        const int price = real_->priceCents(sku);
        cache_.emplace(sku, price);
        return price;
    }

private:
    std::unique_ptr<PriceService> real_;
    std::map<std::string, int> cache_;
};

void showPrice(PriceService& service, const std::string& sku) {
    std::cout << sku << "=" << service.priceCents(sku) << "\\n";
}

void showTotal(PriceService& service, const std::string& sku, int quantity) {
    std::cout << "total=" << service.priceCents(sku) * quantity << "\\n";
}

int main() {
    int calls = 0;
    CachingPriceProxy service(std::make_unique<RealPriceService>(calls));
    showPrice(service, "apple");
    showPrice(service, "apple");
    showTotal(service, "apple", 3);
    std::cout << "real calls=" << calls << "\\n";
}
`,
    beforeOutput: "apple=40\napple=40\ntotal=120\nreal calls=2",
    afterOutput: "apple=40\napple=40\ntotal=120\nreal calls=1",
    refactorNotes: `Every path to the price now goes through one object, so the real service is called once. Callers depend on \`PriceService\` and cannot tell a proxy from the real thing, which means a protection or retry proxy can be stacked later without touching them. The proxy owns the real service with a \`unique_ptr\`.

**Trade-off:** identical interfaces hide latency and behaviour. A cache needs an invalidation story (TTL, version keys, explicit eviction) or it serves stale prices; it also needs a size bound and a thread-safety decision (a mutex, or one proxy per thread). Because a cached read mutates state, the interface method cannot honestly be \`const\`, which is worth saying aloud.`,
    interviewSignal: `Name the flavour (virtual, caching, protection, remote) and say "same interface, so callers are unchanged". Senior signal: you raise invalidation, bounded size and concurrency before the interviewer does, you separate Proxy from Decorator by intent, and you note that a remote proxy must expose failure (timeouts, errors) in its contract instead of pretending the call is local.`,
    overApplication: `A proxy in front of something cheap and local only adds a hop. Stacking five transparent layers (cache, retry, auth, logging, metrics) makes behaviour surprising and latency hard to attribute; make each layer explicit in one composition root. Never let a proxy change what the call means: a "get" that sometimes returns stale data is a decision the caller should be able to see.`,
  },
];
