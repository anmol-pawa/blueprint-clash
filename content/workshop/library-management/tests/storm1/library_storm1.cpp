#include "api_storm1.h"
#include "bp_test.h"

using lib::Status;
using lib::Tier;

namespace {
std::unique_ptr<lib::TieredLibrary> shelf() {
  auto l = lib::makeTieredLibrary();
  for (int i = 1; i <= 6; ++i) l->addBook("b" + std::to_string(i), "Title" + std::to_string(i), "Author", 1);
  l->addMember("m1", "Ann");
  l->addMember("m2", "Bo");
  return l;
}
}  // namespace

TEST(Tiers, NewMembersAreBasic) {
  auto l = shelf();
  EXPECT_TRUE(l->tierOf("m1") == Tier::Basic);
  EXPECT_TRUE(l->tierOf("nobody") == Tier::Basic);
}

TEST(Tiers, PremiumMayHoldFive) {
  auto l = shelf();
  EXPECT_EQ(l->setTier("m1", Tier::Premium), Status::Ok);
  for (int i = 1; i <= 5; ++i) EXPECT_EQ(l->borrow("m1", "b" + std::to_string(i)), Status::Ok);
  EXPECT_EQ(l->borrow("m1", "b6"), Status::LimitReached);
  EXPECT_EQ(l->loansOf("m1").size(), 5u);
}

TEST(Tiers, BasicStillHoldsThree) {
  auto l = shelf();
  l->setTier("m2", Tier::Premium);
  for (int i = 1; i <= 3; ++i) EXPECT_EQ(l->borrow("m1", "b" + std::to_string(i)), Status::Ok);
  EXPECT_EQ(l->borrow("m1", "b4"), Status::LimitReached);
}

TEST(Tiers, UnknownMemberCannotBePromoted) {
  auto l = shelf();
  EXPECT_EQ(l->setTier("ghost", Tier::Premium), Status::NoSuchMember);
}

TEST(Tiers, DemotionBelowCurrentLoansIsRefused) {
  auto l = shelf();
  l->setTier("m1", Tier::Premium);
  for (int i = 1; i <= 4; ++i) l->borrow("m1", "b" + std::to_string(i));
  EXPECT_EQ(l->setTier("m1", Tier::Basic), Status::LimitReached);
  EXPECT_TRUE(l->tierOf("m1") == Tier::Premium);
  EXPECT_EQ(l->loansOf("m1").size(), 4u);
}

TEST(Tiers, DemotionAfterReturnsWorks) {
  auto l = shelf();
  l->setTier("m1", Tier::Premium);
  for (int i = 1; i <= 4; ++i) l->borrow("m1", "b" + std::to_string(i));
  l->giveBack("m1", "b1");
  EXPECT_EQ(l->setTier("m1", Tier::Basic), Status::Ok);
  EXPECT_TRUE(l->tierOf("m1") == Tier::Basic);
  EXPECT_EQ(l->borrow("m1", "b5"), Status::LimitReached);
}

TEST(Tiers, BaseRulesStillApplyToPremium) {
  auto l = shelf();
  l->setTier("m1", Tier::Premium);
  EXPECT_EQ(l->borrow("m1", "b1"), Status::Ok);
  EXPECT_EQ(l->borrow("m1", "b1"), Status::AlreadyBorrowed);
  EXPECT_EQ(l->borrow("m2", "b1"), Status::NoCopiesAvailable);
}
