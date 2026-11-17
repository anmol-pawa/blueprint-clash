#include <memory>
#include <string>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
using booking::ExtendResult;
using booking::SeatState;
using booking::Status;

class FakeClock : public booking::Clock {
 public:
  long long now() const override { return now_; }
  void advance(long long ticks) { now_ += ticks; }

 private:
  long long now_ = 1000;
};

constexpr long long kHold = 10;

struct Fixture {
  Fixture() { service->addShow("s1", 3, 4); }
  std::shared_ptr<FakeClock> clock = std::make_shared<FakeClock>();
  std::unique_ptr<booking::ExtendableService> service = booking::makeExtendableService(clock, kHold);
};

std::string name(ExtendResult r) {
  switch (r) {
    case ExtendResult::Ok: return "Ok";
    case ExtendResult::UnknownHold: return "UnknownHold";
    case ExtendResult::NotOwner: return "NotOwner";
    case ExtendResult::Expired: return "Expired";
    case ExtendResult::AlreadyExtended: return "AlreadyExtended";
  }
  return "?";
}

std::string held(const Fixture& f, int seat) { return f.service->seatState("s1", seat) == SeatState::Held ? "Held" : "NotHeld"; }
}  // namespace

TEST(Extend, TheEarlierBehaviourStillHolds) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1});
  EXPECT_EQ(r.status == Status::Ok, true);
  f.clock->advance(kHold);
  EXPECT_EQ(held(f, 1), "NotHeld");
  EXPECT_TRUE(f.service->confirm(r.id, "ann") == Status::Expired);
}

TEST(Extend, GivesAFullPeriodCountedFromTheMomentOfTheExtension) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1});
  f.clock->advance(6);
  EXPECT_EQ(name(f.service->extend(r.id, "ann")), "Ok");
  f.clock->advance(9);  // tick 15 after the hold: the old deadline (10) is long past
  EXPECT_EQ(held(f, 1), "Held");
  f.clock->advance(1);  // 6 + 10 = 16
  EXPECT_EQ(held(f, 1), "NotHeld");
}

TEST(Extend, TheNewDeadlineReplacesTheOldOneInsteadOfAddingToIt) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1});
  f.clock->advance(2);
  f.service->extend(r.id, "ann");  // new deadline: 2 + 10 = 12, not 10 + 10 = 20
  f.clock->advance(10);
  EXPECT_EQ(held(f, 1), "NotHeld");
}

TEST(Extend, AnExtendedHoldCanStillBeConfirmedInTheExtraTime) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1, 2});
  f.clock->advance(8);
  f.service->extend(r.id, "ann");
  f.clock->advance(9);
  EXPECT_TRUE(f.service->confirm(r.id, "ann") == Status::Ok);
  EXPECT_TRUE(f.service->seatState("s1", 2) == SeatState::Booked);
}

TEST(Extend, AHoldCanBeExtendedOnlyOnce) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1});
  EXPECT_EQ(name(f.service->extend(r.id, "ann")), "Ok");
  f.clock->advance(3);
  EXPECT_EQ(name(f.service->extend(r.id, "ann")), "AlreadyExtended");
  f.clock->advance(7);  // 10 after the first extension: the second call must not have moved the deadline
  EXPECT_EQ(held(f, 1), "NotHeld");
}

TEST(Extend, OnlyTheHolderCanExtend) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1});
  EXPECT_EQ(name(f.service->extend(r.id, "mallory")), "NotOwner");
  f.clock->advance(kHold);
  EXPECT_EQ(held(f, 1), "NotHeld");  // the refused attempt gave nothing away
}

TEST(Extend, ALapsedHoldCannotBeRevived) {
  Fixture f;
  const auto old = f.service->hold("s1", "ann", {1});
  f.clock->advance(kHold);
  EXPECT_EQ(name(f.service->extend(old.id, "ann")), "Expired");
  EXPECT_EQ(held(f, 1), "NotHeld");
  const auto fresh = f.service->hold("s1", "bob", {1});
  EXPECT_TRUE(fresh.status == Status::Ok);
  EXPECT_EQ(name(f.service->extend(old.id, "ann")), "Expired");
  EXPECT_TRUE(f.service->confirm(fresh.id, "bob") == Status::Ok);
}

TEST(Extend, TheLastLiveTickStillAllowsAnExtension) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1});
  f.clock->advance(kHold - 1);
  EXPECT_EQ(name(f.service->extend(r.id, "ann")), "Ok");
}

TEST(Extend, SpentAndUnknownHoldsAreUnknown) {
  Fixture f;
  const auto a = f.service->hold("s1", "ann", {1});
  const auto b = f.service->hold("s1", "bob", {2});
  f.service->confirm(a.id, "ann");
  f.service->release(b.id, "bob");
  EXPECT_EQ(name(f.service->extend(a.id, "ann")), "UnknownHold");
  EXPECT_EQ(name(f.service->extend(b.id, "bob")), "UnknownHold");
  EXPECT_EQ(name(f.service->extend(9999, "ann")), "UnknownHold");
}

TEST(Extend, ACheckOrderOfUnknownThenOwnerThenExpiredThenAlreadyExtended) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1});
  f.service->extend(r.id, "ann");
  EXPECT_EQ(name(f.service->extend(r.id, "mallory")), "NotOwner");
  f.clock->advance(kHold);
  EXPECT_EQ(name(f.service->extend(r.id, "mallory")), "NotOwner");
  EXPECT_EQ(name(f.service->extend(r.id, "ann")), "Expired");
}

TEST(Extend, OneHoldsExtensionDoesNotTouchAnotherHold) {
  Fixture f;
  const auto a = f.service->hold("s1", "ann", {1});
  const auto b = f.service->hold("s1", "bob", {2});
  f.clock->advance(5);
  f.service->extend(a.id, "ann");
  f.clock->advance(5);
  EXPECT_EQ(held(f, 1), "Held");
  EXPECT_EQ(held(f, 2), "NotHeld");
  EXPECT_TRUE(f.service->confirm(b.id, "bob") == Status::Expired);
}

TEST(Extend, ReleasingAnExtendedHoldFreesItsSeats) {
  Fixture f;
  const auto r = f.service->hold("s1", "ann", {1});
  f.service->extend(r.id, "ann");
  EXPECT_TRUE(f.service->release(r.id, "ann") == Status::Ok);
  EXPECT_EQ(held(f, 1), "NotHeld");
  EXPECT_EQ(f.service->freeSeats("s1"), 12);
}

TEST(Extend, ANullClockIsStillRefused) {
  EXPECT_TRUE(booking::makeExtendableService(nullptr, 10) == nullptr);
  EXPECT_TRUE(booking::makeExtendableService(std::make_shared<FakeClock>(), 0) == nullptr);
}
