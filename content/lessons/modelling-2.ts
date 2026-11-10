import type { Lesson } from "@/lib/lessons/model";

/**
 * Modelling and UML lessons, part 2 (CURRICULUM L6): sequence diagrams, and identifying extension points from
 * requirements. Original wording. Every `before`/`after` program is compiled and run natively by content:verify, and
 * every `after` must pass Senior Review with no blocker or major.
 */
export const MODELLING_LESSONS_2: Lesson[] = [
  {
    id: "sequence-diagram-checkout",
    level: "L6",
    title: "Sequence diagrams: who calls whom, and what happens when a step fails",
    oneLiner: "A class diagram shows structure; a sequence diagram shows one scenario in time, and its failure branch is where the missing responsibility shows up.",
    cardTopic: "L6.sequence",
    intro: `A **sequence diagram** lays the participants across the top (one lifeline each) and the messages down the page in the order they happen. Solid arrows are calls, dashed arrows are returns, and a box labelled \`alt\` splits the page into the branches of a decision.

Draw one for the main scenario **and one for the failure path**. The happy path of "place an order" is reserve stock, then charge the card. The failure path asks the question the requirements never did: if the charge is declined, who gives the stock back? On a sequence diagram that is a visible gap, a lifeline with no arrow going to it. In code the fix is a named orchestrator (a use-case or service class) that owns the whole scenario, including its compensating step.`,
    smell: `- A scenario spread across callers: each caller repeats "reserve, then charge" in its own way.
- A step that succeeded is never undone when a later step fails (stock stays reserved, a hold stays on the card).
- You cannot point at the one class that knows the order of the steps.`,
    before: `#include <iostream>

class Inventory {
public:
    bool reserve() {
        if (units_ == 0) return false;
        --units_;
        return true;
    }
    int units() const { return units_; }

private:
    int units_ = 1;
};

class Payment {
public:
    bool charge(int amount) {
        if (amount > funds_) return false;
        funds_ -= amount;
        return true;
    }

private:
    int funds_ = 50;
};

// The scenario lives in a free function; nothing undoes the reservation when the charge fails.
void order(Inventory& inventory, Payment& payment, int amount) {
    if (!inventory.reserve()) {
        std::cout << "sold out\\n";
        return;
    }
    if (!payment.charge(amount)) {
        std::cout << "payment declined\\n";
        return;
    }
    std::cout << "order placed\\n";
}

int main() {
    Inventory inventory;
    Payment payment;
    order(inventory, payment, 80);
    order(inventory, payment, 30);
    std::cout << "units " << inventory.units() << "\\n";
}
`,
    after: `#include <iostream>

class Inventory {
public:
    bool reserve() {
        if (units_ == 0) return false;
        --units_;
        return true;
    }
    void release() { ++units_; }
    int units() const { return units_; }

private:
    int units_ = 1;
};

class Payment {
public:
    bool charge(int amount) {
        if (amount > funds_) return false;
        funds_ -= amount;
        return true;
    }

private:
    int funds_ = 50;
};

// The orchestrator owns the scenario and its compensating step, exactly as the sequence diagram's alt box shows.
class Checkout {
public:
    Checkout(Inventory& inventory, Payment& payment) : inventory_(inventory), payment_(payment) {}

    bool place(int amount) {
        if (!inventory_.reserve()) {
            std::cout << "sold out\\n";
            return false;
        }
        if (!payment_.charge(amount)) {
            inventory_.release();  // compensate: give the stock back
            std::cout << "payment declined\\n";
            return false;
        }
        std::cout << "order placed\\n";
        return true;
    }

private:
    Inventory& inventory_;
    Payment& payment_;
};

int main() {
    Inventory inventory;
    Payment payment;
    Checkout checkout(inventory, payment);
    checkout.place(80);
    checkout.place(30);
    std::cout << "units " << inventory.units() << "\\n";
}
`,
    beforeOutput: "payment declined\nsold out\nunits 0",
    afterOutput: "payment declined\norder placed\nunits 0",
    refactorNotes: `Same two orders, different outcome. Before: the declined first order leaves the only unit reserved, so the second, perfectly payable order reports "sold out". After: \`Checkout::place\` is the single owner of the scenario, and the failure branch calls \`release()\`. The class holds its collaborators by reference (aggregation in class-diagram terms), so the diagram and the ownership agree. Trade-off: compensation is best-effort here. If the process dies between \`reserve\` and \`release\`, the stock is still lost; across services that gap needs a reservation with an expiry or a saga with retries, which is a system-design answer, not a class-design one.`,
    interviewSignal: `Draw the happy path in four arrows, then say "now the failure path: if the charge is declined, who undoes the reservation?" That one question is the Senior signal. Level signal: SDE II gets the main flow right; Senior adds the alt branches and the compensating step; Staff names the partial-failure window and the idempotency or timeout that closes it.`,
    overApplication: `A sequence diagram for every method is noise; draw one per interesting scenario (usually the main flow and the worst failure). And an orchestrator class for a two-step flow with no failure handling is an extra layer that only forwards calls.`,
  },
  {
    id: "extension-points-from-requirements",
    level: "L6",
    title: "Extension points: ask what will change, then put one seam there",
    oneLiner: "Read the requirements for words like 'later', 'each month' and 'per customer', and give only those places an interface; keep everything stable concrete.",
    cardTopic: "L6.extension",
    intro: `Interviewers end many rounds with a **change request**: "now add a new kind of discount". The design that survives it has an abstraction exactly where the requirements hinted at variation, and nowhere else.

Run a short extension-point pass after the entities: for each rule or entity, ask **"what is the evidence that this changes, and how often?"** Evidence is in the wording: "promotions change every month" (extension point), "rounding is to whole cents" (stable). Then pay for a seam only at the first kind: an interface, with the stable parts left as plain classes and functions. The skill is choosing **few** seams and naming why each one exists.`,
    smell: `- Tier or type names compared as strings inside a calculation (\`if (tier == "gold")\`).
- Adding a new variant means editing the class that also holds unrelated stable logic.
- The opposite smell: an interface for every noun "in case", with one implementation each.`,
    before: `#include <iostream>
#include <string>
#include <utility>

// Requirement: "promotions change every month". The discount rules are welded into the cart.
class Cart {
public:
    Cart(std::string tier, int cents) : tier_(std::move(tier)), cents_(cents) {}

    int total() const {
        int total = cents_;
        if (tier_ == "gold") {
            total -= total / 10;
        } else if (tier_ == "silver") {
            total -= total / 20;
        }
        return total;
    }

private:
    std::string tier_;
    int cents_;
};

int main() {
    std::cout << "gold " << Cart("gold", 1000).total() << "\\n";
    std::cout << "silver " << Cart("silver", 1000).total() << "\\n";
    std::cout << "basic " << Cart("basic", 1000).total() << "\\n";
}
`,
    after: `#include <iostream>
#include <memory>
#include <utility>

// The one seam: the requirement said discounts change, so only discounts are an interface.
class DiscountRule {
public:
    virtual ~DiscountRule() = default;
    virtual int apply(int cents) const = 0;
};

class NoDiscount : public DiscountRule {
public:
    int apply(int cents) const override { return cents; }
};

class PercentOff : public DiscountRule {
public:
    explicit PercentOff(int percent) : percent_(percent) {}
    int apply(int cents) const override { return cents - cents * percent_ / 100; }

private:
    int percent_;
};

class FlatOff : public DiscountRule {
public:
    explicit FlatOff(int cents) : cents_(cents) {}
    int apply(int cents) const override { return cents > cents_ ? cents - cents_ : 0; }

private:
    int cents_;
};

// Cart stays concrete: its arithmetic is stable, so it only depends on the seam.
class Cart {
public:
    Cart(int cents, std::unique_ptr<DiscountRule> rule) : cents_(cents), rule_(std::move(rule)) {}
    int total() const { return rule_->apply(cents_); }

private:
    int cents_;
    std::unique_ptr<DiscountRule> rule_;
};

int main() {
    std::cout << "gold " << Cart(1000, std::make_unique<PercentOff>(10)).total() << "\\n";
    std::cout << "silver " << Cart(1000, std::make_unique<PercentOff>(5)).total() << "\\n";
    std::cout << "basic " << Cart(1000, std::make_unique<NoDiscount>()).total() << "\\n";
    // A new promotion is a new class; Cart is not edited.
    std::cout << "flat " << Cart(1000, std::make_unique<FlatOff>(200)).total() << "\\n";
}
`,
    beforeOutput: "gold 900\nsilver 950\nbasic 1000",
    afterOutput: "gold 900\nsilver 950\nbasic 1000\nflat 800",
    refactorNotes: `The three existing lines are unchanged, so the refactor is behaviour-preserving, and the fourth line is a promotion the old \`Cart\` could only gain by editing its \`total()\`. Only the discount became an interface; \`Cart\` itself, money as integer cents and the arithmetic stayed concrete because nothing in the requirements said they vary. The cart owns its rule through \`unique_ptr\` (composition), which is also what the class diagram should show. Trade-off: a string tier like "gold" now has to be mapped to a rule somewhere (a small factory or a lookup table at the edge), which is the right place for that string.`,
    interviewSignal: `Say the evidence aloud: "you said promotions change monthly, so discounts are my extension point; tax rounding is fixed, so I keep it concrete." Level signal: SDE II adds a seam when asked for the change; Senior predicts the seam from the wording before being asked; Staff also names what is deliberately closed and what the cost of the seam is (an indirection, a mapping at the edge).`,
    overApplication: `Putting an interface behind every noun "for flexibility" gives you a dozen one-implementation hierarchies, more files and indirection to read, and still not the right seam when the real change arrives. A seam is a bet on a specific axis of change; spread bets thinly and you pay for all of them.`,
  },
];
