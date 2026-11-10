import type { Lesson } from "@/lib/lessons/model";

/**
 * Modelling and UML lessons, part 1 (CURRICULUM L6): requirements to entities, class-diagram relationships as C++
 * ownership, and state diagrams. Original wording. Every `before`/`after` program is compiled and run natively by
 * content:verify, and every `after` must pass Senior Review with no blocker or major.
 */
export const MODELLING_LESSONS: Lesson[] = [
  {
    id: "entities-from-requirements",
    level: "L6",
    title: "Requirements to entities: nouns, verbs and CRC cards",
    oneLiner: "Underline the nouns and verbs in the brief, make the nouns classes, and give each verb to the class that already holds the data it needs.",
    cardTopic: "L6.entities",
    intro: `A machine-coding or LLD round starts with a paragraph of requirements, not a class list. The reliable first step is **noun/verb analysis**: underline the nouns (candidate classes or fields) and the verbs (candidate methods), then discard the noise. Nouns that only describe another noun ("name", "title") are fields; nouns with their own rules and lifecycle ("loan", "fine policy") are classes.

Then run **CRC cards** (Class, Responsibility, Collaborators) on each candidate: one sentence for what it is responsible for, and which other classes it must ask for help. A class with a long, vague responsibility is two classes. A class with no responsibility was a field. A verb that needs data from three classes belongs to an orchestrating class, not to one of the three.

The output of this step is the vocabulary of the whole interview: the entities you name now are the ones the interviewer will ask you to extend.`,
    smell: `- One class named after the whole system (\`Library\`, \`Manager\`, \`Service\`) holds every map and every rule.
- Entities exist only as parallel maps keyed by an id (\`dueDay_[bookId]\`, \`holder_[bookId]\`).
- A business rule (the fine) is buried inside a method, with no name and no place to change it.
- You cannot say what a class is responsible for in one sentence without the word "and".`,
    before: `#include <iostream>
#include <map>
#include <string>

// One class does everything the brief mentions: members, books, loans, fines.
class Library {
public:
    void addBook(int id) { copies_[id] = true; }
    void borrow(const std::string& member, int bookId, int day) {
        if (!copies_[bookId]) { std::cout << "book " << bookId << " unavailable\\n"; return; }
        copies_[bookId] = false;
        dueDay_[bookId] = day + 14;
        holder_[bookId] = member;
    }
    int giveBack(int bookId, int day) {
        copies_[bookId] = true;
        int late = day - dueDay_[bookId];
        return late > 0 ? late * 10 : 0;  // fine policy hidden inside
    }

private:
    std::map<int, bool> copies_;
    std::map<int, int> dueDay_;
    std::map<int, std::string> holder_;
};

int main() {
    Library library;
    library.addBook(1);
    library.borrow("asha", 1, 0);
    library.borrow("ben", 1, 2);
    std::cout << "fine " << library.giveBack(1, 20) << "\\n";
}
`,
    after: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

// Nouns from the brief became classes; each verb went to the noun that owns the data it needs (CRC).
class Book {
public:
    explicit Book(int id) : id_(id) {}
    int id() const { return id_; }
    bool available() const { return available_; }
    void lend() { available_ = false; }
    void restore() { available_ = true; }

private:
    int id_;
    bool available_ = true;
};

class Loan {
public:
    Loan(std::string member, int bookId, int dueDay) : member_(std::move(member)), bookId_(bookId), dueDay_(dueDay) {}
    int bookId() const { return bookId_; }
    int daysLate(int today) const { return today > dueDay_ ? today - dueDay_ : 0; }

private:
    std::string member_;
    int bookId_;
    int dueDay_;
};

// The fine rule is a policy of its own, because "what do late returns cost" is the likeliest thing to change.
class FinePolicy {
public:
    explicit FinePolicy(int perDay) : perDay_(perDay) {}
    int fineFor(const Loan& loan, int today) const { return loan.daysLate(today) * perDay_; }

private:
    int perDay_;
};

class Library {
public:
    explicit Library(FinePolicy policy) : policy_(policy) {}
    void addBook(int id) { books_.emplace_back(id); }

    void borrow(const std::string& member, int bookId, int day) {
        Book* book = find(bookId);
        if (book == nullptr || !book->available()) {
            std::cout << "book " << bookId << " unavailable\\n";
            return;
        }
        book->lend();
        loans_.emplace_back(member, bookId, day + 14);
    }

    int giveBack(int bookId, int day) {
        Book* book = find(bookId);
        for (auto it = loans_.begin(); it != loans_.end(); ++it) {
            if (it->bookId() == bookId) {
                const int fine = policy_.fineFor(*it, day);
                loans_.erase(it);
                if (book != nullptr) book->restore();
                return fine;
            }
        }
        return 0;
    }

private:
    Book* find(int id) {
        for (auto& book : books_) {
            if (book.id() == id) return &book;
        }
        return nullptr;
    }

    FinePolicy policy_;
    std::vector<Book> books_;
    std::vector<Loan> loans_;
};

int main() {
    Library library{FinePolicy{10}};
    library.addBook(1);
    library.borrow("asha", 1, 0);
    library.borrow("ben", 1, 2);
    std::cout << "fine " << library.giveBack(1, 20) << "\\n";
}
`,
    beforeOutput: "book 1 unavailable\nfine 60",
    afterOutput: "book 1 unavailable\nfine 60",
    refactorNotes: `The brief's nouns (book, loan, fine policy, library) are now classes, and each verb moved to the noun that owns its data: \`Loan::daysLate\`, \`FinePolicy::fineFor\`, \`Book::lend\`. The parallel maps became one \`Loan\` object per loan. \`Library\` is still the coordinator, but now it only coordinates. The fine rule has a name and one place to change, which is exactly the Change Storm an interviewer is likely to throw ("fines double after 30 days"). Trade-off: more types and more lines for a small problem; do this when the brief has real rules, not for a three-field record.`,
    interviewSignal: `Say the process aloud: "nouns to candidate classes, verbs to methods, then I check each class has one responsibility and list its collaborators." Draw three or four CRC cards on the board before any code. Level signal: SDE II names sensible entities; Senior also names the policy that is likely to change and keeps it separate; Staff states what is deliberately left out of scope and why.`,
    overApplication: `Turning every noun into a class produces dozens of anaemic wrappers (\`MemberName\`, \`BookTitle\`) that hold one field and no behaviour. A noun earns a class only when it has rules, a lifecycle or more than one implementation. In a 45-minute round, five or six well-chosen entities beat fifteen thin ones.`,
  },
  {
    id: "class-diagram-ownership",
    level: "L6",
    title: "Class diagrams: relationships as C++ ownership",
    oneLiner: "Composition means I own it, aggregation means I only point at it, dependency means I use it for one call. In C++ each one is a different member type.",
    cardTopic: "L6.class-diagram",
    intro: `A class diagram is a statement about **lifetime and ownership**, and C++ makes you answer it in the type. The relationship lines map onto code like this:

- **Inheritance** ("is a"): \`class Circle : public Shape\`. Use it for substitutable behaviour, not for reuse.
- **Composition** (filled diamond, "owns, dies with"): a member by value, or a \`unique_ptr\` when it must be polymorphic or optional.
- **Aggregation** (hollow diamond, "uses, does not own"): a non-owning reference or pointer, or a \`weak_ptr\`. The part outlives the whole.
- **Association** (plain line): one object holds a way to reach another; say the multiplicity (1, 0..1, *).
- **Dependency** (dashed arrow): a parameter or local, nothing stored.

Aggregation versus composition is the line interviewers probe, because in C++ it decides who calls \`delete\` and who can dangle.`,
    smell: `- Raw owning pointers in a struct, with no \`delete\` and no hint whether the pointer is owned.
- A diagram with a diamond on every line because "it has a" was the only rule used.
- A non-owning pointer to something that can die first, so the program dangles.
- Multiplicities missing, so nobody knows whether a collection can be empty.`,
    before: `#include <iostream>
#include <string>
#include <vector>

struct Engine { int horsepower; };
struct Wheel { int size; };

// Who owns what? Nothing in the type says.
struct Car {
    Engine* engine;
    std::vector<Wheel*> wheels;
};

int main() {
    Engine* engine = new Engine{120};
    Car car{engine, {new Wheel{16}, new Wheel{16}}};
    std::cout << "car with " << car.wheels.size() << " wheels, " << car.engine->horsepower << " hp\\n";
    // No delete anywhere: every pointer above leaks.
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

struct Engine { int horsepower; };
struct Wheel { int size; };

// Composition: the car owns its engine and wheels; they live and die with it.
class Car {
public:
    Car(int horsepower, int wheelSize) : engine_{horsepower}, wheels_(4, Wheel{wheelSize}) {}
    int horsepower() const { return engine_.horsepower; }
    std::size_t wheelCount() const { return wheels_.size(); }

private:
    Engine engine_;
    std::vector<Wheel> wheels_;
};

class Driver {
public:
    explicit Driver(std::string name) : name_(std::move(name)) {}
    const std::string& name() const { return name_; }

private:
    std::string name_;
};

// Aggregation: the team uses drivers that exist independently of it. It does not own them.
class Team {
public:
    void sign(const Driver& driver) { drivers_.push_back(&driver); }
    std::size_t size() const { return drivers_.size(); }

private:
    std::vector<const Driver*> drivers_;  // non-owning; drivers must outlive the team
};

// Dependency: a parameter used for one call, nothing stored.
void describe(const Car& car, const Driver& driver) {
    std::cout << driver.name() << " drives a car with " << car.wheelCount() << " wheels, " << car.horsepower() << " hp\\n";
}

int main() {
    const Driver asha{"asha"};
    Team team;
    team.sign(asha);
    describe(Car{120, 16}, asha);
    std::cout << "team size " << team.size() << "\\n";
}
`,
    beforeOutput: "car with 2 wheels, 120 hp",
    afterOutput: "asha drives a car with 4 wheels, 120 hp\nteam size 1",
    refactorNotes: `\`Car\` now owns its engine and wheels by value: composition, no heap, nothing to leak. \`Team\` keeps \`const Driver*\` and says in a comment that drivers must outlive it: aggregation, and the lifetime assumption is written down. \`describe\` takes both by const reference: a dependency. The diagram and the code now say the same thing. Trade-off: a non-owning pointer is only safe if the lifetime rule holds; when it cannot be guaranteed, use \`shared_ptr\` / \`weak_ptr\` and accept the cost.`,
    interviewSignal: `Say "composition owns and controls lifetime; aggregation references something that outlives me". When you draw a diamond, say which member type it will be. Level signal: SDE II draws correct relationship types; Senior adds multiplicities and states who owns what; Staff points out the dangling risk of aggregation and what would change it (shared ownership, ids instead of pointers).`,
    overApplication: `Drawing every dependency makes the diagram unreadable; show the associations that shape the design and the key dependencies, not every parameter type. Heap-allocating everything behind \`unique_ptr\` "to be flexible" gives up value semantics for no benefit when the part is concrete and always present.`,
  },
  {
    id: "state-diagram-vending",
    level: "L6",
    title: "State diagrams: events and states, not boolean flags",
    oneLiner: "If an object behaves differently over time, draw its states and events first, then make the code a closed set of states with one place that decides each transition.",
    cardTopic: "L6.state-diagram",
    intro: `Vending machines, elevators, orders and documents all have a **life cycle**: a handful of states and a set of events that move between them. A **state diagram** shows each state as a box and each legal transition as an arrow labelled \`event [guard] / action\`.

Draw it before coding. The exercise exposes the cases requirements forgot: "what if a coin is inserted while dispensing?" is a missing arrow. In code, represent the states as an \`enum class\` (a closed set the compiler checks), the events as another, and keep every transition decision in one place. When states grow behaviour of their own, graduate to the State pattern (lesson in the Behavioural Theatre); for a small machine an enum and a switch is the honest, readable choice.`,
    smell: `- Several booleans (\`hasCoin_\`, \`dispensing_\`) that together encode the state, with impossible combinations the code never forbids.
- Each method re-checks the flags in its own way, so a new rule must be added to every method.
- Nobody can list the legal transitions without reading all of the code.
- Events that should be rejected are silently ignored or crash.`,
    before: `#include <iostream>

// State is spread over flags; nothing stops impossible combinations.
class Vending {
public:
    void insertCoin() {
        if (!hasCoin_ && !dispensing_) hasCoin_ = true;
        else std::cout << "ignored coin\\n";
    }
    void press() {
        if (hasCoin_ && !dispensing_) { dispensing_ = true; hasCoin_ = false; std::cout << "dispensing\\n"; }
        else std::cout << "nothing happens\\n";
    }
    void take() {
        if (dispensing_) { dispensing_ = false; std::cout << "taken\\n"; }
    }

private:
    bool hasCoin_ = false;
    bool dispensing_ = false;
};

int main() {
    Vending v;
    v.press();
    v.insertCoin();
    v.insertCoin();
    v.press();
    v.take();
}
`,
    after: `#include <iostream>

// The state diagram, written down: a closed set of states and events, and one place that decides each transition.
enum class State { Idle, HasCoin, Dispensing };
enum class Event { InsertCoin, Press, Take };

class Vending {
public:
    void handle(Event event) {
        switch (state_) {
            case State::Idle:
                if (event == Event::InsertCoin) state_ = State::HasCoin;
                else std::cout << "nothing happens\\n";
                break;
            case State::HasCoin:
                if (event == Event::Press) { state_ = State::Dispensing; std::cout << "dispensing\\n"; }
                else if (event == Event::InsertCoin) std::cout << "ignored coin\\n";
                else std::cout << "nothing happens\\n";
                break;
            case State::Dispensing:
                if (event == Event::Take) { state_ = State::Idle; std::cout << "taken\\n"; }
                else std::cout << "nothing happens\\n";
                break;
        }
    }

private:
    State state_ = State::Idle;
};

int main() {
    Vending v;
    v.handle(Event::Press);
    v.handle(Event::InsertCoin);
    v.handle(Event::InsertCoin);
    v.handle(Event::Press);
    v.handle(Event::Take);
}
`,
    beforeOutput: "nothing happens\nignored coin\ndispensing\ntaken",
    afterOutput: "nothing happens\nignored coin\ndispensing\ntaken",
    refactorNotes: `The two flags became one \`State\` enum, so \`hasCoin\` and \`dispensing\` can no longer both be true. Every event goes through \`handle\`, which switches on the state, so the full transition list is readable in one screen and matches the diagram arrow for arrow. The observable behaviour is identical (the output did not change); the structure is what improved. Trade-off: a switch per state still has to be edited for each new state or event; once states carry behaviour of their own, the State pattern removes that.`,
    interviewSignal: `Say "let me draw the states and events first". Name the states, list the events, and say what happens for each (state, event) pair, including the rejected ones. Level signal: SDE II gets the happy path; Senior covers the invalid transitions and the guard conditions; Staff discusses persistence of the state and concurrent events.`,
    overApplication: `A full State-pattern class hierarchy for a machine with three states and no state-specific data is ceremony. And a state diagram for something that has no real life cycle (a plain data record) adds nothing; draw one when behaviour depends on history.`,
  },
  {
    id: "sequence-diagrams",
    level: "L6",
    title: "Sequence diagrams: one scenario, call by call",
    oneLiner: "A sequence diagram is one scenario drawn as calls in time order; draw the failure branch too, because that is where the missing code hides.",
    cardTopic: "L6.sequence",
    intro: `A **class diagram** shows what exists; a **sequence diagram** shows what happens in one scenario. Participants sit along the top as boxes with lifelines hanging down. Each solid arrow is a method call, each dashed arrow a return, and time runs downward. Fragments add control flow: \`alt\` is an if/else, \`opt\` is an if, \`loop\` is a loop.

The habit that matters in an interview is to draw the **happy path first, then each failure as an alt**. Every arrow you draw must already exist as a method on the receiver, so the diagram doubles as a check of your class diagram. And every \`alt\` you forget to draw tends to be an \`if\` you forget to write.`,
    smell: `- The code handles the success case and quietly returns \`false\` on every failure, leaving earlier steps half-done.
- A step that acquires something (a reservation, a lock, a hold) has no matching release on the failure path.
- You can describe the flow only by reading the code top to bottom; there is no scenario you could draw in a minute.
- A "sequence" with one participant calling its own private helpers: nothing to draw, so nothing was designed.`,
    before: `#include <iostream>
#include <map>
#include <string>

class Inventory {
public:
    void stock(const std::string& sku, int count) { counts_[sku] = count; }
    bool reserve(const std::string& sku) {
        auto it = counts_.find(sku);
        if (it == counts_.end() || it->second == 0) return false;
        --it->second;
        return true;
    }
    int left(const std::string& sku) const {
        auto it = counts_.find(sku);
        return it == counts_.end() ? 0 : it->second;
    }

private:
    std::map<std::string, int> counts_;
};

class Gateway {
public:
    explicit Gateway(int limitCents) : limitCents_(limitCents) {}
    bool charge(int cents) const { return cents <= limitCents_; }

private:
    int limitCents_;
};

class Checkout {
public:
    Checkout(Inventory& inventory, const Gateway& gateway) : inventory_(inventory), gateway_(gateway) {}

    // Happy path only: reserve, then charge.
    bool pay(const std::string& sku, int cents) {
        if (!inventory_.reserve(sku)) return false;
        if (!gateway_.charge(cents)) return false;
        return true;
    }

private:
    Inventory& inventory_;
    const Gateway& gateway_;
};

int main() {
    Inventory inventory;
    inventory.stock("mug", 1);
    Gateway gateway(500);
    Checkout checkout(inventory, gateway);
    std::cout << "declined card paid=" << checkout.pay("mug", 900) << " left=" << inventory.left("mug") << "\\n";
    std::cout << "retry with cheaper price paid=" << checkout.pay("mug", 300) << "\\n";
}
`,
    after: `#include <iostream>
#include <map>
#include <string>

class Inventory {
public:
    void stock(const std::string& sku, int count) { counts_[sku] = count; }
    bool reserve(const std::string& sku) {
        auto it = counts_.find(sku);
        if (it == counts_.end() || it->second == 0) return false;
        --it->second;
        return true;
    }
    void release(const std::string& sku) { ++counts_[sku]; }
    int left(const std::string& sku) const {
        auto it = counts_.find(sku);
        return it == counts_.end() ? 0 : it->second;
    }

private:
    std::map<std::string, int> counts_;
};

class Gateway {
public:
    explicit Gateway(int limitCents) : limitCents_(limitCents) {}
    bool charge(int cents) const { return cents <= limitCents_; }

private:
    int limitCents_;
};

class Checkout {
public:
    Checkout(Inventory& inventory, const Gateway& gateway) : inventory_(inventory), gateway_(gateway) {}

    // Follows the diagram: reserve, charge, and on decline release the reservation before returning.
    bool pay(const std::string& sku, int cents) {
        if (!inventory_.reserve(sku)) return false;
        if (!gateway_.charge(cents)) {
            inventory_.release(sku);  // the alt fragment: compensate when the charge is declined
            return false;
        }
        return true;
    }

private:
    Inventory& inventory_;
    const Gateway& gateway_;
};

int main() {
    Inventory inventory;
    inventory.stock("mug", 1);
    Gateway gateway(500);
    Checkout checkout(inventory, gateway);
    std::cout << "declined card paid=" << checkout.pay("mug", 900) << " left=" << inventory.left("mug") << "\\n";
    std::cout << "retry with cheaper price paid=" << checkout.pay("mug", 300) << "\\n";
}
`,
    beforeOutput: "declined card paid=0 left=0\nretry with cheaper price paid=0",
    afterOutput: "declined card paid=0 left=1\nretry with cheaper price paid=1",
    refactorNotes: `Drawing \`Checkout\` as a sequence (Client to Checkout: pay; Checkout to Inventory: reserve; Checkout to Gateway: charge; \`alt\` declined: Checkout to Inventory: release) exposes the gap at once: the first version has no release arrow, so a declined card keeps the mug reserved forever. The fix is the one missing call. The output changes in exactly the two places the diagram predicts: stock is back after a decline, and the retry succeeds. Trade-off: compensation by hand is fine for two steps; with many steps, model the flow as a saga or a scoped guard that releases in its destructor.`,
    interviewSignal: `Say "let me walk one scenario end to end, then the failure cases". Name the participants, draw reserve then charge, and add the declined branch as an alt before the interviewer asks. Level signal: SDE II draws the happy path; Senior adds the failure and compensation branches unprompted; Staff also asks what happens if the process dies between the two calls.`,
    overApplication: `Drawing a sequence diagram for every method is noise: pick the two or three scenarios that cross object boundaries or have a failure branch worth discussing. And a diagram with every internal helper call is a transcript of the code, not a design; keep only calls between participants that matter.`,
  },
  {
    id: "extension-points",
    level: "L6",
    title: "Finding extension points in the requirements",
    oneLiner: "Abstract only what the brief says will vary (\"later\", \"or\", \"different for\"); keep the rest concrete.",
    cardTopic: "L6.extension-points",
    intro: `In a Change Storm the interviewer changes a requirement and watches how much code you touch. You cannot make everything flexible, so you pick **seams**: the few places where behaviour is allowed to vary. The brief tells you where. Listen for trigger phrases:

- "**later** we may add…", "marketing might want…" means a new variant is coming: an interface with the current case as the first implementation.
- "**either** X **or** Y", "depends on the customer" means variants exist today: an interface now.
- "**different rules for** weekends / regions / tiers" means a policy object chosen by data.
- A noun with a fixed definition ("a receipt shows the total") needs no seam.

Say each seam out loud and name what it hides. An interface with one implementation and no hint of a second is a guess, not a seam.`,
    smell: `- The variant is a string or enum that every method switches on, so each new variant edits the old code.
- Or the opposite: interfaces for every noun in the brief, each with a single implementation and a factory.
- You cannot say which sentence of the requirements justifies a given abstraction.
- Adding the "obvious next" requirement means changing three files and a switch.`,
    before: `#include <iostream>
#include <string>

// "Send a receipt by email; marketing may want SMS later." The channel is a string and every send branches on it.
class ReceiptService {
public:
    void send(const std::string& channel, const std::string& to, int totalCents) const {
        const std::string body = "Total: " + std::to_string(totalCents / 100) + "." + (totalCents % 100 < 10 ? "0" : "") + std::to_string(totalCents % 100);
        if (channel == "email") {
            std::cout << "EMAIL to " << to << ": " << body << "\\n";
        } else if (channel == "sms") {
            std::cout << "SMS to " << to << ": " << body << "\\n";
        } else {
            std::cout << "unknown channel " << channel << "\\n";
        }
    }
};

int main() {
    ReceiptService service;
    service.send("email", "asha@example.com", 1250);
    service.send("sms", "555-0101", 1250);
    service.send("push", "device-9", 1250);
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

// Extension point, found from the phrase "may want SMS later": how a receipt is delivered. Everything else is concrete.
class Channel {
public:
    virtual ~Channel() = default;
    virtual void deliver(const std::string& to, const std::string& body) const = 0;
};

class EmailChannel : public Channel {
public:
    void deliver(const std::string& to, const std::string& body) const override {
        std::cout << "EMAIL to " << to << ": " << body << "\\n";
    }
};

class SmsChannel : public Channel {
public:
    void deliver(const std::string& to, const std::string& body) const override {
        std::cout << "SMS to " << to << ": " << body << "\\n";
    }
};

// Not an extension point: the receipt text. Nothing in the brief says it varies, so it stays a plain function.
std::string formatTotal(int totalCents) {
    const int cents = totalCents % 100;
    return "Total: " + std::to_string(totalCents / 100) + "." + (cents < 10 ? "0" : "") + std::to_string(cents);
}

class ReceiptService {
public:
    void addChannel(std::unique_ptr<Channel> channel) { channels_.push_back(std::move(channel)); }

    void send(std::size_t channelIndex, const std::string& to, int totalCents) const {
        if (channelIndex >= channels_.size()) {
            std::cout << "unknown channel " << channelIndex << "\\n";
            return;
        }
        channels_[channelIndex]->deliver(to, formatTotal(totalCents));
    }

private:
    std::vector<std::unique_ptr<Channel>> channels_;
};

int main() {
    ReceiptService service;
    service.addChannel(std::make_unique<EmailChannel>());
    service.addChannel(std::make_unique<SmsChannel>());
    service.send(0, "asha@example.com", 1250);
    service.send(1, "555-0101", 1250);
    service.send(2, "device-9", 1250);
}
`,
    beforeOutput: "EMAIL to asha@example.com: Total: 12.50\nSMS to 555-0101: Total: 12.50\nunknown channel push",
    afterOutput: "EMAIL to asha@example.com: Total: 12.50\nSMS to 555-0101: Total: 12.50\nunknown channel 2",
    refactorNotes: `The phrase "may want SMS later" produced exactly one seam, \`Channel\`, with email and SMS as implementations; \`ReceiptService\` no longer knows what a channel is. The receipt text has no trigger phrase, so \`formatTotal\` stays an ordinary function. The observable output is the same for the two supported channels; only the unknown-channel line differs because the string name became an index. Adding push now means one new class and one \`addChannel\` call. Trade-off: the seam costs an interface and a vector of owners; if SMS never arrives, that was ceremony, which is why the seam follows the brief and not a guess.`,
    interviewSignal: `Say "the brief says X may change later, so I will put a seam there, and I will keep Y concrete because nothing says it varies". Then show the one-line cost of the next requirement. Level signal: SDE II finds the obvious seam; Senior also names what they deliberately left concrete and why; Staff considers who owns the seam's contract across teams.`,
    overApplication: `Seams for every noun give you interface-per-class, a factory for each, and a codebase where nothing can be read without jumping three files. Each unused abstraction is code to maintain and a reader to mislead; wait for the second real variant when the brief gives no hint.`,
  },
];
