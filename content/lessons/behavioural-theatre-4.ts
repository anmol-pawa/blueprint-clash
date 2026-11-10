import type { Lesson } from "@/lib/lessons/model";

/**
 * Behavioural Theatre lessons, part 4 (CURRICULUM L5): Specification and event-driven design.
 * Original wording. Every `before`/`after` program is compiled and run natively by content:verify, and every `after`
 * must pass Senior Review with no blocker or major.
 */
export const BEHAVIOURAL_THEATRE_LESSONS_4: Lesson[] = [
  {
    id: "specification",
    level: "L5",
    title: "Specification: name a business rule and combine it",
    oneLiner: "Turn a yes/no business rule into an object, so rules can be named, reused and combined with and, or, not.",
    cardTopic: "L5.specification",
    intro: `A Specification is **one business rule as an object** with a single question: \`isSatisfiedBy(candidate)\`. Small specifications ("is an adult", "is verified", "has at least three orders") are combined with \`and\`, \`or\` and \`not\` into bigger ones, and the combined rule has a name the whole code base can share.

The roles: an abstract \`Specification\` with a virtual destructor; leaf specifications that each test one thing; composite specifications (\`AndSpec\`, \`NotSpec\`) that own their children through \`unique_ptr\`. The composite is itself a specification, so rules nest to any depth.

Use it when the same rule is needed in several places (eligibility checks, search filters, validation, queries) and the rules change as the business changes. It is a cousin of Composite and Interpreter, specialised to boolean questions.`,
    smell: `- The same condition is copy-pasted in several places (discount, shipping, marketing mail).
- The copies have drifted: one says \`age >= 18\`, another says \`age > 18\`.
- Changing a business rule means a search through the code base for every spot that mentions it.
- A long boolean expression with no name, so nobody can say what it means.`,
    before: `#include <iostream>

struct Customer {
    int age;
    bool verified;
    int orders;
};

// The same rule, written twice. One copy has drifted: ">" instead of ">=".
bool getsDiscount(const Customer& c) { return c.age >= 18 && c.verified && c.orders >= 3; }
bool getsFreeShipping(const Customer& c) { return c.age > 18 && c.verified && c.orders >= 3; }

int main() {
    Customer loyal{18, true, 3};
    std::cout << "discount " << (getsDiscount(loyal) ? "yes" : "no") << "\\n";
    std::cout << "shipping " << (getsFreeShipping(loyal) ? "yes" : "no") << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <utility>

struct Customer {
    int age;
    bool verified;
    int orders;
};

class Specification {
public:
    virtual ~Specification() = default;
    virtual bool isSatisfiedBy(const Customer& customer) const = 0;
};

using SpecPtr = std::unique_ptr<Specification>;

class AdultSpec final : public Specification {
public:
    bool isSatisfiedBy(const Customer& customer) const override { return customer.age >= 18; }
};

class VerifiedSpec final : public Specification {
public:
    bool isSatisfiedBy(const Customer& customer) const override { return customer.verified; }
};

class MinOrdersSpec final : public Specification {
public:
    explicit MinOrdersSpec(int minimum) : minimum_(minimum) {}
    bool isSatisfiedBy(const Customer& customer) const override { return customer.orders >= minimum_; }

private:
    int minimum_;
};

class AndSpec final : public Specification {
public:
    AndSpec(SpecPtr left, SpecPtr right) : left_(std::move(left)), right_(std::move(right)) {}
    bool isSatisfiedBy(const Customer& customer) const override {
        return left_->isSatisfiedBy(customer) && right_->isSatisfiedBy(customer);
    }

private:
    SpecPtr left_;
    SpecPtr right_;
};

class NotSpec final : public Specification {
public:
    explicit NotSpec(SpecPtr inner) : inner_(std::move(inner)) {}
    bool isSatisfiedBy(const Customer& customer) const override { return !inner_->isSatisfiedBy(customer); }

private:
    SpecPtr inner_;
};

// One named rule, built once and shared by every caller.
SpecPtr makeLoyalAdult() {
    return std::make_unique<AndSpec>(std::make_unique<AdultSpec>(),
                                     std::make_unique<AndSpec>(std::make_unique<VerifiedSpec>(), std::make_unique<MinOrdersSpec>(3)));
}

SpecPtr makeNeedsVerification() {
    return std::make_unique<AndSpec>(std::make_unique<AdultSpec>(), std::make_unique<NotSpec>(std::make_unique<VerifiedSpec>()));
}

int main() {
    const SpecPtr loyalAdult = makeLoyalAdult();
    const SpecPtr needsVerification = makeNeedsVerification();
    const Customer loyal{18, true, 3};
    const Customer newcomer{30, false, 0};
    std::cout << "discount " << (loyalAdult->isSatisfiedBy(loyal) ? "yes" : "no") << "\\n";
    std::cout << "shipping " << (loyalAdult->isSatisfiedBy(loyal) ? "yes" : "no") << "\\n";
    std::cout << "newcomer discount " << (loyalAdult->isSatisfiedBy(newcomer) ? "yes" : "no") << "\\n";
    std::cout << "newcomer nudge " << (needsVerification->isSatisfiedBy(newcomer) ? "yes" : "no") << "\\n";
}
`,
    beforeOutput: "discount yes\nshipping no",
    afterOutput: "discount yes\nshipping yes\nnewcomer discount no\nnewcomer nudge yes",
    refactorNotes: `The rule now exists once, as \`makeLoyalAdult()\`. Discount and shipping both ask the same object, so they cannot drift apart: the \`>\` versus \`>=\` bug is not fixable by being careful, it is removed by having one copy. Leaves test one thing each, so they are trivial to unit test, and \`AndSpec\` / \`NotSpec\` give the combinators. Ownership is explicit: composites own children with \`unique_ptr\`.

**Trade-offs:** for a rule used in one place, a named function (\`isLoyalAdult(c)\`) or a lambda is shorter and clearer; Specification pays off when rules are combined at run time (a search filter built from user input), stored, or shared across modules. The class-per-rule style is verbose in C++; a \`std::function<bool(const T&)>\` with \`and_\`/\`or_\` helpers is the lighter alternative when you never need to inspect or print the rule tree. Specifications can also be translated into a database query (the repository pushes the filter down); a plain predicate cannot, and that is a real reason to pick the object form.`,
    interviewSignal: `Say "a business rule as an object I can combine". In a design round (eligibility, coupons, access rules, search filters) show the three or four leaves, an \`and\`, a \`not\`, and then name the rule once. Senior signal: you weigh it against a plain lambda, say when the object form earns its keep (runtime composition, translation to a query, reuse in validation), and mention testing each leaf alone.`,
    overApplication: `A class hierarchy for a condition used once is ceremony. Dozens of one-line leaf classes can be harder to read than the boolean expression they replaced. If rules never combine and never repeat, a function is the right size. And a specification that reaches into services or the database to decide has stopped being a pure yes/no question.`,
  },
  {
    id: "event-driven",
    level: "L5",
    title: "Event-driven design: publish what happened, let others react",
    oneLiner: "Announce a fact as an event instead of calling every interested party, and choose between direct calls, a queue and a stored log.",
    cardTopic: "L5.observer",
    intro: `In event-driven design a component **publishes a fact** ("order placed") and does not know who cares. Consumers subscribe and react on their own. Adding an email, an analytics counter or an audit trail then means adding a subscriber, not editing the publisher. It is Observer scaled up from one object to a whole module, and the same idea sits behind message brokers in system design.

Three levels are worth telling apart:
- **Synchronous observer:** the publisher calls the listeners in its own call stack. Simple, ordered, but a slow or throwing listener slows or breaks the publisher.
- **Queued event bus:** the publisher enqueues, a dispatcher delivers later. Publisher and consumers are decoupled in time; you now think about ordering, delivery and what happens when a handler fails.
- **Event sourcing:** the events are the stored truth; current state is a fold over the log. You get history, audit and replay, at the price of schema evolution and rebuilding state.

Events name something that **already happened** (\`OrderPlaced\`), unlike a Command, which asks for something to happen (\`PlaceOrder\`). Mixing the two up is the most common design error here.`,
    smell: `- A service constructs and calls every downstream collaborator (inventory, mail, analytics) in one method.
- Adding a consumer means editing and re-testing the producer.
- One failing collaborator (mail is down) stops the ones after it from running.
- The producer cannot be tested without all of its consumers.`,
    before: `#include <iostream>

class Inventory {
public:
    void reserve(int orderId) const { std::cout << "inventory reserve " << orderId << "\\n"; }
};

class Mailer {
public:
    void send(int orderId) const { std::cout << "email order " << orderId << "\\n"; }
};

// The service knows every consumer. A new one (analytics) means editing placeOrder.
class OrderService {
public:
    void placeOrder(int orderId) const {
        std::cout << "order " << orderId << " placed\\n";
        inventory_.reserve(orderId);
        mailer_.send(orderId);
    }

private:
    Inventory inventory_;
    Mailer mailer_;
};

int main() {
    OrderService service;
    service.placeOrder(7);
}
`,
    after: `#include <deque>
#include <exception>
#include <functional>
#include <iostream>
#include <stdexcept>
#include <utility>
#include <vector>

// A fact in the past tense, immutable once published.
struct OrderPlaced {
    int orderId;
};

// A small in-process bus: publish() enqueues, drain() delivers. Handlers cannot break the publisher or each other.
class EventBus {
public:
    using Handler = std::function<void(const OrderPlaced&)>;

    void subscribe(Handler handler) { handlers_.push_back(std::move(handler)); }
    void publish(const OrderPlaced& event) { pending_.push_back(event); }

    void drain() {
        while (!pending_.empty()) {
            const OrderPlaced event = pending_.front();
            pending_.pop_front();
            for (const Handler& handler : handlers_) {
                try {
                    handler(event);
                } catch (const std::exception& error) {
                    std::cout << "handler failed: " << error.what() << "\\n";
                }
            }
        }
    }

private:
    std::vector<Handler> handlers_;
    std::deque<OrderPlaced> pending_;
};

// The service knows only the bus. New consumers never touch it.
class OrderService {
public:
    explicit OrderService(EventBus& bus) : bus_(bus) {}
    void placeOrder(int orderId) {
        std::cout << "order " << orderId << " placed\\n";
        bus_.publish(OrderPlaced{orderId});
    }

private:
    EventBus& bus_;
};

int main() {
    EventBus bus;
    bus.subscribe([](const OrderPlaced& event) { std::cout << "inventory reserve " << event.orderId << "\\n"; });
    bus.subscribe([](const OrderPlaced& event) {
        if (event.orderId == 8) throw std::runtime_error("smtp down");
        std::cout << "email order " << event.orderId << "\\n";
    });
    bus.subscribe([](const OrderPlaced& event) { std::cout << "analytics " << event.orderId << "\\n"; });

    OrderService service(bus);
    service.placeOrder(7);
    service.placeOrder(8);
    std::cout << "--drain--\\n";
    bus.drain();
}
`,
    beforeOutput: "order 7 placed\ninventory reserve 7\nemail order 7",
    afterOutput:
      "order 7 placed\norder 8 placed\n--drain--\ninventory reserve 7\nemail order 7\nanalytics 7\ninventory reserve 8\nhandler failed: smtp down\nanalytics 8",
    refactorNotes: `\`OrderService\` now depends only on the bus and a small event type; inventory, mail and analytics subscribe from outside. Order 8 shows the isolation: the mail handler throws, the failure is reported, and analytics still runs. Publishing returns immediately and delivery happens at \`drain()\`, so the producer is decoupled in time as well as in code.

**Trade-offs:** you trade explicit control flow for indirection. "What happens when an order is placed?" is no longer answered by reading one method, so name events well and keep a list of subscribers. Ordering is only guaranteed per bus here; across threads or processes you need partitioning, idempotent handlers (delivery is at-least-once in real brokers) and a plan for poison events (retry, dead-letter queue). A handler that subscribes while the bus is dispatching would invalidate the loop, so a production bus snapshots the handler list or forbids it. Event sourcing goes further: you store the events and rebuild state by replaying them, which gives audit and time travel but forces you to version old events forever. Prefer plain calls when exactly one consumer exists and its result is needed right away.`,
    interviewSignal: `Say "events are facts in the past tense; commands are requests". When a round adds "also send an email, update search, notify the warehouse", answer with a publisher and subscribers, then immediately raise the hard questions: ordering, duplicates (idempotent handlers), failure of one handler, and whether the delivery must survive a crash (a durable queue or an outbox). Senior and staff signal: you distinguish observer, queue and event sourcing, and pick the lightest one that meets the durability and ordering requirement.`,
    overApplication: `Turning every method call into an event makes the flow impossible to follow and debug. When the caller needs an answer or a transaction across steps, a direct call (or an orchestrating service) is clearer. A bus with one publisher and one subscriber is a function call with extra steps, and an unbounded queue just moves a slow consumer's problem into memory.`,
  },
];
