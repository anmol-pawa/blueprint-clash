#include <memory>
#include "bp_test.h"
#include "solution.h"

namespace {
std::unique_ptr<Item> make(const char* name, int q = 1) { return std::make_unique<Item>(name, q); }
}  // namespace

TEST(Add, StoresAndFindsAnItem) {
  Inventory inv;
  EXPECT_TRUE(inv.add(make("rope", 3)));
  EXPECT_EQ(inv.size(), 1u);
  const Item* it = inv.find("rope");
  ASSERT_TRUE(it != nullptr);
  EXPECT_EQ(it->quantity, 3);
  EXPECT_TRUE(inv.find("lamp") == nullptr);
}

TEST(Add, RefusesNullAndDuplicates) {
  Inventory inv;
  EXPECT_FALSE(inv.add(nullptr));
  EXPECT_TRUE(inv.add(make("rope", 3)));
  EXPECT_FALSE(inv.add(make("rope", 9)));
  EXPECT_EQ(inv.size(), 1u);
  EXPECT_EQ(inv.find("rope")->quantity, 3);
}

TEST(Ownership, RefusedItemIsFreedNotLeaked) {
  int before = Item::live();
  {
    Inventory inv;
    inv.add(make("rope"));
    inv.add(make("rope"));
    EXPECT_EQ(Item::live(), before + 1);
  }
  EXPECT_EQ(Item::live(), before);
}

TEST(Ownership, DestroyingTheInventoryDestroysItsItems) {
  int before = Item::live();
  {
    Inventory inv;
    inv.add(make("a"));
    inv.add(make("b"));
    inv.add(make("c"));
    EXPECT_EQ(Item::live(), before + 3);
  }
  EXPECT_EQ(Item::live(), before);
}

TEST(Take, TransfersOwnershipToTheCaller) {
  int before = Item::live();
  Inventory inv;
  inv.add(make("lamp", 2));
  std::unique_ptr<Item> lamp = inv.take("lamp");
  ASSERT_TRUE(lamp != nullptr);
  EXPECT_EQ(lamp->quantity, 2);
  EXPECT_EQ(inv.size(), 0u);
  EXPECT_TRUE(inv.find("lamp") == nullptr);
  EXPECT_EQ(Item::live(), before + 1);  // alive, now owned by `lamp`
  lamp.reset();
  EXPECT_EQ(Item::live(), before);
}

TEST(Take, UnknownNameGivesNull) {
  Inventory inv;
  inv.add(make("rope"));
  EXPECT_TRUE(inv.take("nope") == nullptr);
  EXPECT_EQ(inv.size(), 1u);
}

TEST(Take, ItemSurvivesTheInventory) {
  std::unique_ptr<Item> kept;
  {
    Inventory inv;
    inv.add(make("gem", 5));
    kept = inv.take("gem");
  }
  ASSERT_TRUE(kept != nullptr);
  EXPECT_EQ(kept->quantity, 5);
}
