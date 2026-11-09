import type { Lesson } from "@/lib/lessons/model";

/**
 * Behavioural Theatre lessons, part 2 (CURRICULUM L5): Template Method, Iterator, Chain of Responsibility, Mediator.
 * Original wording. Every `before`/`after` program is compiled and run natively by content:verify, and every `after`
 * must pass Senior Review with no blocker or major.
 */
export const BEHAVIOURAL_THEATRE_LESSONS_2: Lesson[] = [
  {
    id: "template-method",
    level: "L5",
    title: "Template Method: fix the skeleton, vary the steps",
    oneLiner: "Let a base class own the order of the steps and let subclasses fill in only the steps that differ.",
    cardTopic: "L5.template-method",
    intro: `A Template Method is **an algorithm whose outline never changes but whose steps do**. The base class owns the outline in one public, non-virtual function (\`run()\`), and calls small virtual steps that subclasses override. The order, the setup and the clean-up live in exactly one place, so a subclass cannot forget the closing step or run the steps out of order.

In C++ the idiomatic form is the **non-virtual interface (NVI)**: the public function is not virtual, and the steps are \`private\` or \`protected\` virtuals. A subclass can still override a private virtual; it just cannot call it, which keeps the contract narrow. Optional steps are **hooks**: virtual functions with a harmless default (usually empty) that a subclass may override.

Template Method uses **inheritance** to vary the steps. Strategy uses **composition** to vary a whole algorithm. If the steps need to change at runtime, or you would rather not tie the variants to a base class, pass the steps in (Strategy) instead.`,
    smell: `- Two or three functions or classes repeat the same sequence (open, work, close) and differ in the middle.
- A fix to the sequence (a missing close, a new log line) has to be copied to every variant.
- One variant has quietly drifted: it skips a step the others perform.
- A comment says "remember to call this at the end".`,
    before: `#include <iostream>

// Each exporter repeats the skeleton by hand. The text one forgot to close.
void exportCsv() {
    std::cout << "open\\n";
    std::cout << "id,name\\n";
    std::cout << "1,Ada\\n";
    std::cout << "close\\n";
}

void exportText() {
    std::cout << "open\\n";
    std::cout << "ID NAME\\n";
    std::cout << "1 Ada\\n";
}

int main() {
    exportCsv();
    exportText();
}
`,
    after: `#include <iostream>
#include <memory>

// The base class owns the order of the steps. Callers use run(); nobody can skip "close".
class Exporter {
public:
    virtual ~Exporter() = default;
    void run() const {
        std::cout << "open\\n";
        writeHeader();
        writeRows();
        writeFooter();
        std::cout << "close\\n";
    }

private:
    virtual void writeHeader() const = 0;
    virtual void writeRows() const = 0;
    virtual void writeFooter() const {}  // hook: optional, empty by default
};

class CsvExporter : public Exporter {
private:
    void writeHeader() const override { std::cout << "id,name\\n"; }
    void writeRows() const override { std::cout << "1,Ada\\n"; }
};

class TextExporter : public Exporter {
private:
    void writeHeader() const override { std::cout << "ID NAME\\n"; }
    void writeRows() const override { std::cout << "1 Ada\\n"; }
    void writeFooter() const override { std::cout << "-- end\\n"; }
};

int main() {
    std::unique_ptr<Exporter> csv = std::make_unique<CsvExporter>();
    std::unique_ptr<Exporter> text = std::make_unique<TextExporter>();
    csv->run();
    text->run();
}
`,
    beforeOutput: "open\nid,name\n1,Ada\nclose\nopen\nID NAME\n1 Ada",
    afterOutput: "open\nid,name\n1,Ada\nclose\nopen\nID NAME\n1 Ada\n-- end\nclose",
    refactorNotes: `The sequence now exists once. The text exporter's missing \`close\` was a copy-and-paste drift; with the skeleton in the base class that bug cannot be written. \`writeHeader\` and \`writeRows\` are pure virtual (every variant must supply them) while \`writeFooter\` is a hook with a default. Because \`run()\` is non-virtual, no subclass can change the order, and because the steps are private, callers cannot call them in a different order either.

**Trade-offs:** the variants are welded to the base class, and a deep chain of overrides is hard to follow. Adding a step to the skeleton changes every subclass's behaviour at once, which is the point and also the risk. A virtual call from a constructor or destructor does **not** reach the derived override, so never run the template from a base-class constructor. When variants need to be picked or swapped at runtime, or are better as small values, prefer Strategy (compose the steps in).`,
    interviewSignal: `Say "the order is invariant and only these steps vary". Show \`run()\` non-virtual and the steps private virtual, and name the hooks. Senior signal: you mention NVI and why (one place to add logging, locking or pre/post-conditions), the constructor-virtual-call trap, and the contrast with Strategy (inheritance versus composition). It appears in real problems as the processing pipeline of a game turn, a report generator, or a payment flow with validate, authorise, capture.`,
    overApplication: `A hierarchy to share two lines of code is not worth the coupling. If subclasses override most of the steps, or override the skeleton itself, the base class is not buying you anything. Many hooks make a framework nobody can reason about: a subclass has to know which hooks interact. And do not use inheritance for reuse when a free function or a Strategy would do.`,
  },
  {
    id: "iterator",
    level: "L5",
    title: "Iterator: walk a collection without exposing it",
    oneLiner: "Give clients a way to visit the elements in order without handing them the container's insides.",
    cardTopic: "L5.iterator",
    intro: `An Iterator is **a position plus a way to advance it**, so a client can visit every element without knowing how they are stored. In C++ the pattern is built into the language: the standard containers hand out iterators, \`begin()\` and \`end()\` make a type usable in a range-based \`for\`, and the standard algorithms accept any iterator pair.

The design question is **what you expose**. Returning a reference to the internal \`std::vector\` lets callers add, remove and reorder elements behind your back, and welds every call site to \`vector\`. Exposing only \`begin() const\` and \`end() const\` gives read-only traversal, keeps your invariants, and lets you change the storage later without touching callers.

For your own structures (a tree, a ring buffer, a filtered view) you write a small iterator class: \`operator*\`, \`operator++\`, and \`operator!=\` (or \`==\`), and the matching \`begin()\`/\`end()\`. State the **invalidation rules**: which operations on the container make outstanding iterators unsafe.`,
    smell: `- A getter returns a mutable reference to an internal container.
- Callers index with \`for (i = 0; i < size(); ++i)\`, so every caller knows it is random-access.
- A "read" helper pops, sorts or erases the data it was meant to look at.
- Changing the storage (vector to list) means editing every loop.`,
    before: `#include <iostream>
#include <string>
#include <vector>

class Playlist {
public:
    void add(const std::string& title) { tracks_.push_back(title); }
    // Hands out the raw container: anyone can mutate it, and callers depend on std::vector.
    std::vector<std::string>& tracks() { return tracks_; }

private:
    std::vector<std::string> tracks_;
};

// A "print" helper that consumes the list it was only meant to read.
void printAll(Playlist& playlist) {
    auto& tracks = playlist.tracks();
    while (!tracks.empty()) {
        std::cout << tracks.front() << "\\n";
        tracks.erase(tracks.begin());
    }
}

int main() {
    Playlist playlist;
    playlist.add("Dawn");
    playlist.add("Harbour");
    printAll(playlist);
    std::cout << "left: " << playlist.tracks().size() << "\\n";
}
`,
    after: `#include <iostream>
#include <string>
#include <vector>

class Playlist {
public:
    using const_iterator = std::vector<std::string>::const_iterator;

    void add(const std::string& title) { tracks_.push_back(title); }
    std::size_t size() const { return tracks_.size(); }

    // Read-only traversal. The storage type is an implementation detail behind these two functions.
    const_iterator begin() const { return tracks_.begin(); }
    const_iterator end() const { return tracks_.end(); }

private:
    std::vector<std::string> tracks_;
};

void printAll(const Playlist& playlist) {
    for (const auto& title : playlist) std::cout << title << "\\n";
}

int main() {
    Playlist playlist;
    playlist.add("Dawn");
    playlist.add("Harbour");
    printAll(playlist);
    std::cout << "left: " << playlist.size() << "\\n";
}
`,
    beforeOutput: "Dawn\nHarbour\nleft: 0",
    afterOutput: "Dawn\nHarbour\nleft: 2",
    refactorNotes: `\`printAll\` now takes a \`const Playlist&\`, so the compiler guarantees it cannot consume the list, and the range-based \`for\` works because the class has \`begin()\` and \`end()\`. Callers never mention \`std::vector\`: switching to a \`std::deque\` or a chunked structure changes one \`using\` line and two functions. The class keeps its invariants because mutation goes only through \`add\`.

**Trade-offs:** aliasing the standard iterator is the cheapest honest answer. For a structure that is not a flat sequence (a tree, a graph walk, a filtered view) you write an iterator class yourself, and you must document invalidation: adding to a \`vector\` can invalidate every outstanding iterator, while inserting into a \`std::list\` does not. A pair of iterators is also a poor fit for lazy or infinite sequences; a generator-style or range-based API suits those better. Never let an iterator outlive the container.`,
    interviewSignal: `Say "clients should be able to traverse this, not mutate it or learn its layout". Offer \`begin() const\` and \`end() const\`, mention range-for and that the standard algorithms then work for free. Senior signal: you state iterator invalidation rules, know the category (forward, bidirectional, random-access) your own iterator should claim, and choose between exposing iterators, a visitor-style \`forEach\` callback, or a snapshot copy when the container is concurrent.`,
    overApplication: `Do not write a custom iterator class for a plain vector wrapper; an alias is enough. Do not build a full bidirectional random-access iterator when clients only need to visit once, a \`forEach(callback)\` is simpler. And exposing iterators from a class whose internals must stay private can leak more than a small accessor would, for example the ability to modify elements through a non-const iterator.`,
  },
  {
    id: "chain-of-responsibility",
    level: "L5",
    title: "Chain of Responsibility: pass it along until someone owns it",
    oneLiner: "Link handlers in a line so each one either handles a request or passes it to the next, with an explicit answer at the end.",
    cardTopic: "L5.chain-of-responsibility",
    intro: `A Chain of Responsibility sends a request along **a line of handlers**. Each handler decides: "mine" (handle it and stop) or "not mine" (pass it to the next). The sender knows only the first handler. The order of the chain is data you can configure, reorder, extend or test one link at a time.

You see it in approval limits, request middleware (authentication, rate limiting, logging), event bubbling in a UI and exception handling. A variant lets **every** handler act and always passes on (a pipeline of filters); say which one you mean.

In C++ the links own each other through \`std::unique_ptr<Handler> next_\`: the head owns the chain and destroying it destroys the rest. The question interviewers care about is **what happens at the end**. If nobody handles the request, return an explicit "unhandled" result; a chain that silently drops requests is a bug that is very hard to find.`,
    smell: `- One function with an \`if / else if\` ladder over thresholds or types, where the order matters.
- Adding a tier edits the ladder, and each tier cannot be tested without the others.
- The final \`else\` quietly returns a default for requests nobody should have accepted.
- The same ladder is copied to a second place that must be kept in step.`,
    before: `#include <iostream>
#include <string>

// The whole approval policy is one ladder. Tier order, limits and the fall-off case all live here.
std::string approve(int amount) {
    if (amount <= 100) return "manager approves " + std::to_string(amount);
    if (amount <= 1000) return "director approves " + std::to_string(amount);
    return "nobody approves " + std::to_string(amount);
}

int main() {
    std::cout << approve(50) << "\\n";
    std::cout << approve(500) << "\\n";
    std::cout << approve(5000) << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>

// One link in the chain: handle the request, or pass it on. The end of the chain gives an explicit answer.
class Approver {
public:
    virtual ~Approver() = default;

    void setNext(std::unique_ptr<Approver> next) { next_ = std::move(next); }

    std::string approve(int amount) const {
        if (canApprove(amount)) return name() + " approves " + std::to_string(amount);
        if (next_) return next_->approve(amount);
        return "nobody approves " + std::to_string(amount);
    }

private:
    virtual bool canApprove(int amount) const = 0;
    virtual std::string name() const = 0;

    std::unique_ptr<Approver> next_;
};

class Manager : public Approver {
private:
    bool canApprove(int amount) const override { return amount <= 100; }
    std::string name() const override { return "manager"; }
};

class Director : public Approver {
private:
    bool canApprove(int amount) const override { return amount <= 1000; }
    std::string name() const override { return "director"; }
};

int main() {
    auto head = std::make_unique<Manager>();
    head->setNext(std::make_unique<Director>());
    std::cout << head->approve(50) << "\\n";
    std::cout << head->approve(500) << "\\n";
    std::cout << head->approve(5000) << "\\n";
}
`,
    beforeOutput: "manager approves 50\ndirector approves 500\nnobody approves 5000",
    afterOutput: "manager approves 50\ndirector approves 500\nnobody approves 5000",
    refactorNotes: `Behaviour is unchanged, which is the point of the refactor. Each tier is a class with its own rule, so a \`VicePresident\` is one new class and one \`setNext\` call; the existing links are untouched and each can be tested alone. The chain is built at the edge (here \`main\`), so the order is configuration rather than code. The head owns the rest through \`unique_ptr\`, so there is no manual clean-up, and the last link returns an explicit "nobody approves" instead of a hidden default.

**Trade-offs:** a request can travel the whole chain before it is handled (cost grows with length), and a reader must follow the links to know which handler ran. When the rule is just "first threshold that fits", a sorted table of limits is shorter and easier to read than classes. Recursion depth equals chain length, so very long chains need a loop. Make sure the chain cannot contain a cycle.`,
    interviewSignal: `Say "several objects might handle this and the sender should not know which". Name what happens at the end of the chain, and whether handlers stop the request or all see it (filter pipeline). Senior signal: you offer the table-of-limits alternative, discuss ordering and ownership (\`unique_ptr\` links), and tie it to real designs such as middleware stacks, ATM cash dispensing (the 100/50/20 note handlers) and support-ticket escalation.`,
    overApplication: `For two fixed tiers that never change, an \`if\` is clearer than a class per tier. A chain whose handlers all depend on each other's side effects is a hidden pipeline that cannot be reordered safely. And a chain whose last link does nothing hides requests that fall off the end; always decide and test the "nobody handled it" case.`,
  },
  {
    id: "mediator",
    level: "L5",
    title: "Mediator: one place where the colleagues meet",
    oneLiner: "Make peers talk to a coordinator instead of to each other, so the coupling is one-to-one instead of everyone-to-everyone.",
    cardTopic: "L5.mediator",
    intro: `A Mediator is **a coordinator that peers talk through**. Without one, each of N objects holds references to the others it interacts with, which can grow toward N x (N-1) links: change one peer and you touch the rest. With one, each peer knows only the mediator, and the rules about who reacts to whom live in a single class.

Use it when **a group of objects has rich, interdependent rules** (a lobby, a chat room, an air-traffic tower, form fields that enable and disable each other). The peers become simple and reusable because they carry no knowledge of the others.

In C++ be explicit about lifetime. A peer that stores a reference to the mediator needs the mediator to outlive it, and a mediator that stores raw pointers to peers needs a way to hear that a peer is gone. Storing identifiers (names or ids) instead of pointers sidesteps most of that. And watch the failure mode: a mediator that absorbs every rule becomes a **god object**.`,
    smell: `- Every object keeps a list of pointers to its peers, and each wires up all the others.
- Adding a new participant means editing every existing one.
- A rule about the whole group (everyone is ready) is checked in each member and is slightly different in each.
- Peers cannot be reused or tested without the full set around them.`,
    before: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

// Each player knows every other player, and each one re-checks the group rule.
class Player {
public:
    explicit Player(std::string name) : name_(std::move(name)) {}
    void addPeer(const Player* peer) { peers_.push_back(peer); }
    bool isReady() const { return ready_; }

    void ready() {
        ready_ = true;
        std::cout << name_ << " ready\\n";
        for (const Player* peer : peers_) {
            if (!peer->isReady()) return;
        }
        std::cout << name_ << " starts the match\\n";
    }

private:
    std::string name_;
    bool ready_ = false;
    std::vector<const Player*> peers_;
};

int main() {
    Player a("ann"), b("ben"), c("cy");
    a.addPeer(&b); a.addPeer(&c);
    b.addPeer(&a); b.addPeer(&c);
    c.addPeer(&a); c.addPeer(&b);
    a.ready();
    b.ready();
    c.ready();
}
`,
    after: `#include <iostream>
#include <map>
#include <string>
#include <utility>

// The mediator owns the group rule. It stores names, not pointers, so a peer cannot dangle in it.
class Lobby {
public:
    void join(const std::string& name) { ready_[name] = false; }

    void markReady(const std::string& name) {
        ready_[name] = true;
        std::cout << name << " ready\\n";
        for (const auto& entry : ready_) {
            if (!entry.second) return;
        }
        std::cout << name << " starts the match\\n";
    }

private:
    std::map<std::string, bool> ready_;
};

// A player knows only the lobby (which must outlive it).
class Player {
public:
    Player(std::string name, Lobby& lobby) : name_(std::move(name)), lobby_(lobby) { lobby_.join(name_); }
    void ready() { lobby_.markReady(name_); }

private:
    std::string name_;
    Lobby& lobby_;
};

int main() {
    Lobby lobby;
    Player a("ann", lobby);
    Player b("ben", lobby);
    Player c("cy", lobby);
    a.ready();
    b.ready();
    c.ready();
}
`,
    beforeOutput: "ann ready\nben ready\ncy ready\ncy starts the match",
    afterOutput: "ann ready\nben ready\ncy ready\ncy starts the match",
    refactorNotes: `Behaviour is identical. The "everyone is ready" rule now exists once, in \`Lobby\`; a fourth player is one more \`Player\` and no edit to the other three (before, it meant six extra \`addPeer\` calls and a risk of forgetting one). \`Player\` is trivial and can be tested with a stub lobby. The lobby stores names rather than pointers, so a destroyed player cannot leave a dangling entry (a real lobby would also offer \`leave\`).

**Trade-offs:** the coupling has moved, not vanished: the mediator knows every colleague's protocol and can grow into a god object, so keep rules for *one* interaction group in it and split by group. It is also a single point to test and a potential bottleneck. If peers only broadcast "something happened" with no rules, an Observer or an event bus is lighter. Compare with Facade: a Facade simplifies access *to* a subsystem one-way, a Mediator coordinates two-way traffic *among* peers.`,
    interviewSignal: `Say "these objects have many interdependent interactions, so I'll route them through one coordinator". Draw N boxes with N^2 lines, then N lines to a hub. Senior signal: you name the god-object risk and how to split it, state lifetimes (reference to the mediator, names instead of pointers), and distinguish Mediator from Observer (rules and two-way versus broadcast) and from Facade (one-way simplification). Typical uses: chat rooms, elevator controllers, auction houses and UI form logic.`,
    overApplication: `Two objects that interact in one simple way do not need a go-between. A mediator that every class in the system funnels through becomes the new tangle, with all the rules in one file and a reason for every change to touch it. If the colleagues are already coupled through a clean interface, adding a mediator just adds a hop.`,
  },
];
