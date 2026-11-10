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
    title: "Specification: business rules you can combine",
    oneLiner: "Turn each rule into a small object with one yes/no question, then combine rules with and, or and not.",
    cardTopic: "L5.specification",
    intro: `A Specification is **a business rule packaged as an object**. It has one method, \`isSatisfiedBy(candidate)\`, that answers yes or no. Small specifications ("in stock", "price at most 10") are combined by composite specifications (\`AndSpec\`, \`OrSpec\`, \`NotSpec\`) that are themselves specifications, so a rule built from five parts is used exactly like a rule built from one.

The same rule object can **select** (filter a list), **validate** (is this order allowed?) and **describe** (print what was asked). That reuse is the point: the rule is written once and named, instead of being retyped as an \`if\` in three places.

It is Composite plus Strategy used for decisions. It pays off when users or products combine rules in many ways (search filters, eligibility, discount rules, fraud checks) and the combinations are not known when you write the code.`,
    smell: `- A filter function that takes a growing list of flags and optional limits.
- The same condition (is this customer eligible?) is retyped in the UI, the service and the report, and the copies drift apart.
- A new combination ("cheap or out of stock") cannot be expressed without editing the function.
- Boolean parameters whose meaning is decided by another boolean.`,
    before: `#include <iostream>
#include <string>
#include <vector>

struct Product {
    std::string name;
    int price;
    bool inStock;
};

// Every new rule adds a flag. "cheap OR out of stock" cannot be asked at all.
std::vector<Product> filter(const std::vector<Product>& items, bool onlyInStock, bool useMaxPrice, int maxPrice) {
    std::vector<Product> out;
    for (const auto& p : items) {
        if (onlyInStock && !p.inStock) continue;
        if (useMaxPrice && p.price > maxPrice) continue;
        out.push_back(p);
    }
    return out;
}

int main() {
    std::vector<Product> items = {{"pen", 2, true}, {"desk", 150, true}, {"lamp", 30, false}, {"mug", 8, true}};
    for (const auto& p : filter(items, true, true, 10)) std::cout << p.name << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

struct Product {
    std::string name;
    int price;
    bool inStock;
};

class Specification {
public:
    virtual ~Specification() = default;
    virtual bool isSatisfiedBy(const Product& product) const = 0;
};

using SpecPtr = std::unique_ptr<Specification>;

class InStock final : public Specification {
public:
    bool isSatisfiedBy(const Product& product) const override { return product.inStock; }
};

class PriceAtMost final : public Specification {
public:
    explicit PriceAtMost(int limit) : limit_(limit) {}
    bool isSatisfiedBy(const Product& product) const override { return product.price <= limit_; }

private:
    int limit_;
};

class AndSpec final : public Specification {
public:
    AndSpec(SpecPtr left, SpecPtr right) : left_(std::move(left)), right_(std::move(right)) {}
    bool isSatisfiedBy(const Product& product) const override {
        return left_->isSatisfiedBy(product) && right_->isSatisfiedBy(product);
    }

private:
    SpecPtr left_;
    SpecPtr right_;
};

class OrSpec final : public Specification {
public:
    OrSpec(SpecPtr left, SpecPtr right) : left_(std::move(left)), right_(std::move(right)) {}
    bool isSatisfiedBy(const Product& product) const override {
        return left_->isSatisfiedBy(product) || right_->isSatisfiedBy(product);
    }

private:
    SpecPtr left_;
    SpecPtr right_;
};

class NotSpec final : public Specification {
public:
    explicit NotSpec(SpecPtr inner) : inner_(std::move(inner)) {}
    bool isSatisfiedBy(const Product& product) const override { return !inner_->isSatisfiedBy(product); }

private:
    SpecPtr inner_;
};

std::string namesMatching(const std::vector<Product>& items, const Specification& spec) {
    std::string out;
    for (const auto& item : items) {
        if (!spec.isSatisfiedBy(item)) continue;
        if (!out.empty()) out += " ";
        out += item.name;
    }
    return out;
}

int main() {
    const std::vector<Product> items = {{"pen", 2, true}, {"desk", 150, true}, {"lamp", 30, false}, {"mug", 8, true}};

    AndSpec inStockAndCheap(std::make_unique<InStock>(), std::make_unique<PriceAtMost>(10));
    OrSpec cheapOrOut(std::make_unique<PriceAtMost>(10), std::make_unique<NotSpec>(std::make_unique<InStock>()));

    std::cout << "in stock and cheap: " << namesMatching(items, inStockAndCheap) << "\\n";
    std::cout << "cheap or out of stock: " << namesMatching(items, cheapOrOut) << "\\n";
}
`,
    beforeOutput: "pen\nmug",
    afterOutput: "in stock and cheap: pen mug\ncheap or out of stock: pen lamp mug",
    refactorNotes: `The flag-driven \`filter\` is gone. Each rule is a tiny class, \`AndSpec\`, \`OrSpec\` and \`NotSpec\` combine any two rules, and \`namesMatching\` takes a \`const Specification&\`, so it works for every rule that will ever exist. "Cheap or out of stock" was impossible before and is one line now. Composites own their children through \`unique_ptr\`, so a rule tree has a single owner and cleans itself up.

**Trade-offs:** each rule costs a class and a virtual call; for a rule used in one place, a lambda (\`std::function<bool(const Product&)>\`) is shorter and just as testable. Specification earns its keep when rules are named, reused, combined at run time or shown to users. If the data lives in a database, evaluating specifications in memory means fetching everything first; the usual fix is to let a specification also produce a query fragment, or to translate the tree into SQL, which is more machinery. And a deep tree of tiny rules can be harder to read than one clear \`if\`, so name the important combinations.`,
    interviewSignal: `Reach for it when the prompt says "users can combine filters", "eligibility rules", "pricing or discount rules" or "validation rules that change". Draw the three pieces (leaf rules, And/Or/Not composites, a consumer that takes the interface), and say the sentence "the rule is data, so the consumer never changes". Senior signal: you say when a lambda is enough, keep the composites owning their children, and raise the database problem (push the predicate down instead of loading everything). In a machine-coding round this is the clean answer to a search-by-many-criteria or rules-engine requirement and a good Change Storm absorber ("add a new criterion").`,
    overApplication: `A specification class for every trivial condition buries a one-line \`if\` under four files. Composite rules that nobody ever combines are just indirection. A specification that mutates state, reads the clock or calls the network stops being a pure yes/no question and becomes hard to test and reuse. Use plain functions or lambdas until you actually need named, combinable rules.`,
  },
  {
    id: "event-driven",
    level: "L5",
    title: "Event-driven design: Observer, queue or event log",
    oneLiner: "Publish facts about what happened and let other parts react, choosing between direct callbacks, a queue and a stored log by what you need to guarantee.",
    cardTopic: "L5.observer",
    intro: `In an event-driven design, a component **announces a fact** ("order placed") and does not know who cares. Other components subscribe and react. The same idea comes in three strengths, and choosing between them is the real design question:

- **Observer (synchronous callbacks):** the publisher calls each listener inside the publish call. Simple, in order, easy to debug; but the publisher waits for the slowest listener, a listener's exception can break the publisher, and a listener may re-enter the publisher.
- **Event queue / bus:** publishing only enqueues. A dispatcher delivers later, in order, on its own schedule. The publisher is decoupled in time and a slow listener no longer blocks it. The cost is that "when" becomes non-obvious: results appear after the call returns, and failures need a policy (retry, drop, dead-letter).
- **Event log (event sourcing):** events are stored permanently and state is the result of replaying them. You gain audit, time travel and the ability to build new views later; you pay in storage, schema evolution (old events must still be readable) and complexity.

The deciding factors are **how coupled in time the parts can be, whether events may be lost, and whether you need history**.`,
    smell: `- The service that finishes the main job also calls email, inventory, analytics and the audit log directly.
- Adding one more reaction means editing the core service and its tests.
- A failure in the last notification step makes the whole operation look failed.
- Nobody can answer "what happened to order 12, and in what order?"`,
    before: `#include <iostream>

class EmailSender {
public:
    void sendReceipt(int orderId) { std::cout << "email receipt " << orderId << "\\n"; }
};

class Inventory {
public:
    void reserve(int orderId, int quantity) { std::cout << "reserved " << quantity << " for order " << orderId << "\\n"; }
};

// OrderService knows every reaction. Adding analytics means editing this class again.
class OrderService {
public:
    OrderService(Inventory& inventory, EmailSender& email) : inventory_(inventory), email_(email) {}
    void place(int orderId, int quantity) {
        inventory_.reserve(orderId, quantity);
        email_.sendReceipt(orderId);
        std::cout << "order " << orderId << " placed\\n";
    }

private:
    Inventory& inventory_;
    EmailSender& email_;
};

int main() {
    Inventory inventory;
    EmailSender email;
    OrderService orders(inventory, email);
    orders.place(1, 2);
}
`,
    after: `#include <deque>
#include <functional>
#include <iostream>
#include <map>
#include <string>
#include <utility>
#include <vector>

struct Event {
    std::string type;
    int orderId;
    int quantity;
};

// Publishing only queues. drain() delivers in order, and every delivered event is kept in the history.
class EventBus {
public:
    using Handler = std::function<void(const Event&)>;

    void subscribe(const std::string& type, Handler handler) { handlers_[type].push_back(std::move(handler)); }
    void publish(Event event) { pending_.push_back(std::move(event)); }

    void drain() {
        while (!pending_.empty()) {
            Event event = std::move(pending_.front());
            pending_.pop_front();
            history_.push_back(event);
            const auto found = handlers_.find(event.type);
            if (found == handlers_.end()) continue;
            for (const auto& handler : found->second) handler(event);
        }
    }

    const std::vector<Event>& history() const { return history_; }

private:
    std::map<std::string, std::vector<Handler>> handlers_;
    std::deque<Event> pending_;
    std::vector<Event> history_;
};

// OrderService states a fact and stops. It does not know who reacts.
class OrderService {
public:
    explicit OrderService(EventBus& bus) : bus_(bus) {}
    void place(int orderId, int quantity) {
        std::cout << "order " << orderId << " placed\\n";
        bus_.publish({"OrderPlaced", orderId, quantity});
    }

private:
    EventBus& bus_;
};

int main() {
    EventBus bus;
    bus.subscribe("OrderPlaced", [&bus](const Event& event) {
        std::cout << "reserved " << event.quantity << " for order " << event.orderId << "\\n";
        bus.publish({"StockReserved", event.orderId, event.quantity});
    });
    bus.subscribe("OrderPlaced", [](const Event& event) { std::cout << "email receipt " << event.orderId << "\\n"; });
    bus.subscribe("StockReserved", [](const Event& event) { std::cout << "analytics: " << event.quantity << " units\\n"; });

    OrderService orders(bus);
    orders.place(1, 2);
    orders.place(2, 5);
    std::cout << "queued, nothing delivered yet\\n";
    bus.drain();

    int sold = 0;  // state rebuilt by replaying the recorded events
    for (const auto& event : bus.history()) {
        if (event.type == "OrderPlaced") sold += event.quantity;
    }
    std::cout << "replayed total " << sold << "\\n";
}
`,
    beforeOutput: "reserved 2 for order 1\nemail receipt 1\norder 1 placed",
    afterOutput:
      "order 1 placed\norder 2 placed\nqueued, nothing delivered yet\nreserved 2 for order 1\nemail receipt 1\nreserved 5 for order 2\nemail receipt 2\nanalytics: 2 units\nanalytics: 5 units\nreplayed total 7",
    refactorNotes: `\`OrderService\` now publishes one fact and returns; inventory, email and analytics are subscribers added in \`main\` (the composition root), so a fourth reaction touches no existing class. Because \`publish\` only queues, nothing runs until \`drain()\`, and events a handler publishes (\`StockReserved\`) go to the back of the queue, so delivery is in first-in-first-out order and handlers never re-enter the publisher. The history is the beginning of an event log: the total sold is recomputed from it.

**Trade-offs:** you traded a call you could follow in a debugger for decoupling. Results appear after the publish returns, so tests must drain, and a bug in a handler shows up far from the cause. Delivery is at-most-once here and in memory: if the process dies, queued events are gone. Real systems add a durable queue, retries with idempotent handlers (an event may be delivered twice), ordering keys, and a dead-letter store for poison events. This sketch is single-threaded; across threads you add a lock or a thread-safe queue, and you must not subscribe while draining. Event sourcing goes further, making the log the source of truth, and needs versioned event schemas and snapshots so replay stays fast. If one reaction must succeed or fail together with the main action (charge the card, then reserve stock), keep that in one transaction or a saga with compensation, not in a fire-and-forget event.`,
    interviewSignal: `Say the three options out loud and what decides between them: "callbacks if the listener is cheap and must run now, a queue if the publisher must not wait or fail with the listener, an event log if we need audit or rebuildable views". Then name the guarantees: ordering, at-least-once with idempotent handlers, and what happens to a poison event. In an LLD round, build the small bus with subscribe, publish and a drain, keep the publisher unaware of its listeners, and raise re-entrancy and thread-safety unprompted. In a system design round, this is the bridge to Kafka-style logs, outbox patterns and sagas. Senior and Staff signal: you refuse events for steps that need atomicity, and you say how a consumer recovers after a crash.`,
    overApplication: `Turning every method call into an event makes control flow impossible to read and test: nobody can tell what "place order" really does. Using a bus for two objects that always talk to each other adds latency and failure modes for nothing. Events that carry commands ("please reserve stock") are RPC in disguise and hide who must act. And event sourcing for a plain CRUD screen buys storage, versioning and replay costs you will never use. Start with a direct call, and move to events when a second or third reaction, or the need not to wait, appears.`,
  },
];
