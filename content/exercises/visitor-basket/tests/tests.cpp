#include <memory>
#include <string>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
// A brand-new operation, written without editing any item class.
class ReceiptVisitor final : public ItemVisitor {
 public:
  std::vector<std::string> lines;
  void visit(const Goods& g) override { lines.push_back("goods:" + g.name() + "x" + std::to_string(g.quantity())); }
  void visit(const Service& s) override { lines.push_back("service:" + s.name() + "/" + std::to_string(s.hours()) + "h"); }
  void visit(const Voucher& v) override { lines.push_back("voucher:" + v.name()); }
};

class CountingVisitor final : public ItemVisitor {
 public:
  int goods = 0, services = 0, vouchers = 0;
  void visit(const Goods&) override { ++goods; }
  void visit(const Service&) override { ++services; }
  void visit(const Voucher&) override { ++vouchers; }
};

Basket sampleBasket() {
  Basket b;
  b.add(std::make_unique<Goods>("pen", 3, 250));
  b.add(std::make_unique<Service>("setup", 2, 4000));
  b.add(std::make_unique<Voucher>("welcome", 500));
  return b;
}
}  // namespace

TEST(Basket, TotalMultipliesQuantityAndHours) {
  Basket b;
  b.add(std::make_unique<Goods>("pen", 3, 250));
  b.add(std::make_unique<Service>("setup", 2, 4000));
  TotalVisitor t;
  b.accept(t);
  EXPECT_EQ(t.totalCents(), 8750LL);
}

TEST(Basket, VoucherReducesTheTotal) {
  Basket b = sampleBasket();
  TotalVisitor t;
  b.accept(t);
  EXPECT_EQ(t.totalCents(), 8250LL);
}

TEST(Basket, EmptyBasketTotalsZero) {
  Basket b;
  TotalVisitor t;
  b.accept(t);
  EXPECT_EQ(t.totalCents(), 0LL);
}

TEST(Basket, EachKindReachesItsOwnOverload) {
  Basket b = sampleBasket();
  b.add(std::make_unique<Goods>("cap", 1, 900));
  CountingVisitor c;
  b.accept(c);
  EXPECT_EQ(c.goods, 2);
  EXPECT_EQ(c.services, 1);
  EXPECT_EQ(c.vouchers, 1);
}

TEST(Basket, ItemsAreVisitedInInsertionOrder) {
  Basket b = sampleBasket();
  ReceiptVisitor r;
  b.accept(r);
  std::vector<std::string> expected{"goods:penx3", "service:setup/2h", "voucher:welcome"};
  EXPECT_TRUE(r.lines == expected);
}

TEST(Basket, NewOperationsNeedNoChangeToTheItems) {
  Basket b = sampleBasket();
  ReceiptVisitor r;
  TotalVisitor t;
  b.accept(r);
  b.accept(t);
  EXPECT_EQ(r.lines.size(), static_cast<std::size_t>(3));
  EXPECT_EQ(t.totalCents(), 8250LL);
}

TEST(Basket, AddingNullIsIgnored) {
  Basket b;
  b.add(nullptr);
  b.add(std::make_unique<Voucher>("v", 100));
  b.add(nullptr);
  EXPECT_EQ(b.size(), static_cast<std::size_t>(1));
  TotalVisitor t;
  b.accept(t);
  EXPECT_EQ(t.totalCents(), -100LL);
}

TEST(Item, AcceptWorksThroughABasePointer) {
  std::unique_ptr<Item> item = std::make_unique<Voucher>("promo", 300);
  CountingVisitor c;
  item->accept(c);
  EXPECT_EQ(c.vouchers, 1);
  EXPECT_EQ(c.goods + c.services, 0);
}
