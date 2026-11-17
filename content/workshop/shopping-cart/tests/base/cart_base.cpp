#include <map>
#include <memory>
#include <string>

#include "api.h"
#include "bp_test.h"

using cart::Status;

namespace {
// Products: "pen" 150 cents, 10 on the shelf. "book" 1200, 3. "lamp" 4500, 1.
struct Fixture {
  std::unique_ptr<cart::Shop> shop = cart::makeShop();
  Fixture() {
    shop->addProduct("pen", 150, 10);
    shop->addProduct("book", 1200, 3);
    shop->addProduct("lamp", 4500, 1);
  }
  int stockOf(const std::string& sku) const {
    const auto s = shop->stock(sku);
    return s ? *s : -1;
  }
};
}  // namespace

TEST(Setup, ProductsMustBeNewAndHaveSaneNumbers) {
  Fixture f;
  EXPECT_FALSE(f.shop->addProduct("pen", 99, 5));
  EXPECT_FALSE(f.shop->addProduct("", 99, 5));
  EXPECT_FALSE(f.shop->addProduct("x", 0, 5));
  EXPECT_FALSE(f.shop->addProduct("x", 1000001, 5));
  EXPECT_FALSE(f.shop->addProduct("x", 99, -1));
  EXPECT_FALSE(f.shop->addProduct("x", 99, 1000001));
  EXPECT_TRUE(f.shop->addProduct("empty", 1, 0));
  EXPECT_TRUE(f.shop->addProduct("big", 1000000, 1000000));
  EXPECT_EQ(f.stockOf("empty"), 0);
  EXPECT_EQ(f.stockOf("big"), 1000000);
  EXPECT_EQ(f.stockOf("x"), -1);
}

TEST(Setup, ARefusedProductDoesNotDisturbTheExistingOne) {
  Fixture f;
  EXPECT_TRUE(f.shop->addToCart("ann", "pen", 2) == Status::Ok);
  EXPECT_FALSE(f.shop->addProduct("pen", 99, 500));
  EXPECT_EQ(f.stockOf("pen"), 10);
  EXPECT_EQ(f.shop->subtotal("ann"), 300);
}

TEST(Cart, AddingBuildsLinesAndTheSubtotal) {
  Fixture f;
  EXPECT_TRUE(f.shop->addToCart("ann", "pen", 2) == Status::Ok);
  EXPECT_TRUE(f.shop->addToCart("ann", "book", 1) == Status::Ok);
  EXPECT_EQ(f.shop->subtotal("ann"), 1500);
}

TEST(Cart, AddingTheSameProductAgainMergesIntoOneLine) {
  Fixture f;
  f.shop->addToCart("ann", "pen", 2);
  f.shop->addToCart("ann", "pen", 3);
  EXPECT_EQ(f.shop->subtotal("ann"), 750);
  EXPECT_TRUE(f.shop->removeFromCart("ann", "pen", 5) == Status::Ok);
  EXPECT_EQ(f.shop->subtotal("ann"), 0);
  EXPECT_TRUE(f.shop->removeFromCart("ann", "pen", 1) == Status::NotInCart);
}

TEST(Cart, AddChecksAreInTheDocumentedOrder) {
  Fixture f;
  EXPECT_TRUE(f.shop->addToCart("", "nope", 1) == Status::InvalidRequest);
  EXPECT_TRUE(f.shop->addToCart("ann", "nope", 0) == Status::InvalidRequest);
  EXPECT_TRUE(f.shop->addToCart("ann", "nope", 1) == Status::UnknownProduct);
  EXPECT_TRUE(f.shop->addToCart("ann", "pen", 0) == Status::InvalidRequest);
  EXPECT_TRUE(f.shop->addToCart("ann", "pen", -3) == Status::InvalidRequest);
  EXPECT_EQ(f.shop->subtotal("ann"), 0);
}

TEST(Cart, QuantityBoundsAreInclusive) {
  Fixture f;
  EXPECT_TRUE(f.shop->addToCart("ann", "pen", 99) == Status::Ok);
  EXPECT_TRUE(f.shop->addToCart("bob", "pen", 100) == Status::InvalidRequest);
  EXPECT_TRUE(f.shop->addToCart("bob", "pen", 1) == Status::Ok);
  EXPECT_EQ(f.shop->subtotal("ann"), 99 * 150);
  EXPECT_EQ(f.shop->subtotal("bob"), 150);
}

TEST(Cart, ALineHoldsAtMostNinetyNineUnitsEvenAcrossCalls) {
  Fixture f;
  EXPECT_TRUE(f.shop->addToCart("ann", "pen", 98) == Status::Ok);
  EXPECT_TRUE(f.shop->addToCart("ann", "pen", 2) == Status::InvalidRequest);
  EXPECT_EQ(f.shop->subtotal("ann"), 98 * 150);
  EXPECT_TRUE(f.shop->addToCart("ann", "pen", 1) == Status::Ok);
  EXPECT_TRUE(f.shop->addToCart("ann", "pen", 1) == Status::InvalidRequest);
  EXPECT_EQ(f.shop->subtotal("ann"), 99 * 150);
  EXPECT_TRUE(f.shop->addToCart("ann", "book", 99) == Status::Ok);
}

TEST(Cart, AddingDoesNotLookAtOrReserveStock) {
  Fixture f;
  EXPECT_TRUE(f.shop->addToCart("ann", "lamp", 5) == Status::Ok);
  EXPECT_TRUE(f.shop->addToCart("bob", "lamp", 1) == Status::Ok);
  EXPECT_EQ(f.stockOf("lamp"), 1);
}

TEST(Cart, CartsAreIndependentPerCustomer) {
  Fixture f;
  f.shop->addToCart("ann", "pen", 1);
  f.shop->addToCart("bob", "book", 2);
  EXPECT_EQ(f.shop->subtotal("ann"), 150);
  EXPECT_EQ(f.shop->subtotal("bob"), 2400);
  EXPECT_EQ(f.shop->subtotal("cy"), 0);
}

TEST(Cart, RemovingReducesTheLine) {
  Fixture f;
  f.shop->addToCart("ann", "pen", 5);
  EXPECT_TRUE(f.shop->removeFromCart("ann", "pen", 2) == Status::Ok);
  EXPECT_EQ(f.shop->subtotal("ann"), 450);
}

TEST(Cart, RemovingMoreThanTheLineHoldsRemovesTheLine) {
  Fixture f;
  f.shop->addToCart("ann", "pen", 2);
  f.shop->addToCart("ann", "book", 1);
  EXPECT_TRUE(f.shop->removeFromCart("ann", "pen", 50) == Status::Ok);
  EXPECT_EQ(f.shop->subtotal("ann"), 1200);
  EXPECT_TRUE(f.shop->addToCart("ann", "pen", 99) == Status::Ok);
}

TEST(Cart, RemoveChecksAreInTheDocumentedOrder) {
  Fixture f;
  f.shop->addToCart("ann", "pen", 2);
  EXPECT_TRUE(f.shop->removeFromCart("", "pen", 1) == Status::InvalidRequest);
  EXPECT_TRUE(f.shop->removeFromCart("ann", "pen", 0) == Status::InvalidRequest);
  EXPECT_TRUE(f.shop->removeFromCart("ann", "book", 1) == Status::NotInCart);
  EXPECT_TRUE(f.shop->removeFromCart("ann", "nope", 1) == Status::NotInCart);
  EXPECT_TRUE(f.shop->removeFromCart("bob", "pen", 1) == Status::NotInCart);
  EXPECT_TRUE(f.shop->removeFromCart("ann", "nope", 0) == Status::InvalidRequest);
  EXPECT_EQ(f.shop->subtotal("ann"), 300);
}

TEST(Checkout, BuysEverythingAndEmptiesTheCart) {
  Fixture f;
  f.shop->addToCart("ann", "pen", 4);
  f.shop->addToCart("ann", "book", 2);
  const cart::CheckoutResult r = f.shop->checkout("ann");
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_TRUE(r.id > 0);
  EXPECT_EQ(r.total, 3000);
  EXPECT_EQ(f.stockOf("pen"), 6);
  EXPECT_EQ(f.stockOf("book"), 1);
  EXPECT_EQ(f.shop->subtotal("ann"), 0);
  EXPECT_TRUE(f.shop->checkout("ann").status == Status::EmptyCart);
}

TEST(Checkout, OrderIdsAreDistinctAndPositive) {
  Fixture f;
  f.shop->addToCart("ann", "pen", 1);
  const cart::CheckoutResult a = f.shop->checkout("ann");
  f.shop->addToCart("ann", "pen", 1);
  const cart::CheckoutResult b = f.shop->checkout("ann");
  EXPECT_TRUE(a.id > 0);
  EXPECT_TRUE(b.id > 0);
  EXPECT_TRUE(a.id != b.id);
}

TEST(Checkout, ChecksAreInTheDocumentedOrder) {
  Fixture f;
  EXPECT_TRUE(f.shop->checkout("").status == Status::InvalidRequest);
  EXPECT_TRUE(f.shop->checkout("ann").status == Status::EmptyCart);
  f.shop->addToCart("ann", "lamp", 2);
  const cart::CheckoutResult r = f.shop->checkout("ann");
  EXPECT_TRUE(r.status == Status::OutOfStock);
  EXPECT_EQ(r.id, 0);
  EXPECT_EQ(r.total, 0);
}

TEST(Checkout, OutOfStockChangesNothingNotEvenTheLinesThatWereFine) {
  Fixture f;
  f.shop->addToCart("ann", "pen", 2);
  f.shop->addToCart("ann", "book", 1);
  f.shop->addToCart("ann", "lamp", 2);  // the shelf has 1
  EXPECT_TRUE(f.shop->checkout("ann").status == Status::OutOfStock);
  EXPECT_EQ(f.stockOf("pen"), 10);
  EXPECT_EQ(f.stockOf("book"), 3);
  EXPECT_EQ(f.stockOf("lamp"), 1);
  EXPECT_EQ(f.shop->subtotal("ann"), 300 + 1200 + 9000);
  EXPECT_TRUE(f.shop->removeFromCart("ann", "lamp", 1) == Status::Ok);
  const cart::CheckoutResult r = f.shop->checkout("ann");
  EXPECT_TRUE(r.status == Status::Ok);
  EXPECT_EQ(r.total, 300 + 1200 + 4500);
}

TEST(Checkout, ExactlyTheShelfIsEnough) {
  Fixture f;
  f.shop->addToCart("ann", "book", 3);
  EXPECT_TRUE(f.shop->checkout("ann").status == Status::Ok);
  EXPECT_EQ(f.stockOf("book"), 0);
}

TEST(Checkout, TheLastUnitGoesToTheFirstBuyerAndTheOtherKeepsTheCart) {
  Fixture f;
  f.shop->addToCart("ann", "lamp", 1);
  f.shop->addToCart("bob", "lamp", 1);
  f.shop->addToCart("bob", "pen", 1);
  EXPECT_TRUE(f.shop->checkout("ann").status == Status::Ok);
  EXPECT_TRUE(f.shop->checkout("bob").status == Status::OutOfStock);
  EXPECT_EQ(f.shop->subtotal("bob"), 4650);
  EXPECT_EQ(f.stockOf("pen"), 10);
}

TEST(Cancel, PutsTheStockBackAndSpendsTheId) {
  Fixture f;
  f.shop->addToCart("ann", "pen", 4);
  f.shop->addToCart("ann", "lamp", 1);
  const cart::OrderId id = f.shop->checkout("ann").id;
  EXPECT_EQ(f.stockOf("pen"), 6);
  EXPECT_EQ(f.stockOf("lamp"), 0);
  EXPECT_TRUE(f.shop->cancelOrder(id, "ann") == Status::Ok);
  EXPECT_EQ(f.stockOf("pen"), 10);
  EXPECT_EQ(f.stockOf("lamp"), 1);
  EXPECT_TRUE(f.shop->cancelOrder(id, "ann") == Status::UnknownOrder);
  EXPECT_EQ(f.stockOf("pen"), 10);
}

TEST(Cancel, OnlyTheBuyerMayCancelAndFailuresAreInOrder) {
  Fixture f;
  f.shop->addToCart("ann", "pen", 1);
  const cart::OrderId id = f.shop->checkout("ann").id;
  EXPECT_TRUE(f.shop->cancelOrder(id, "bob") == Status::WrongCustomer);
  EXPECT_TRUE(f.shop->cancelOrder(id + 100, "bob") == Status::UnknownOrder);
  EXPECT_TRUE(f.shop->cancelOrder(0, "ann") == Status::UnknownOrder);
  EXPECT_TRUE(f.shop->cancelOrder(-1, "ann") == Status::UnknownOrder);
  EXPECT_EQ(f.stockOf("pen"), 9);
  EXPECT_TRUE(f.shop->cancelOrder(id, "ann") == Status::Ok);
}

TEST(Cancel, GivesBackOnlyThatOrdersUnits) {
  Fixture f;
  f.shop->addToCart("ann", "pen", 3);
  const cart::OrderId a = f.shop->checkout("ann").id;
  f.shop->addToCart("bob", "pen", 2);
  f.shop->checkout("bob");
  EXPECT_EQ(f.stockOf("pen"), 5);
  f.shop->cancelOrder(a, "ann");
  EXPECT_EQ(f.stockOf("pen"), 8);
}

TEST(Cancel, FreedStockCanBeBoughtAgain) {
  Fixture f;
  f.shop->addToCart("ann", "lamp", 1);
  const cart::OrderId id = f.shop->checkout("ann").id;
  f.shop->addToCart("bob", "lamp", 1);
  EXPECT_TRUE(f.shop->checkout("bob").status == Status::OutOfStock);
  f.shop->cancelOrder(id, "ann");
  EXPECT_TRUE(f.shop->checkout("bob").status == Status::Ok);
}

namespace {
// A tiny model of the whole shop, written the obvious way, to compare against.
struct Model {
  std::map<std::string, int> stock{{"pen", 10}, {"book", 3}, {"lamp", 1}};
  std::map<std::string, long long> price{{"pen", 150}, {"book", 1200}, {"lamp", 4500}};
  std::map<std::string, std::map<std::string, int>> carts;
  struct Placed {
    std::string who;
    std::map<std::string, int> lines;
  };
  std::map<long long, Placed> orders;

  long long subtotal(const std::string& who) {
    long long sum = 0;
    for (const auto& [sku, q] : carts[who]) sum += price[sku] * q;
    return sum;
  }
};
}  // namespace

TEST(Contention, ManyRandomShoppersAgreeWithASimpleModel) {
  Fixture f;
  Model model;
  unsigned seed = 12345;
  const auto next = [&seed](unsigned bound) {
    seed = seed * 1103515245u + 12345u;
    return (seed >> 16) % bound;
  };
  const char* who[] = {"ann", "bob", "cy"};
  const char* skus[] = {"pen", "book", "lamp"};
  std::map<long long, std::string> ids;
  for (int step = 0; step < 600; ++step) {
    const std::string c = who[next(3)];
    const std::string sku = skus[next(3)];
    switch (next(5)) {
      case 0: {
        const int q = 1 + static_cast<int>(next(4));
        const bool fits = model.carts[c][sku] + q <= 99;
        EXPECT_TRUE((f.shop->addToCart(c, sku, q) == Status::Ok) == fits);
        if (fits) model.carts[c][sku] += q;
        break;
      }
      case 1: {
        const int q = 1 + static_cast<int>(next(3));
        const bool has = model.carts[c].count(sku) > 0;
        EXPECT_TRUE((f.shop->removeFromCart(c, sku, q) == Status::Ok) == has);
        if (has) {
          model.carts[c][sku] -= q;
          if (model.carts[c][sku] <= 0) model.carts[c].erase(sku);
        }
        break;
      }
      case 2:
      case 3: {
        bool fine = !model.carts[c].empty();
        for (const auto& [s, q] : model.carts[c]) fine = fine && q <= model.stock[s];
        const cart::CheckoutResult r = f.shop->checkout(c);
        EXPECT_TRUE((r.status == Status::Ok) == fine);
        if (fine) {
          EXPECT_EQ(r.total, model.subtotal(c));
          for (const auto& [s, q] : model.carts[c]) model.stock[s] -= q;
          model.orders[r.id] = Model::Placed{c, model.carts[c]};
          model.carts[c].clear();
        }
        break;
      }
      default: {
        if (model.orders.empty()) break;
        const auto it = model.orders.begin();
        EXPECT_TRUE(f.shop->cancelOrder(it->first, it->second.who) == Status::Ok);
        for (const auto& [s, q] : it->second.lines) model.stock[s] += q;
        model.orders.erase(it);
        break;
      }
    }
    for (const char* s : skus) EXPECT_EQ(f.stockOf(s), model.stock[s]);
    for (const char* p : who) EXPECT_EQ(f.shop->subtotal(p), model.subtotal(p));
  }
}
