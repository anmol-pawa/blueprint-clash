import type { Card } from "@/lib/battle/cards";

/**
 * Smell cards for the Old Town master's last phase. Each shows a short C++ fragment and asks for the
 * smell plus the principle it strains. Original wording; the wrong options are the tempting neighbours.
 */
export const OLD_TOWN_MASTER_SMELLS: Card[] = [
  {
    id: "otm-smell-hidden-dep",
    kind: "smell",
    topic: "L2.dip",
    level: 2,
    prompt: "Name the smell and the principle it strains.",
    code: `class OrderService {
 public:
  void place(const Order& o) {
    Logger::instance().log("placing " + o.id());
    Mailer::instance().send(o.customer(), "thanks");
  }
};`,
    options: [
      "Hidden dependencies on global singletons; Dependency Inversion (inject interfaces instead)",
      "God class; Single Responsibility",
      "Missing virtual destructor; Liskov Substitution",
      "Long parameter list; Interface Segregation",
    ],
    answer: [0],
    explain:
      "The constructor says nothing about needing a logger or a mailer, so the class cannot be tested without the real ones and cannot be reused with different ones. Take a Logger& and a Mailer& (abstract interfaces) in the constructor. A singleton is global state with a friendly name.",
  },
  {
    id: "otm-smell-raw-owner",
    kind: "smell",
    topic: "L1.ownership",
    level: 1,
    prompt: "What is wrong with this API?",
    code: `Texture* loadTexture(const std::string& path);

void draw() {
  Texture* t = loadTexture("hero.png");
  if (!t->valid()) return;
  render(*t);
  delete t;
}`,
    options: [
      "The raw pointer does not say who owns the texture; the early return leaks it. Return std::unique_ptr<Texture>",
      "Textures must be returned by value, never by pointer",
      "delete should be delete[] for textures",
      "loadTexture needs to be a virtual function",
    ],
    answer: [0],
    explain:
      "Nothing in the signature tells the caller to delete, and the early return skips the delete. Returning unique_ptr<Texture> makes the transfer of ownership part of the type, and the destructor runs on every path, which is RAII doing its job.",
  },
  {
    id: "otm-smell-inherit-vector",
    kind: "smell",
    topic: "L2.composition",
    level: 2,
    prompt: "Name the smell and the better design.",
    code: `class ScoreBoard : public std::vector<int> {
 public:
  int best() const { return *std::max_element(begin(), end()); }
};

void leak(std::vector<int>* v) { delete v; }
// leak(new ScoreBoard);`,
    options: [
      "Inheritance for reuse from a type without a virtual destructor; hold a vector as a member (composition)",
      "Feature envy; move best() into std::vector",
      "Primitive obsession; wrap the int in a class",
      "Shotgun surgery; split the file in two",
    ],
    answer: [0],
    explain:
      "ScoreBoard is-a vector only by accident: every vector operation (erase, resize, insert garbage) is now public on it, and deleting through a vector pointer is undefined behaviour because std::vector has no virtual destructor. Keep a private std::vector<int> and expose only add() and best().",
  },
  {
    id: "otm-smell-envy",
    kind: "smell",
    topic: "L2.srp",
    level: 2,
    prompt: "Name the smell and the fix.",
    code: `class Invoice {
 public:
  const std::vector<Line>& lines() const { return lines_; }
  double discountRate() const { return rate_; }
 private:
  std::vector<Line> lines_;
  double rate_;
};

double total(const Invoice& inv) {
  double sum = 0;
  for (const Line& l : inv.lines()) sum += l.price * l.qty;
  return sum * (1.0 - inv.discountRate());
}`,
    options: [
      "Feature envy: total() works only on Invoice's data, so it belongs in Invoice (tell, don't ask)",
      "Singleton abuse; make Invoice a global",
      "Missing override; mark total() override",
      "Slicing; pass Invoice by pointer",
    ],
    answer: [0],
    explain:
      "total() reaches into the invoice for every input and uses nothing of its own. Move it to Invoice::total() const so the data and the rule that uses it change together; callers then stop depending on how lines and discounts are stored.",
  },
  {
    id: "otm-smell-fat-interface",
    kind: "smell",
    topic: "L2.isp",
    level: 2,
    prompt: "What does BasicPrinter reveal about the interface?",
    code: `struct Machine {
  virtual ~Machine() = default;
  virtual void print(const Doc&) = 0;
  virtual void scan(Doc&) = 0;
  virtual void fax(const Doc&) = 0;
};

struct BasicPrinter : Machine {
  void print(const Doc& d) override { /* ... */ }
  void scan(Doc&) override { throw std::logic_error("no scanner"); }
  void fax(const Doc&) override { throw std::logic_error("no fax"); }
};`,
    options: [
      "A fat interface: clients are forced to depend on methods they cannot honour (Interface Segregation, with a Liskov flavour)",
      "The destructor should not be defaulted",
      "BasicPrinter should be final",
      "scan should take Doc by value",
    ],
    answer: [0],
    explain:
      "Methods that can only throw are the signature of an interface bundling several roles. Split it into Printer, Scanner and Fax so each class implements exactly what it can do; code that needs a Scanner can no longer be handed a BasicPrinter by mistake.",
  },
  {
    id: "otm-smell-copy-paste",
    kind: "smell",
    topic: "L2.dry",
    level: 1,
    prompt: "What is the smell, and what is the smallest good fix?",
    code: `double priceInEu(double net)  { return net * 1.20 + 2.0; }
double priceInUk(double net)  { return net * 1.20 + 2.5; }
double priceInDe(double net)  { return net * 1.19 + 2.0; }
// ...a fourth copy was added last week`,
    options: [
      "Duplicated logic that must be changed in several places; one function taking the varying parts as parameters (or a small Region data type)",
      "Missing const; mark every function const",
      "Long method; split each function into three",
      "Premature abstraction; delete two of the functions",
    ],
    answer: [0],
    explain:
      "The three bodies differ only in two numbers. When the tax rule changes, every copy needs the same edit and one will be missed. Pass the rate and shipping in (or look them up in a table) so the rule exists once. Do not go further than that until a real difference in behaviour appears.",
  },
];
