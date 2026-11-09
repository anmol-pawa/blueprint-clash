import type { Card } from "@/lib/battle/cards";

/**
 * Smell cards for Harbourmaster Vale's last phase. Each shows a short C++ fragment and asks for the smell, the
 * cost, or the right call. Original wording; the wrong options are the tempting neighbours, and one card tests
 * restraint (a pattern that is not earned) rather than a violation.
 */
export const STRUCTURAL_BRIDGES_MASTER_SMELLS: Card[] = [
  {
    id: "sbm-smell-leaky-adapter",
    kind: "smell",
    topic: "L4.adapter",
    level: 2,
    prompt: "The team adopted an adapter, yet swapping the vendor still touches forty files. Why?",
    code: `class PaymentGateway {
 public:
  virtual ~PaymentGateway() = default;
  virtual VendorReceipt charge(const VendorCard& card, long cents) = 0;
};
class AcmeGateway : public PaymentGateway { /* wraps the Acme SDK */ };`,
    options: [
      "The adapter's own interface exposes vendor types, so the vendor leaks to every caller. Define the interface in your domain's words and translate inside the adapter",
      "Adapters must be singletons so only one vendor is ever loaded",
      "charge() should be static so callers need no object",
      "The interface needs a second virtual function for every vendor method",
    ],
    answer: [0],
    explain:
      "An adapter only protects you if the target interface is yours. Returning VendorReceipt and taking VendorCard means callers already speak the vendor's language, so the translation boundary is in the wrong place. Define Money, Card and Receipt in your domain, convert inside one class, and the next vendor costs one new adapter. The price: a mapping layer to keep correct, and a lowest-common-denominator interface when vendors differ a lot.",
  },
  {
    id: "sbm-smell-class-explosion",
    kind: "smell",
    topic: "L4.bridge",
    level: 2,
    prompt: "Adding a Triangle means three new classes; adding a renderer means touching every shape. Name the smell and the fix.",
    code: `class Shape { virtual void draw() = 0; };
class CircleGl     : public Shape { void draw() override; };
class CircleVector : public Shape { void draw() override; };
class SquareGl     : public Shape { void draw() override; };
class SquareVector : public Shape { void draw() override; };`,
    options: [
      "Two independent axes (shape, renderer) are fused in one hierarchy, so classes multiply. Split them: a Shape holds a Renderer it is given, and each axis varies alone",
      "Too few virtual functions; add one per renderer to Shape",
      "A missing Singleton for the renderer",
      "The classes should inherit from each other in a chain",
    ],
    answer: [0],
    explain:
      "Shapes times renderers grows as a product. The Bridge separates the abstraction (what to draw) from the implementation (how to draw it) and joins them by composition, so the count becomes a sum and the renderer can even change at run time. The cost is one more interface and an indirection per call, which is not worth it while you have a single axis of variation.",
  },
  {
    id: "sbm-smell-wrapper-order",
    kind: "smell",
    topic: "L4.decorator",
    level: 3,
    prompt: "Uploads are large and the compression ratio is poor. What is wrong with the stack?",
    code: `std::unique_ptr<Writer> w = std::make_unique<FileWriter>(path);
w = std::make_unique<CompressingWriter>(std::move(w));
w = std::make_unique<EncryptingWriter>(std::move(w));
w->write(payload);   // encrypt first, then compress, then file`,
    options: [
      "Order matters: ciphertext looks random and does not compress. Wrap so data is compressed first, then encrypted, and document the order in one place",
      "Decorators cannot be stacked more than two deep",
      "The unique_ptr should be a shared_ptr so layers can be reordered at run time",
      "FileWriter should inherit from both decorators",
    ],
    answer: [0],
    explain:
      "Decorators compose, and composition order is behaviour. The outermost wrapper sees the data first, so here encryption runs before compression and the compressor gets random-looking bytes. The usual fix is a small factory or builder that owns the correct order so callers cannot get it wrong. The cost of decorators is exactly this: many small layers that are easy to stack incorrectly and harder to debug.",
  },
  {
    id: "sbm-smell-composite-for-three",
    kind: "smell",
    topic: "L4.composite",
    level: 3,
    prompt: "A reviewer asks you to justify this design. What is the strongest honest answer?",
    code: `struct Component { virtual ~Component() = default; virtual int price() const = 0; };
struct Leaf : Component { /* ... */ };
struct Group : Component { std::vector<std::unique_ptr<Component>> kids; /* ... */ };
// Used for: an order that always has exactly three lines, never nested.`,
    options: [
      "It is speculative generality: with a fixed flat list and no nesting, a plain std::vector<Line> and a sum is simpler. Add the tree when real nesting appears",
      "It is correct; every collection should be a Composite",
      "It violates Liskov because Group stores children",
      "Make Group a Singleton so there is one order",
    ],
    answer: [0],
    explain:
      "Composite earns its keep when callers must treat one item and a group of items identically, and groups can contain groups. A flat, fixed list needs none of that. The pattern's price is a shared interface where leaves must implement child-management they do not need, plus recursion everywhere. Name the trigger (nested bundles, folders in folders) and wait for it.",
  },
  {
    id: "sbm-smell-god-facade",
    kind: "smell",
    topic: "L4.facade",
    level: 3,
    prompt: "The Facade started with four methods and now has sixty, with business rules inside. What has it become, and what do you do?",
    code: `class StoreFacade {
 public:
  void checkout(Cart&);
  void refund(OrderId);
  void applyPromo(Cart&, std::string code);
  Money taxFor(const Cart&);          // tax rules live here
  void rebuildSearchIndex();
  /* ... 55 more ... */
};`,
    options: [
      "A god object: the facade absorbed logic. Keep it a thin entry point per use case, move rules into the subsystems, and split by workflow if it still grows",
      "A correct facade; the point is that everything goes through one class",
      "Missing the Proxy pattern; wrap it in a proxy",
      "It should be made a Flyweight to save memory",
    ],
    answer: [0],
    explain:
      "A facade simplifies how callers reach a set of subsystems; it should orchestrate, not decide. Once tax rules and index rebuilds live inside it, every change lands in one file and subsystems cannot be used without it. Keep each method a short sequence of subsystem calls, leave the subsystems public to those who need them, and split into smaller facades per workflow (checkout, back office).",
  },
  {
    id: "sbm-smell-mutable-flyweight",
    kind: "smell",
    topic: "L4.flyweight",
    level: 3,
    prompt: "After one line was recoloured, every line of that font turned red. Name the bug.",
    code: `class Glyph {
 public:
  void setColor(Colour c) { colour_ = c; }   // called by TextLine
 private:
  char ch_; Font font_; Colour colour_;
};
// GlyphFactory returns shared_ptr<Glyph> for each (char, font)`,
    options: [
      "Shared flyweights must be immutable: colour is extrinsic state. Return shared_ptr<const Glyph> and keep colour in each line",
      "The factory should create a new Glyph on every request",
      "setColor() must be virtual",
      "Glyph should be a Singleton so the colour is global",
    ],
    answer: [0],
    explain:
      "A flyweight shares one object among many users, so anything that differs per user (position, colour) has to live outside it. If shared state can be mutated, every holder sees the change. Making the type immutable, and handing out pointers-to-const, turns the bug into a compile error. The trade-off is that callers carry the extrinsic data themselves; measure the memory saved before paying for that complexity.",
  },
  {
    id: "sbm-smell-stale-proxy",
    kind: "smell",
    topic: "L4.proxy",
    level: 2,
    prompt: "Users see old profiles for minutes after saving. Where is the defect?",
    code: `class CachingStore : public Store {
 public:
  std::optional<std::string> get(const std::string& k) override {
    if (auto it = cache_.find(k); it != cache_.end()) return it->second;
    auto v = inner_->get(k);
    if (v) cache_[k] = *v;
    return v;
  }
  void put(const std::string& k, const std::string& v) override { inner_->put(k, v); }
 private:
  std::unique_ptr<Store> inner_;
  std::unordered_map<std::string, std::string> cache_;
};`,
    options: [
      "put() writes through to the inner store but never updates or evicts the cached entry, so reads return the old value. Update or invalidate on every write",
      "get() should return by value, not std::optional",
      "A proxy must not hold the real subject by unique_ptr",
      "The cache should be a std::map so keys stay ordered",
    ],
    answer: [0],
    explain:
      "A caching proxy keeps the same interface, so callers cannot tell it is there, which means it must keep the same answers too. A write that bypasses the cache makes it lie. Update the entry (write-through) or erase it (invalidate) in put(). Beyond this single process, invalidation across several caches is the hard part, and it is worth saying so out loud.",
  },
];
