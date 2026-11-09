import type { Lesson } from "@/lib/lessons/model";

/**
 * Behavioural Theatre lessons, part 3 (CURRICULUM L5): Memento, Visitor, Interpreter, Null Object.
 * Original wording. Every `before`/`after` program is compiled and run natively by content:verify, and every `after`
 * must pass Senior Review with no blocker or major.
 */
export const BEHAVIOURAL_THEATRE_LESSONS_3: Lesson[] = [
  {
    id: "memento",
    level: "L5",
    title: "Memento: save and restore state without breaking encapsulation",
    oneLiner: "Capture an object's state in an opaque token so it can be restored later, without exposing its internals.",
    cardTopic: "L5.memento",
    intro: `A Memento is **a sealed snapshot of an object's state**. The object (the originator) creates it and is the only one who can read it; a caretaker (an undo history, a save slot) stores it and hands it back, without ever looking inside. That is what makes undo possible without making every field public.

The roles: the originator has \`save()\` and \`restore(snapshot)\`; the memento is a small value type with a private constructor and a \`friend\` (or nested-class access) for the originator only; the caretaker keeps a stack of mementos. In C++ a nested \`Snapshot\` class with a private constructor and \`friend class Editor;\` gives exactly this.

Mementos are an alternative to Command-with-undo. Command stores how to reverse an action; Memento stores what the state was. Memento is simpler when reversing is hard or the state is small; Command is cheaper when the state is large and the change is tiny.`,
    smell: `- Fields are public (or have setters for everything) just so another class can save and restore them.
- The save code lives in the caller and has to list every field; adding a field silently breaks undo.
- A restore brings back some fields and forgets others, leaving an inconsistent object (a cursor past the end of the text).
- The history class knows the editor's internals.`,
    before: `#include <iostream>
#include <string>

// Every field is public, so the caller does the saving, and has to remember every field.
class Editor {
public:
    std::string text;
    int cursor = 0;
};

int main() {
    Editor editor;
    editor.text = "hello";
    editor.cursor = 5;

    std::string savedText = editor.text;  // the caller copies the insides...
    editor.text += " world";
    editor.cursor = 11;

    editor.text = savedText;  // ...and forgets the cursor when restoring
    std::cout << editor.text << " cursor " << editor.cursor << "\\n";
}
`,
    after: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

class Editor {
public:
    // An opaque token: only Editor can build one or read it. History just carries it.
    class Snapshot {
    private:
        friend class Editor;
        Snapshot(std::string text, std::size_t cursor) : text_(std::move(text)), cursor_(cursor) {}
        std::string text_;
        std::size_t cursor_;
    };

    void type(const std::string& more) {
        text_ += more;
        cursor_ = text_.size();
    }
    Snapshot save() const { return Snapshot(text_, cursor_); }
    void restore(const Snapshot& snapshot) {
        text_ = snapshot.text_;
        cursor_ = snapshot.cursor_;
    }
    void print() const { std::cout << text_ << " cursor " << cursor_ << "\\n"; }

private:
    std::string text_;
    std::size_t cursor_ = 0;
};

class History {
public:
    void push(Editor::Snapshot snapshot) { snapshots_.push_back(std::move(snapshot)); }
    bool empty() const { return snapshots_.empty(); }
    Editor::Snapshot pop() {
        Editor::Snapshot last = std::move(snapshots_.back());
        snapshots_.pop_back();
        return last;
    }

private:
    std::vector<Editor::Snapshot> snapshots_;
};

int main() {
    Editor editor;
    History history;
    editor.type("hello");
    history.push(editor.save());
    editor.type(" world");
    editor.print();
    if (!history.empty()) editor.restore(history.pop());
    editor.print();
}
`,
    beforeOutput: "hello cursor 11",
    afterOutput: "hello world cursor 11\nhello cursor 5",
    refactorNotes: `The caller used to copy \`text\` and forget \`cursor\`; now \`save()\` captures every field in one place, next to the fields, so a new field is added to the snapshot in the same edit. The \`Snapshot\` constructor is private and only \`Editor\` is a friend, so \`History\` can store and return snapshots but cannot read or forge one. The fields are private again.

**Trade-offs:** a snapshot copies the whole state, so a big document times a long history is memory-hungry. Options are to store diffs (then you are close to Command), to cap the history, or to share unchanged parts (persistent data structures). Mementos also freeze invariants at one moment: restoring a snapshot into an object whose environment has moved on (a file that was deleted) needs care. If the snapshot must outlive the program (save files), you have a serialisation format and a versioning problem, which is a different design.`,
    interviewSignal: `Name the three roles, then say "the history never sees inside the snapshot". In an editor, text-box or game-save question, point at the encapsulation win (private fields, one \`save()\`), then offer the cost model: full copy versus deltas, with a cap on history depth. Senior signal: you compare it with Command-based undo, say which you would pick for this size of state, and mention what happens to redo (clear it on a new edit).`,
    overApplication: `Snapshotting a large object on every keystroke is a performance bug. If the state is two integers, passing them back is simpler. A memento that exposes getters for the caretaker to "peek" has lost its point. And if only one operation needs undo, a single reverse function is lighter than a whole snapshot protocol.`,
  },
  {
    id: "visitor",
    level: "L5",
    title: "Visitor: add operations without editing the classes",
    oneLiner: "Move an operation out of a class hierarchy into a visitor, so new operations do not touch the element classes.",
    cardTopic: "L5.visitor",
    intro: `A Visitor lets you **add a new operation over a stable family of types** without editing those types. Each element class has one tiny method, \`accept(visitor)\`, that calls back \`visitor.visit(*this)\`. Because the call happens inside the concrete class, the compiler picks the right \`visit\` overload for that concrete type. This is called **double dispatch**: the first virtual call picks the element, the second picks the operation.

The visitor interface has one \`visit\` per concrete element. Each new operation is a new class implementing it, and it can keep its own state (a running total, a string builder) across the walk.

The deciding factor is **which axis changes**. If you add operations often and the set of element types is stable (an AST, a document model, a set of shapes), Visitor is a good fit. If you add element types often, Visitor is a poor fit: every new element forces a change in every visitor. That is the **expression problem**; no design gives you both for free.`,
    smell: `- A chain of \`dynamic_cast\` or \`typeid\` checks to find out what an object is.
- Every new operation (print, export, price, validate) is another function with the same type-switch.
- A new subclass compiles fine but falls into an "unknown" branch at run time.
- The base class keeps growing virtual methods for unrelated jobs.`,
    before: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct Shape {
    virtual ~Shape() = default;
};
struct Circle : Shape {
    explicit Circle(int r) : radius(r) {}
    int radius;
};
struct Rect : Shape {
    Rect(int w, int h) : width(w), height(h) {}
    int width, height;
};
struct Triangle : Shape {};

// Each new operation is another type-switch, and a new shape falls into "unknown" at run time.
std::string describe(const Shape& shape) {
    if (const auto* circle = dynamic_cast<const Circle*>(&shape)) return "circle r=" + std::to_string(circle->radius);
    if (const auto* rect = dynamic_cast<const Rect*>(&shape)) return "rect " + std::to_string(rect->width) + "x" + std::to_string(rect->height);
    return "unknown shape";
}

int main() {
    std::vector<std::unique_ptr<Shape>> shapes;
    shapes.push_back(std::make_unique<Circle>(2));
    shapes.push_back(std::make_unique<Rect>(3, 4));
    shapes.push_back(std::make_unique<Triangle>());
    for (const auto& shape : shapes) std::cout << describe(*shape) << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Circle;
class Rect;
class Triangle;

// One visit() per concrete shape. A new shape means a new pure virtual, so every visitor stops compiling until it handles it.
class ShapeVisitor {
public:
    virtual ~ShapeVisitor() = default;
    virtual void visit(const Circle& circle) = 0;
    virtual void visit(const Rect& rect) = 0;
    virtual void visit(const Triangle& triangle) = 0;
};

class Shape {
public:
    virtual ~Shape() = default;
    virtual void accept(ShapeVisitor& visitor) const = 0;
};

class Circle final : public Shape {
public:
    explicit Circle(int radius) : radius_(radius) {}
    int radius() const { return radius_; }
    void accept(ShapeVisitor& visitor) const override { visitor.visit(*this); }

private:
    int radius_;
};

class Rect final : public Shape {
public:
    Rect(int width, int height) : width_(width), height_(height) {}
    int width() const { return width_; }
    int height() const { return height_; }
    void accept(ShapeVisitor& visitor) const override { visitor.visit(*this); }

private:
    int width_;
    int height_;
};

class Triangle final : public Shape {
public:
    void accept(ShapeVisitor& visitor) const override { visitor.visit(*this); }
};

// Operation 1: describe. Added without touching the shape classes.
class DescribeVisitor final : public ShapeVisitor {
public:
    void visit(const Circle& circle) override { std::cout << "circle r=" << circle.radius() << "\\n"; }
    void visit(const Rect& rect) override { std::cout << "rect " << rect.width() << "x" << rect.height() << "\\n"; }
    void visit(const Triangle&) override { std::cout << "triangle\\n"; }
};

// Operation 2: count corners. A visitor can keep state across the walk.
class CornerCounter final : public ShapeVisitor {
public:
    void visit(const Circle&) override {}
    void visit(const Rect&) override { corners_ += 4; }
    void visit(const Triangle&) override { corners_ += 3; }
    int corners() const { return corners_; }

private:
    int corners_ = 0;
};

int main() {
    std::vector<std::unique_ptr<Shape>> shapes;
    shapes.push_back(std::make_unique<Circle>(2));
    shapes.push_back(std::make_unique<Rect>(3, 4));
    shapes.push_back(std::make_unique<Triangle>());

    DescribeVisitor describe;
    CornerCounter counter;
    for (const auto& shape : shapes) {
        shape->accept(describe);
        shape->accept(counter);
    }
    std::cout << "corners " << counter.corners() << "\\n";
}
`,
    beforeOutput: "circle r=2\nrect 3x4\nunknown shape",
    afterOutput: "circle r=2\nrect 3x4\ntriangle\ncorners 7",
    refactorNotes: `The type-switch is gone. \`describe\` and \`CornerCounter\` are two operations added without editing \`Circle\`, \`Rect\` or \`Triangle\`. The safety property is the point: add a fourth shape and \`ShapeVisitor\` gets a new pure virtual, so every visitor refuses to compile until it handles the newcomer, instead of printing "unknown shape" in production.

**Trade-offs:** Visitor makes new types expensive (touch the interface and all visitors) and creates a cyclic dependency between the interface and the elements, which is why the code forward-declares them. Elements must expose enough accessors for the visitor to work, which weakens encapsulation. If you are on C++17 and the set of types is closed, \`std::variant\` with \`std::visit\` gives the same exhaustiveness check with much less ceremony and no base class; mention it as the modern alternative.`,
    interviewSignal: `Say "operations change more often than the types" before reaching for it, and name double dispatch. Show \`accept\` calling \`visitor.visit(*this)\` and explain why the call must be in the concrete class. Senior signal: you state the expression-problem trade-off, offer \`std::variant\` + \`std::visit\` as the lighter option, and explain that adding a type breaks the build on purpose. It appears in AST walkers, file-system trees (size, search, export) and pricing rules over a fixed set of item kinds.`,
    overApplication: `For two element types and one operation, a virtual method is simpler. Visitors over a hierarchy that grows monthly turn every addition into a many-file change. The accept/visit pair is boilerplate that readers have to learn, and visitors that need to reach into every element's private data end up forcing public getters. Do not use Visitor to avoid writing a virtual function you are allowed to add.`,
  },
  {
    id: "interpreter",
    level: "L5",
    title: "Interpreter: a small grammar as a tree of objects",
    oneLiner: "Represent each rule of a tiny language as a class, so a sentence becomes a tree that evaluates itself.",
    cardTopic: "L5.interpreter",
    intro: `The Interpreter pattern models **a small, stable language** as a class per grammar rule. A sentence is a tree: leaves are terminals (a number, a variable), inner nodes are non-terminals (add, multiply, and, or). Every node has one method, \`eval(context)\`, which evaluates its children and combines the results. The context carries the variable bindings.

The shape of the tree carries the meaning, including precedence: \`2 + 3 * 4\` is \`Add(2, Multiply(3, 4))\`. Parsing text into that tree is a separate job (a parser, or hand-built trees in tests). The pattern itself is only the tree and the evaluation.

It is **Composite with a purpose**: same structure, but the leaves and nodes together define a language. Use it for rules a product owner edits (pricing rules, filters, validation expressions) when the grammar is tiny and fixed.`,
    smell: `- An evaluator that scans a list of tokens with ad-hoc rules and gets precedence or nesting wrong.
- Rules are strings parsed again at every evaluation.
- Each new operator means another \`else if\` inside one big function.
- Behaviour and grammar are tangled, so tests can only exercise whole strings.`,
    before: `#include <iostream>
#include <string>
#include <vector>

// Evaluates tokens strictly left to right, so "2 + 3 * 4" becomes (2 + 3) * 4.
int evaluate(const std::vector<std::string>& tokens) {
    int result = std::stoi(tokens[0]);
    for (std::size_t i = 1; i + 1 < tokens.size(); i += 2) {
        const int operand = std::stoi(tokens[i + 1]);
        if (tokens[i] == "+") result += operand;
        else if (tokens[i] == "*") result *= operand;
    }
    return result;
}

int main() {
    std::cout << "2+3*4 = " << evaluate({"2", "+", "3", "*", "4"}) << "\\n";
}
`,
    after: `#include <iostream>
#include <map>
#include <memory>
#include <string>
#include <utility>

using Context = std::map<std::string, int>;

// The grammar is a tree of small classes. Each node knows how to evaluate itself.
class Expr {
public:
    virtual ~Expr() = default;
    virtual int eval(const Context& context) const = 0;
};

using ExprPtr = std::unique_ptr<Expr>;

class Number final : public Expr {
public:
    explicit Number(int value) : value_(value) {}
    int eval(const Context&) const override { return value_; }

private:
    int value_;
};

class Variable final : public Expr {
public:
    explicit Variable(std::string name) : name_(std::move(name)) {}
    int eval(const Context& context) const override { return context.at(name_); }

private:
    std::string name_;
};

class Add final : public Expr {
public:
    Add(ExprPtr left, ExprPtr right) : left_(std::move(left)), right_(std::move(right)) {}
    int eval(const Context& context) const override { return left_->eval(context) + right_->eval(context); }

private:
    ExprPtr left_;
    ExprPtr right_;
};

class Multiply final : public Expr {
public:
    Multiply(ExprPtr left, ExprPtr right) : left_(std::move(left)), right_(std::move(right)) {}
    int eval(const Context& context) const override { return left_->eval(context) * right_->eval(context); }

private:
    ExprPtr left_;
    ExprPtr right_;
};

int main() {
    const Context context{{"qty", 3}};
    // The shape of the tree carries precedence: 2 + (3 * 4).
    const ExprPtr sum = std::make_unique<Add>(std::make_unique<Number>(2),
                                              std::make_unique<Multiply>(std::make_unique<Number>(3), std::make_unique<Number>(4)));
    const ExprPtr total = std::make_unique<Multiply>(std::make_unique<Variable>("qty"), std::make_unique<Number>(5));
    std::cout << "2+3*4 = " << sum->eval(context) << "\\n";
    std::cout << "qty*5 = " << total->eval(context) << "\\n";
}
`,
    beforeOutput: "2+3*4 = 20",
    afterOutput: "2+3*4 = 14\nqty*5 = 15",
    refactorNotes: `The flat loop evaluated \`2 + 3 * 4\` as \`(2 + 3) * 4 = 20\`; it had no concept of grouping. The tree makes the structure explicit and gives \`14\`. Adding a new operator (\`Subtract\`, \`Max\`) is a new class, with no change to the existing ones, and each node can be unit-tested alone. Children are owned by \`unique_ptr\`, so a tree is destroyed by destroying its root, and \`eval\` is \`const\`. The variable lookup uses \`at()\`, which throws for an unbound name rather than inventing a value.

**Trade-offs:** one class per grammar rule does not scale; real languages need a parser generator, a bytecode VM or an existing library. The tree is slow compared to compiled code. And with many operations over the same tree (evaluate, print, simplify, type-check), add a Visitor instead of a growing \`eval\`-style method on every node. Say plainly that Interpreter is the right size for tens of rules, not hundreds.`,
    interviewSignal: `Use it when the problem says "rules", "expressions", "filters" or "a mini query language". Draw the grammar as a few lines, then the tree for one example, and point out that the tree encodes precedence. Senior signal: you separate parsing from evaluation, bound the pattern ("small, stable grammar"), name the escape hatches (parser generator, embedded scripting, a lambda in a table), and mention validating the tree before evaluating it.`,
    overApplication: `Writing a class per rule for a two-operator calculator is heavy; a function is enough. Do not invent a language when a configuration table or a lambda would do. A grammar that keeps growing is a sign you needed a real parser and a real VM, and an Interpreter hierarchy will not stay fast or maintainable there.`,
  },
  {
    id: "null-object",
    level: "L5",
    title: "Null Object: a do-nothing collaborator instead of null checks",
    oneLiner: "Replace an optional dependency's null checks with a real object whose methods deliberately do nothing.",
    cardTopic: "L5.null-object",
    intro: `A Null Object is **a real implementation of an interface that does nothing on purpose**. Instead of passing \`nullptr\` for "no logger" and checking \`if (logger)\` at every use, you pass a \`NullLogger\`. The caller treats it like any other \`Logger\`; the conditional disappears, and so does the class of bugs where one check was forgotten.

In C++ two things make it stronger: own the collaborator with \`std::unique_ptr\` (or take a reference) and **normalise in the constructor**, so the member can never be null. Then the rest of the class is written as if the collaborator always exists.

The pattern is only right when "do nothing" is a correct answer. A logger, a metrics sink, an audit hook and a default-empty discount strategy qualify. A payment gateway does not: silently doing nothing there turns a missing dependency into lost money.`,
    smell: `- \`if (ptr != nullptr)\` before almost every call on one dependency.
- A bug report that is a crash in the one method where someone forgot the check.
- Tests that pass \`nullptr\` to avoid constructing a real collaborator.
- A comment: "may be null".`,
    before: `#include <iostream>
#include <string>

class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(const std::string& line) = 0;
};

class ConsoleLogger final : public Logger {
public:
    void log(const std::string& line) override { std::cout << "log: " << line << "\\n"; }
};

// The logger is optional, so every use needs its own null check. One forgotten check is a crash.
class Service {
public:
    explicit Service(Logger* logger) : logger_(logger) {}
    void charge(int amount) {
        if (logger_ != nullptr) logger_->log("charging " + std::to_string(amount));
        std::cout << "paid " << amount << "\\n";
        if (logger_ != nullptr) logger_->log("done");
    }

private:
    Logger* logger_;
};

int main() {
    ConsoleLogger console;
    Service quiet(nullptr);
    Service chatty(&console);
    quiet.charge(5);
    chatty.charge(7);
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>

class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(const std::string& line) = 0;
};

class ConsoleLogger final : public Logger {
public:
    void log(const std::string& line) override { std::cout << "log: " << line << "\\n"; }
};

// Does nothing, on purpose. It is a real Logger, so callers never ask "is there one?".
class NullLogger final : public Logger {
public:
    void log(const std::string&) override {}
};

class Service {
public:
    explicit Service(std::unique_ptr<Logger> logger = nullptr)
        : logger_(logger ? std::move(logger) : std::make_unique<NullLogger>()) {}
    void charge(int amount) {
        logger_->log("charging " + std::to_string(amount));
        std::cout << "paid " << amount << "\\n";
        logger_->log("done");
    }

private:
    std::unique_ptr<Logger> logger_;  // never null: the constructor guarantees it
};

int main() {
    Service quiet;
    Service chatty(std::make_unique<ConsoleLogger>());
    quiet.charge(5);
    chatty.charge(7);
}
`,
    beforeOutput: "paid 5\nlog: charging 7\npaid 7\nlog: done",
    afterOutput: "paid 5\nlog: charging 7\npaid 7\nlog: done",
    refactorNotes: `\`Service\` no longer branches. Its constructor accepts a \`std::unique_ptr<Logger>\` and swaps a \`nullptr\` for a \`NullLogger\`, so \`logger_\` is never null and every call site is one line. The output is identical in both versions; what changed is that a forgotten check can no longer exist. \`NullLogger\` is \`final\` and has no state, so it is also a good test double.

**Trade-offs:** a Null Object can hide a real configuration mistake: if production should always have a real logger, a silent default means you find out during an incident. Make "no-op by choice" explicit (the caller asks for \`NullLogger\`) when absence is a bug, or fail fast instead. For genuinely optional values (not collaborators), \`std::optional\` makes absence visible in the type and is usually better. A Null Object also needs sensible return values for non-void methods ("zero discount", "empty list"), which must be the neutral element of the operation.`,
    interviewSignal: `Mention it when you see repeated null checks on a collaborator. Say "the default is a real object that does nothing", normalise it in the constructor, and keep the member non-null. Senior signal: you separate "absence is fine" (logger, metrics) from "absence is an error" (payments, auth), and name \`std::optional\` and fail-fast as the alternatives. It is a natural fit for a "no discount", "no notification" or "no-op cache" default in machine-coding problems.`,
    overApplication: `Using a Null Object to paper over a dependency that must exist swallows errors. Creating a Null variant of every interface adds classes nobody needed, and null objects with non-neutral return values ("zero" for a price that should be an error) corrupt results quietly. If there is exactly one call site, one \`if\` is clearer than a new class.`,
  },
];
