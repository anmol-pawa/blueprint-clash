#include <memory>
#include <string>

#include "api_storm1.h"
#include "bp_test.h"

using ride::Point;
using ride::Status;

namespace {
Point spot(int x, int y) { return Point{x, y}; }

// `count` drivers d1..dN at the origin, all online. Every ordinary trip is (0,0) to (0,2): two blocks, so the
// standard fare is 310 + 2 * 125 = 560.
struct SurgeFixture {
  std::unique_ptr<ride::Rides> rides = ride::makeSurgeRides();
  explicit SurgeFixture(int count) {
    for (int i = 1; i <= count; ++i) {
      const std::string name = "d" + std::to_string(i);
      rides->registerDriver(name, spot(0, 0));
      rides->goOnline(name);
    }
  }
  ride::RequestResult ask(const std::string& rider, Point dropoff = spot(0, 2)) {
    return rides->requestRide(rider, spot(0, 0), dropoff);
  }
};
}  // namespace

TEST(Surge, AFactoryReturnsASystem) { EXPECT_TRUE(ride::makeSurgeRides() != nullptr); }

TEST(Surge, TheMultiplierStepsUpWithUtilisation) {
  SurgeFixture f(5);
  EXPECT_EQ(f.ask("r1").fare, 560);   // 0 of 5 busy: 0%
  EXPECT_EQ(f.ask("r2").fare, 560);   // 1 of 5: 20%
  EXPECT_EQ(f.ask("r3").fare, 560);   // 2 of 5: 40%
  EXPECT_EQ(f.ask("r4").fare, 840);   // 3 of 5: 60% -> x1.5
  EXPECT_EQ(f.ask("r5").fare, 1120);  // 4 of 5: 80% -> x2
}

TEST(Surge, ExactlyHalfBusyAlreadyCostsMore) {
  SurgeFixture f(4);
  f.ask("r1");
  f.ask("r2");
  EXPECT_EQ(f.ask("r3").fare, 840);  // 2 of 4 busy is exactly 50%
}

TEST(Surge, ExactlyEightyPercentIsTheTopStep) {
  SurgeFixture f(5);
  f.ask("r1");
  f.ask("r2");
  f.ask("r3");
  EXPECT_EQ(f.ask("r4").fare, 840);   // 60%
  EXPECT_EQ(f.ask("r5").fare, 1120);  // 80%
}

TEST(Surge, TheMarketIsReadBeforeTheNewDriverIsTaken) {
  SurgeFixture f(2);
  EXPECT_EQ(f.ask("r1").fare, 560);   // nobody was busy when this request arrived
  EXPECT_EQ(f.ask("r2").fare, 840);   // one of two was
}

TEST(Surge, OfflineDriversDoNotCountAsCapacity) {
  SurgeFixture f(4);
  f.rides->goOffline("d3");
  f.rides->goOffline("d4");
  f.ask("r1");
  EXPECT_EQ(f.ask("r2").fare, 840);  // one of two ONLINE drivers is busy
}

TEST(Surge, TheFareIsRoundedDownOnce) {
  SurgeFixture f(2);
  f.ask("r1");
  // One block costs 435 at the standard rate; x1.5 is 652.5, rounded down once to 652.
  EXPECT_EQ(f.ask("r2", spot(0, 1)).fare, 652);
}

TEST(Surge, TheQuotedFareIsTheFareChargedAtTheEnd) {
  SurgeFixture f(2);
  f.ask("r1");
  const auto surged = f.ask("r2");
  EXPECT_EQ(surged.fare, 840);
  f.rides->arrived(surged.trip, surged.driver);
  f.rides->start(surged.trip, surged.driver);
  EXPECT_EQ(f.rides->trip(surged.trip).fare, 840);
  const auto done = f.rides->complete(surged.trip, surged.driver);
  EXPECT_EQ(done.fare, 840);
}

TEST(Surge, TheFareIsFixedWhenRequestedWhateverHappensNext) {
  SurgeFixture f(2);
  const auto calm = f.ask("r1");
  EXPECT_EQ(calm.fare, 560);
  f.ask("r2");  // the city fills up after r1 asked
  f.rides->arrived(calm.trip, calm.driver);
  f.rides->start(calm.trip, calm.driver);
  EXPECT_EQ(f.rides->complete(calm.trip, calm.driver).fare, 560);
}

TEST(Surge, TheLateCancelFeeIsNotMultiplied) {
  SurgeFixture f(2);
  f.ask("r1");
  const auto surged = f.ask("r2");
  f.rides->arrived(surged.trip, surged.driver);
  EXPECT_EQ(f.rides->cancel(surged.trip, "r2").fee, 200);
}
