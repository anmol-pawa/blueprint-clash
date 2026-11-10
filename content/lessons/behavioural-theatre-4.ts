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
    title: "Specification: business rules as small, combinable objects",
    oneLiner: "Give each rule a name and an `isSatisfiedBy` check, then combine rules with and / or / not instead of copying conditions.",
    cardTopic: "L5.specification",
    intro: `A Specification is **one business rule wrapped in an object** with a single question: \`isSatisfiedBy(candidate)\`. Small specifications ("is an adult", "has at least three orders") are combined with \`AllOf\`, \`AnyOf\` and \`Not\` into bigger ones ("eligible for the offer"). The rule then has **one name and one definition**, and every place that needs it (filtering a list, validating input, a database query builder) asks the same object.

It is a cousin of Strategy (swap a decision) and Composite (a tree of the same interface). The payoff is that rules become data you can build at run time, test one at a time and reuse. The cost is a handful of tiny classes where one \`if\` might have done.

In modern C++ a specification can also be a \`std::function<bool(const T&)>\` or a lambda. Prefer that when rules are few and local. Reach for classes when rules need names, parameters, descriptions for error messages, or translation to another form (such as SQL).`,
    smell: `- The same condition is copied into several functions, and the copies have drifted (one says \`>=\`, one says \`>\`).
- A growing \`if (a && b && !c || d)\` that nobody dares touch.
- Product asks for "a new kind of customer" and you edit five places.
- You cannot test one rule without building a whole order, user or request.`,
    before: `#include <iostream>
#include <string>

struct Customer {
    std::string name;
    int age;
    int orders;
};

// The "same" rule, written twice. One copy has quietly drifted.
bool canGetOffer(const Customer& c) { return c.age >= 18 && c.orders >= 3; }
bool canGetCoupon(const Customer& c) { return c.age > 18 && c.orders >= 3; }

int main() {
    Customer ana{"Ana", 18, 3};
    std::cout << "offer " << canGetOffer(ana) << " coupon " << canGetCoupon(ana) << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>

struct Customer {
    std::string name;
    int age;
    int orders;
};

class Specification {
public:
    virtual ~Specification() = default;
    virtual bool isSatisfiedBy(const Customer& customer) const = 0;
};

using SpecPtr = std::unique_ptr<Specification>;

class MinAge final : public Specification {
public:
    explicit MinAge(int years) : years_(years) {}
    bool isSatisfiedBy(const Customer& customer) const override { return customer.age >= years_; }

private:
    int years_;
};

class MinOrders final : public Specification {
public:
    explicit MinOrders(int orders) : orders_(orders) {}
    bool isSatisfiedBy(const Customer& customer) const override { return customer.orders >= orders_; }

private:
    int orders_;
};

class AllOf final : public Specification {
public:
    AllOf(SpecPtr left, SpecPtr right) : left_(std::move(left)), right_(std::move(right)) {}
    bool isSatisfiedBy(const Customer& customer) const override {
        return left_->isSatisfiedBy(customer) && right_->isSatisfiedBy(customer);
    }

private:
    SpecPtr left_;
    SpecPtr right_;
};

class Not final : public Specification {
public:
    explicit Not(SpecPtr inner) : inner_(std::move(inner)) {}
    bool isSatisfiedBy(const Customer& customer) const override { return !inner_->isSatisfiedBy(customer); }

private:
    SpecPtr inner_;
};

int main() {
    // One definition of "eligible", reused by the offer and the coupon.
    const AllOf eligible(std::make_unique<MinAge>(18), std::make_unique<MinOrders>(3));
    // Rules compose: a minor who is a loyal customer.
    const AllOf loyalMinor(std::make_unique<Not>(std::make_unique<MinAge>(18)), std::make_unique<MinOrders>(5));

    const Customer customers[] = {{"Ana", 18, 3}, {"Ben", 17, 9}, {"Cy", 30, 1}};
    for (const Customer& customer : customers) {
        std::cout << customer.name << " eligible " << eligible.isSatisfiedBy(customer) << " loyalMinor "
                  << loyalMinor.isSatisfiedBy(customer) << "\\n";
    }
}
`,
    beforeOutput: "offer 1 coupon 0",
    afterOutput: "Ana eligible 1 loyalMinor 0\nBen eligible 0 loyalMinor 1\nCy eligible 0 loyalMinor 0",
    refactorNotes: `The two copies of the eligibility rule are now one object, so the offer and the coupon can no longer disagree about whether an 18-year-old with three orders qualifies. Each leaf rule (\`MinAge\`, \`MinOrders\`) is tested alone; \`AllOf\` and \`Not\` are written once and work on any specification. A new rule is a new class plus a line where it is composed, and no existing rule is edited, which is Open/Closed at the level of business logic.

**Trade-offs:** four small classes replaced two one-line functions, which is only worth it when rules are reused, combined or built at run time (for example from configuration). With two rules and one call site, the functions were fine; fix the drift and stop. If the rule must also become a database filter, a plain \`bool\` method cannot be translated, so the specification needs a second visitor-like method or an expression tree, and then you are building a query language. Keep the interface minimal and add a \`describe()\` only if you need to explain a rejection to users.`,
    interviewSignal: `Say it when a problem has "eligibility", "validation", "filtering" or "pricing rules" that are combined in different ways: coupons, discounts, search filters, access rules, parking-lot fee rules. Name the pattern, show \`isSatisfiedBy\` plus \`AllOf\`/\`AnyOf\`/\`Not\`, and point at the Change Storm win ("a new rule is a new class"). Senior signal: you mention \`std::function\` as the lighter option, the drift bug it prevents, and that rules should be pure (no hidden state) so they can be reused and cached.`,
    overApplication: `A specification class for a single condition used once is ceremony. Deep trees of \`AllOf(AllOf(AllOf(...)))\` are harder to read than the original expression; give composed rules names. Rules that depend on mutable global state or do I/O (calling a service inside \`isSatisfiedBy\`) turn a cheap check into a hidden dependency, so pass the data in instead.`,
  },
  {
    id: "event-driven",
    level: "L5",
    title: "Event-driven design: Observer, a queue or an event log",
    oneLiner: "Publish facts instead of calling every consumer, and choose between in-process callbacks, a queue and event sourcing on purpose.",
    cardTopic: "L5.observer",
    intro: `In an event-driven design, a component **announces what happened** (\`OrderPlaced\`) and does not know who cares. Consumers subscribe. Adding a consumer never edits the producer, which is the Open/Closed win. There are three levels, and interviews reward knowing which one you chose:

1. **In-process observer / event bus.** Handlers are called inside \`publish\`, on the same thread. Simple and fast, but the producer waits for every handler, a slow or throwing handler hurts it, and a handler that publishes can re-enter.
2. **A queue (in process, or a broker between services).** \`publish\` only enqueues; consumers run later, maybe on other threads or machines. You gain isolation and back-pressure, and you pay with ordering questions, retries (so consumers must be idempotent), and "eventual" consistency.
3. **Event sourcing.** The log of events **is** the source of truth, and current state is a fold over it. You get history, audit and rebuildable views, and you pay with schema evolution, replay time (snapshots) and a harder mental model.

The question to ask first: must the caller know that the consumer succeeded? If yes, call it directly or use a transaction. If no, publish an event.`,
    smell: `- A service calls five collaborators in sequence and gains a sixth for every feature (email, stock, analytics, loyalty).
- The service's tests need fakes for all of them just to check the main flow.
- A failure in a "nice to have" step (the email) rolls back or blocks the core step.
- Nobody can answer "how did this order get into this state?" because only the latest state is stored.`,
    before: `#include <iostream>

class Inventory {
public:
    void reserve() { --stock_; }
    int stock() const { return stock_; }

private:
    int stock_ = 10;
};

class Mailer {
public:
    void send(int orderId) const { std::cout << "email for order " << orderId << "\\n"; }
};

class Analytics {
public:
    void record(int amount) { revenue_ += amount; }
    long long revenue() const { return revenue_; }

private:
    long long revenue_ = 0;
};

// The service knows every consumer. A new one means editing place().
class OrderService {
public:
    OrderService(Inventory& inventory, Mailer& mailer, Analytics& analytics)
        : inventory_(inventory), mailer_(mailer), analytics_(analytics) {}
    void place(int orderId, int amount) {
        inventory_.reserve();
        mailer_.send(orderId);
        analytics_.record(amount);
    }

private:
    Inventory& inventory_;
    Mailer& mailer_;
    Analytics& analytics_;
};

int main() {
    Inventory inventory;
    Mailer mailer;
    Analytics analytics;
    OrderService service(inventory, mailer, analytics);
    service.place(1, 40);
    service.place(2, 15);
    std::cout << "stock " << inventory.stock() << " revenue " << analytics.revenue() << "\\n";
}
`,
    after: `#include <deque>
#include <functional>
#include <iostream>
#include <utility>
#include <vector>

struct OrderPlaced {
    int orderId;
    int amount;
};

// A small synchronous bus. publish() records the event, then delivers it; an event published
// by a handler is queued and delivered after the current one, so handlers never re-enter.
class EventBus {
public:
    using Handler = std::function<void(const OrderPlaced&)>;

    void subscribe(Handler handler) { handlers_.push_back(std::move(handler)); }

    void publish(const OrderPlaced& event) {
        log_.push_back(event);
        pending_.push_back(event);
        if (delivering_) return;
        delivering_ = true;
        while (!pending_.empty()) {
            const OrderPlaced next = pending_.front();
            pending_.pop_front();
            for (const Handler& handler : handlers_) handler(next);
        }
        delivering_ = false;
    }

    const std::vector<OrderPlaced>& log() const { return log_; }

private:
    std::vector<Handler> handlers_;
    std::deque<OrderPlaced> pending_;
    std::vector<OrderPlaced> log_;
    bool delivering_ = false;
};

class OrderService {
public:
    explicit OrderService(EventBus& bus) : bus_(bus) {}
    void place(int orderId, int amount) { bus_.publish(OrderPlaced{orderId, amount}); }

private:
    EventBus& bus_;
};

int main() {
    EventBus bus;
    int stock = 10;
    long long revenue = 0;
    // Three independent consumers. Adding a fourth does not touch OrderService.
    bus.subscribe([&stock](const OrderPlaced&) { --stock; });
    bus.subscribe([](const OrderPlaced& event) { std::cout << "email for order " << event.orderId << "\\n"; });
    bus.subscribe([&revenue](const OrderPlaced& event) { revenue += event.amount; });

    OrderService service(bus);
    service.place(1, 40);
    service.place(2, 15);
    std::cout << "stock " << stock << " revenue " << revenue << "\\n";

    // The log is a record of facts: any view can be rebuilt by replaying it.
    long long replayed = 0;
    for (const OrderPlaced& event : bus.log()) replayed += event.amount;
    std::cout << "replayed revenue " << replayed << "\\n";
}
`,
    beforeOutput: "email for order 1\nemail for order 2\nstock 8 revenue 55",
    afterOutput: "email for order 1\nemail for order 2\nstock 8 revenue 55\nreplayed revenue 55",
    refactorNotes: `\`OrderService\` now depends on one \`EventBus\` and publishes a fact; it no longer knows about inventory, email or analytics, so adding a loyalty-points consumer is a \`subscribe\` call in the composition root. The bus stores every event and delivers through a small pending queue, which fixes the classic re-entrancy bug (a handler that publishes cannot recurse into the handler list). The final lines show the third level in miniature: revenue rebuilt purely from the log.

**Trade-offs, by level:** this bus is level 1, so handlers still run on the caller's thread, in subscription order, and an exception in one stops the rest. That is fine inside one process and for cheap consumers. When a consumer is slow or can fail independently (sending real email), move to level 2: put events on a queue, run the consumer separately, and make it idempotent (events can be delivered more than once) with a retry and a dead-letter path. Ordering then holds only per key or partition. Level 3, event sourcing, makes the log the source of truth: great for audit and "how did we get here", but you must version event schemas, snapshot to bound replay time, and accept that fixing a bad event means appending a correction, not editing history. Choose the simplest level that satisfies the failure and consistency requirement.`,
    interviewSignal: `Use it when a core action fans out to optional side effects (notifications, analytics, search indexing, loyalty). Name the three levels and say which you choose and why: "synchronous observer inside the process; if email becomes slow, move it behind a queue". Mention idempotent consumers, delivery guarantees (at-least-once is the realistic default), ordering per key, and what happens when a handler fails. Senior and Staff signal: you separate the **command** ("place order", which must succeed or fail as a whole) from the **event** ("order placed", which others react to), and you can say what you would put in an outbox so the database write and the event publish do not drift apart.`,
    overApplication: `Events make flow harder to follow: "who reacts to this?" needs a search, and long chains of events become a distributed spaghetti that is hard to debug. Do not publish an event for something the caller needs the result of, do not use events to hide a required step (taking payment is not optional), and do not adopt event sourcing for a CRUD screen. If there is one consumer and it is always there, a direct call is clearer.`,
  },
];
