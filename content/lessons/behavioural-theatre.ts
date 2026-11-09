import type { Lesson } from "@/lib/lessons/model";

/**
 * Behavioural Theatre lessons (CURRICULUM L5). Original wording. Every `before`/`after` program is compiled and run
 * natively by content:verify, and every `after` must pass Senior Review with no blocker or major.
 * Part 1: Strategy, Observer, Command, State. The remaining patterns follow in later runs.
 */
export const BEHAVIOURAL_THEATRE_LESSONS: Lesson[] = [
  {
    id: "strategy",
    level: "L5",
    title: "Strategy: swap the rule, keep the caller",
    oneLiner: "Put each interchangeable rule behind one interface so the caller picks a policy instead of branching on a name.",
    cardTopic: "L5.strategy",
    intro: `A Strategy is **one algorithm behind an interface**, handed to the code that needs it. The client (here, \`Checkout\`) asks \`policy.cost(kg)\` and neither knows nor cares which rule answers. Adding a rule means adding a class; the client and its tests do not change. That is the Open/Closed Principle with a concrete mechanism.

In C++ you have a spectrum of ways to pass the rule: a virtual interface (runtime choice, can be swapped on a live object), a template parameter (compile-time choice, zero overhead, but the type is baked in), or a \`std::function\` / lambda (cheapest to write, fine when the rule is a single function with no extra state or vocabulary). Interviewers like to hear you pick on purpose.

Strategy is chosen by **the caller or configuration**, from outside. If the object changes its own behaviour as it moves through a lifecycle, that is State. If the algorithm's skeleton is fixed and only steps vary, that is Template Method.`,
    smell: `- A \`switch\` or \`if\` chain on a string, enum or type tag that selects a calculation.
- Every new variant means editing the same function again (and its tests).
- An unknown tag silently falls through to a default such as \`0\`.
- Tests have to go through the chooser to reach a single rule.`,
    before: `#include <iostream>
#include <string>

// One function knows every shipping rule. Adding "overnight" means editing it, and a typo silently costs nothing.
double shippingCost(const std::string& method, double kg) {
    if (method == "standard") return 5.0 + 1.0 * kg;
    if (method == "express") return 12.0 + 2.5 * kg;
    return 0.0;
}

int main() {
    std::cout << shippingCost("standard", 2.0) << "\\n";
    std::cout << shippingCost("express", 2.0) << "\\n";
    std::cout << shippingCost("drone", 2.0) << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <utility>

// The strategy interface: one rule, one question.
class ShippingPolicy {
public:
    virtual ~ShippingPolicy() = default;
    virtual double cost(double kg) const = 0;
};

class StandardShipping : public ShippingPolicy {
public:
    double cost(double kg) const override { return 5.0 + 1.0 * kg; }
};

class ExpressShipping : public ShippingPolicy {
public:
    double cost(double kg) const override { return 12.0 + 2.5 * kg; }
};

class FreeShipping : public ShippingPolicy {
public:
    double cost(double) const override { return 0.0; }
};

// The client owns a policy and never branches on which one it is.
class Checkout {
public:
    explicit Checkout(std::unique_ptr<ShippingPolicy> policy) : policy_(std::move(policy)) {}
    void setPolicy(std::unique_ptr<ShippingPolicy> policy) { policy_ = std::move(policy); }
    double total(double itemsTotal, double kg) const { return itemsTotal + policy_->cost(kg); }

private:
    std::unique_ptr<ShippingPolicy> policy_;
};

int main() {
    Checkout checkout(std::make_unique<StandardShipping>());
    std::cout << checkout.total(100.0, 2.0) << "\\n";
    checkout.setPolicy(std::make_unique<ExpressShipping>());
    std::cout << checkout.total(100.0, 2.0) << "\\n";
    checkout.setPolicy(std::make_unique<FreeShipping>());
    std::cout << checkout.total(100.0, 2.0) << "\\n";
}
`,
    beforeOutput: "7\n17\n0",
    afterOutput: "107\n117\n100",
    refactorNotes: `Each rule is now a small class that can be tested alone, and \`Checkout\` is closed against new rules: an overnight policy is one new class. The unknown-method case is gone because you cannot name a policy that does not exist; the compiler checks it. The client owns its policy through a \`unique_ptr\`, so ownership is explicit and swapping at runtime is one call.

**Trade-offs:** a virtual call per use and one heap allocation per policy, which is irrelevant for shipping and relevant in a hot loop (use a template parameter there). If a rule is a single stateless function, a \`std::function<double(double)>\` or a lambda is lighter than a class hierarchy. Choosing *which* policy to build from user input still needs a place with a \`switch\` or a registry; Strategy moves that decision to one edge instead of removing it.`,
    interviewSignal: `Say "this rule varies and the caller should not know how". Name the three C++ options (virtual interface, template parameter, \`std::function\`) and give the deciding factor for each: runtime swap, zero overhead, or minimal ceremony. Senior signal: you say who constructs the strategy (a factory or the composition root), keep strategies free of the client's internal state, and contrast Strategy (chosen from outside) with State (the object changes its own behaviour).`,
    overApplication: `Do not make a Strategy for something with one implementation and no foreseeable second one; an interface with a single class is just indirection. A hierarchy of one-method classes where a lambda would do adds files and names without adding flexibility. Watch for strategies that need the client's private data: if every strategy takes a dozen arguments or reaches back into the client, the boundary is in the wrong place.`,
  },
  {
    id: "observer",
    level: "L5",
    title: "Observer: publish a change without knowing who cares",
    oneLiner: "Let a subject notify a changing set of listeners through one interface, and hold them so a dead listener cannot dangle.",
    cardTopic: "L5.observer",
    intro: `An Observer lets a **subject announce a change** to any number of **listeners it does not know by name**. The subject depends only on a tiny \`Listener\` interface; displays, loggers and alarms subscribe themselves. New reactions need no edit to the subject.

The hard part in C++ is **lifetime**. If the subject keeps raw pointers, a listener that is destroyed leaves a dangling pointer and the next notification is undefined behaviour. If the subject keeps \`shared_ptr\`, it keeps listeners alive forever and you get a leak (the classic "lapsed listener"). The usual fix is that the subject stores \`std::weak_ptr<Listener>\`: it can ask "are you still there?" before calling, and it prunes expired entries.

Also decide, and say, what happens when a listener subscribes or unsubscribes **during** a notification, whether delivery is synchronous (simple, but a slow listener blocks the subject) or queued, and whether the order of listeners is part of the contract.`,
    smell: `- The subject's setter calls each reaction by name: \`display.show(); logger.log(); alarm.check();\`.
- Adding a new reaction means editing the subject.
- The subject includes headers for every module that reacts to it.
- A subscription list of raw pointers, with no unsubscribe or lifetime story.`,
    before: `#include <iostream>

class Display {
public:
    void show(double t) const { std::cout << "display: " << t << "\\n"; }
};

class Logger {
public:
    void log(double t) const { std::cout << "log: " << t << "\\n"; }
};

// The sensor knows and owns every reaction. A new reaction means editing Sensor.
class Sensor {
public:
    void set(double t) {
        display_.show(t);
        logger_.log(t);
    }

private:
    Display display_;
    Logger logger_;
};

int main() {
    Sensor sensor;
    sensor.set(21.5);
    sensor.set(22.0);
}
`,
    after: `#include <algorithm>
#include <iostream>
#include <memory>
#include <vector>

class Listener {
public:
    virtual ~Listener() = default;
    virtual void onReading(double t) = 0;
};

// The subject holds weak references: it never keeps a listener alive and never calls a dead one.
class Sensor {
public:
    void subscribe(const std::shared_ptr<Listener>& listener) { listeners_.push_back(listener); }

    void set(double t) {
        pruneExpired();
        // Iterate over a copy so a listener that subscribes during the callback cannot invalidate the loop.
        const auto snapshot = listeners_;
        for (const auto& weak : snapshot) {
            if (const auto listener = weak.lock()) listener->onReading(t);
        }
    }

private:
    void pruneExpired() {
        listeners_.erase(std::remove_if(listeners_.begin(), listeners_.end(),
                                        [](const std::weak_ptr<Listener>& w) { return w.expired(); }),
                         listeners_.end());
    }

    std::vector<std::weak_ptr<Listener>> listeners_;
};

class Display : public Listener {
public:
    void onReading(double t) override { std::cout << "display: " << t << "\\n"; }
};

class Logger : public Listener {
public:
    void onReading(double t) override { std::cout << "log: " << t << "\\n"; }
};

int main() {
    Sensor sensor;
    const auto display = std::make_shared<Display>();
    sensor.subscribe(display);
    {
        const auto logger = std::make_shared<Logger>();
        sensor.subscribe(logger);
        sensor.set(21.5);
    }
    // The logger is gone; the sensor skips and prunes it instead of calling freed memory.
    sensor.set(22.0);
}
`,
    beforeOutput: "display: 21.5\nlog: 21.5\ndisplay: 22\nlog: 22",
    afterOutput: "display: 21.5\nlog: 21.5\ndisplay: 22",
    refactorNotes: `\`Sensor\` now depends on one two-line interface. Adding an alarm is a new class plus one \`subscribe\` call at the composition root; the sensor and its tests do not change. The second reading shows the lifetime story: the logger went out of scope, the weak reference expired, and the sensor skipped and pruned it.

**Trade-offs:** notification is synchronous and single-threaded here. With threads you need a lock around the list (and must not call listeners while holding it, or a listener that calls back deadlocks); with slow listeners you queue events instead, which brings ordering and back-pressure questions. There is also no explicit unsubscribe; with \`weak_ptr\` expiry is the unsubscribe, which is simple but means listeners must be owned by someone else. If you need deterministic removal, return a subscription handle (RAII) that unsubscribes in its destructor.`,
    interviewSignal: `Say "the subject should not know its listeners", then immediately raise the lifetime problem: raw pointers dangle, \`shared_ptr\` leaks, so \`weak_ptr\`. Name re-entrancy (subscribe or unsubscribe during notify), threading, and ordering as the follow-up decisions. Senior signal: you distinguish in-process Observer from a pub/sub or message bus (network, durability, at-least-once delivery), and say when you would use a queue instead.`,
    overApplication: `Observers make control flow invisible: a single setter can trigger a cascade you can only find at runtime, and a listener that mutates the subject can cause loops. If there is exactly one reaction and it is part of the same module, call it directly. Avoid a global event bus used as a substitute for passing a dependency; it turns every class into a hidden dependency on every other and makes debugging and ordering guesswork.`,
  },
  {
    id: "command",
    level: "L5",
    title: "Command: turn an action into an object you can store and undo",
    oneLiner: "Wrap a request as an object with execute and undo so it can be queued, logged, repeated and reversed.",
    cardTopic: "L5.command",
    intro: `A Command is **a request packaged as an object**. It knows its receiver, carries the arguments, and exposes \`execute()\`, usually with \`undo()\`. Because it is a value you can hold, you can put it in a list: that gives you **history, undo/redo, queues, macros, retry and audit logs**.

Undo has two honest designs. A command can store **what it needs to reverse itself** (an \`AppendCommand\` remembers the text it added), which is small and fast. Or a command can capture a **snapshot** (Memento) of the state before it runs, which is simpler for complex edits and costs memory. Pick per command and say why.

A new command after an undo must **clear the redo stack**; otherwise redo would replay something that no longer follows from the current state. Invoker, command and receiver are the three roles interviewers expect you to name: the invoker (a \`History\` or a button) calls the command, which acts on the receiver (the \`Document\`).`,
    smell: `- UI handlers call the model directly, so there is no single place to record what was done.
- "Undo" is requested but nothing remembers the actions, or each action snapshots the whole state.
- Retry, queueing or macros would need every caller rewritten.
- A giant \`switch\` that interprets action codes.`,
    before: `#include <iostream>
#include <string>

class Document {
public:
    void append(const std::string& s) { text_ += s; }
    const std::string& text() const { return text_; }

private:
    std::string text_;
};

// Callers mutate the document directly, so nothing records what happened and undo is impossible.
int main() {
    Document doc;
    doc.append("hello");
    doc.append(" world");
    std::cout << doc.text() << "\\n";
}
`,
    after: `#include <cstddef>
#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

// The receiver.
class Document {
public:
    void append(const std::string& s) { text_ += s; }
    void truncate(std::size_t n) { text_.resize(n < text_.size() ? text_.size() - n : 0); }
    const std::string& text() const { return text_; }

private:
    std::string text_;
};

class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

// Stores exactly what it needs to reverse itself. The document must outlive the command.
class AppendCommand : public Command {
public:
    AppendCommand(Document& doc, std::string text) : doc_(doc), text_(std::move(text)) {}
    void execute() override { doc_.append(text_); }
    void undo() override { doc_.truncate(text_.size()); }

private:
    Document& doc_;
    std::string text_;
};

// The invoker: runs commands and keeps the two stacks.
class History {
public:
    void run(std::unique_ptr<Command> command) {
        command->execute();
        undoStack_.push_back(std::move(command));
        redoStack_.clear();  // a new action invalidates the old future
    }

    bool undo() {
        if (undoStack_.empty()) return false;
        auto command = std::move(undoStack_.back());
        undoStack_.pop_back();
        command->undo();
        redoStack_.push_back(std::move(command));
        return true;
    }

    bool redo() {
        if (redoStack_.empty()) return false;
        auto command = std::move(redoStack_.back());
        redoStack_.pop_back();
        command->execute();
        undoStack_.push_back(std::move(command));
        return true;
    }

private:
    std::vector<std::unique_ptr<Command>> undoStack_;
    std::vector<std::unique_ptr<Command>> redoStack_;
};

int main() {
    Document doc;
    History history;
    history.run(std::make_unique<AppendCommand>(doc, "hello"));
    history.run(std::make_unique<AppendCommand>(doc, " world"));
    std::cout << doc.text() << "\\n";
    history.undo();
    std::cout << doc.text() << "\\n";
    history.redo();
    std::cout << doc.text() << "\\n";
    history.undo();
    history.undo();
    std::cout << "[" << doc.text() << "]\\n";
    std::cout << (history.undo() ? "undone" : "nothing to undo") << "\\n";
}
`,
    beforeOutput: "hello world",
    afterOutput: "hello world\nhello\nhello world\n[]\nnothing to undo",
    refactorNotes: `Every edit goes through \`History::run\`, so undo, redo, and (later) logging or macro recording are one place. Adding a \`DeleteCommand\` touches neither \`History\` nor the existing commands. Ownership is explicit: the history owns commands through \`unique_ptr\`; a command only references its receiver.

**Trade-offs:** one object per action means allocation and memory growth, so real editors cap history or coalesce typing into one command. A command that stores a reference to its receiver is only valid while the receiver lives; if commands can outlive it, hold an id or a \`weak_ptr\`. A command's \`undo()\` must exactly invert \`execute()\`; commands that cannot be reversed (sending an email) should say so rather than pretend.`,
    interviewSignal: `Say "I need to record and reverse actions, so each action becomes an object". Name the roles (invoker, command, receiver), show two stacks, and volunteer that a fresh command clears redo. Senior signal: you compare storing a delta with a Memento snapshot, mention coalescing and history limits, and connect Command to queues, retries, idempotency keys and event sourcing in system design.`,
    overApplication: `A command class per button press is ceremony when nothing needs undo, queueing or logging; a plain method call or lambda does the job. Commands that duplicate their receiver's whole API turn into a second copy of the model. If a "command" is really a long-running workflow with steps that can fail halfway, you want a saga or a transaction, not a bigger Command.`,
  },
  {
    id: "state",
    level: "L5",
    title: "State: let the current mode decide what a call does",
    oneLiner: "Replace repeated switches on a mode flag with one object per state, each deciding its own behaviour and next state.",
    cardTopic: "L5.state",
    intro: `A State pattern models an object whose **behaviour depends on a mode**, such as a media player that is stopped, playing or paused. Instead of every method switching on an enum, each mode is a class implementing the same interface. The context (\`Player\`) forwards calls to its current state object, and the state decides what to do and which state comes next.

The payoff is that **a state's rules live in one place** and an illegal action is handled where the state is defined. Adding a state adds a class; the cost is that the transition graph is now spread across classes, so keep a diagram or table beside it.

Compared with Strategy, the code looks the same; the difference is **who changes it and why**. A Strategy is injected from outside and stays put. A State is replaced by the object itself as events happen. A small machine with two or three states and simple rules is often clearer as an enum and a transition table, and that is a perfectly good answer.`,
    smell: `- The same \`switch (mode_)\` repeated in every public method.
- Adding a state means editing every method, and it is easy to forget one.
- Boolean flags that must be kept consistent (\`isPlaying_\`, \`isPaused_\`).
- Illegal transitions guarded by scattered \`if\` checks.`,
    before: `#include <iostream>

enum class Mode { Stopped, Playing, Paused };

// Every method repeats the switch. A fourth mode touches both of them (and any we add later).
class Player {
public:
    void play() {
        switch (mode_) {
            case Mode::Stopped: std::cout << "start\\n"; mode_ = Mode::Playing; break;
            case Mode::Playing: std::cout << "already playing\\n"; break;
            case Mode::Paused: std::cout << "resume\\n"; mode_ = Mode::Playing; break;
        }
    }

    void pause() {
        switch (mode_) {
            case Mode::Stopped: std::cout << "cannot pause\\n"; break;
            case Mode::Playing: std::cout << "pause\\n"; mode_ = Mode::Paused; break;
            case Mode::Paused: std::cout << "already paused\\n"; break;
        }
    }

private:
    Mode mode_ = Mode::Stopped;
};

int main() {
    Player player;
    player.pause();
    player.play();
    player.pause();
    player.play();
    player.play();
}
`,
    after: `#include <iostream>
#include <memory>
#include <utility>

// Each handler does its work and returns the next state, or nullptr to stay where it is.
// Returning the next state (instead of the state replacing itself) means a state is never destroyed mid-call.
class State {
public:
    virtual ~State() = default;
    virtual std::unique_ptr<State> onPlay() const = 0;
    virtual std::unique_ptr<State> onPause() const = 0;
};

class StoppedState : public State {
public:
    std::unique_ptr<State> onPlay() const override;
    std::unique_ptr<State> onPause() const override;
};

class PlayingState : public State {
public:
    std::unique_ptr<State> onPlay() const override;
    std::unique_ptr<State> onPause() const override;
};

class PausedState : public State {
public:
    std::unique_ptr<State> onPlay() const override;
    std::unique_ptr<State> onPause() const override;
};

std::unique_ptr<State> StoppedState::onPlay() const {
    std::cout << "start\\n";
    return std::make_unique<PlayingState>();
}
std::unique_ptr<State> StoppedState::onPause() const {
    std::cout << "cannot pause\\n";
    return nullptr;
}

std::unique_ptr<State> PlayingState::onPlay() const {
    std::cout << "already playing\\n";
    return nullptr;
}
std::unique_ptr<State> PlayingState::onPause() const {
    std::cout << "pause\\n";
    return std::make_unique<PausedState>();
}

std::unique_ptr<State> PausedState::onPlay() const {
    std::cout << "resume\\n";
    return std::make_unique<PlayingState>();
}
std::unique_ptr<State> PausedState::onPause() const {
    std::cout << "already paused\\n";
    return nullptr;
}

// The context only forwards. It has no switch and no mode flag.
class Player {
public:
    Player() : state_(std::make_unique<StoppedState>()) {}
    void play() { change(state_->onPlay()); }
    void pause() { change(state_->onPause()); }

private:
    void change(std::unique_ptr<State> next) {
        if (next) state_ = std::move(next);
    }

    std::unique_ptr<State> state_;
};

int main() {
    Player player;
    player.pause();
    player.play();
    player.pause();
    player.play();
    player.play();
}
`,
    beforeOutput: "cannot pause\nstart\npause\nresume\nalready playing",
    afterOutput: "cannot pause\nstart\npause\nresume\nalready playing",
    refactorNotes: `Behaviour is identical (the output is the same, which is the point of a refactor), but each state's rules now sit in one class. A \`SeekingState\` is a new class plus the transitions that lead to it; \`Player\` is untouched. The handlers return the next state rather than calling back into the context, so a state is never destroyed while its own method is running, a classic C++ bug when a state does \`context.setState(...)\` and then touches \`this\`.

**Trade-offs:** three classes and an allocation per transition replace two switches. For stateless states you can share singletons instead of allocating. The transition graph is no longer visible in one function, so document it (a table or diagram). With only a few states and rare change, the enum plus \`switch\` is easier to read, and a table-driven machine (\`state x event -> next\`) scales better when there are many states and few behaviours.`,
    interviewSignal: `Say "the allowed actions depend on the current mode, and that mode changes as events happen". Draw the state diagram first, then map each state to a class. Name the object-destroyed-during-its-own-call hazard and how you avoid it. Senior signal: you compare State with Strategy (who triggers the change), with an enum plus table (fewer files, central graph), and note where state machines show up in the problems: vending machine, elevator, parking lot, ATM, circuit breaker.`,
    overApplication: `Two states and a bool rarely deserve a class hierarchy. Splitting a small machine across many files hides the whole picture, and states that share most of their code end up duplicating it or inheriting awkwardly. If transitions are driven by data (a workflow loaded from configuration) a table is more honest than compiled classes. And do not use State to hide a boolean that is really a validation rule on a single field.`,
  },
];
