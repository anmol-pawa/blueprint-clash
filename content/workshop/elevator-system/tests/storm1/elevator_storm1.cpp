#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

using elev::CarState;
using elev::Direction;
using elev::Status;
using Floors = std::vector<int>;

namespace {
bool allQuiet(const elev::ElevatorSystem& s) {
  for (int i = 0; i < s.elevatorCount(); ++i) {
    if (!s.stopsOf(i).empty() || s.stateOf(i) == CarState::DoorsOpen || s.stateOf(i) == CarState::MovingUp ||
        s.stateOf(i) == CarState::MovingDown) {
      return false;
    }
  }
  return true;
}

void settle(elev::ElevatorSystem& s) {
  for (int i = 0; i < 200 && !allQuiet(s); ++i) s.step();
}

void stepTimes(elev::ElevatorSystem& s, int n) {
  for (int i = 0; i < n; ++i) s.step();
}

void sendTo(elev::ElevatorSystem& s, int car, int floor) {
  s.selectFloor(car, floor);
  settle(s);
}
}  // namespace

TEST(Service, ACarOutOfServiceStopsWhereItIs) {
  auto s = elev::makeServiceableElevators(10, 2);
  s->selectFloor(0, 6);
  stepTimes(*s, 2);
  EXPECT_EQ(s->setOutOfService(0), Status::Ok);
  EXPECT_TRUE(s->stateOf(0) == CarState::OutOfService);
  EXPECT_TRUE(s->stopsOf(0).empty());
  stepTimes(*s, 5);
  EXPECT_EQ(s->floorOf(0), 2);
  EXPECT_TRUE(s->stateOf(0) == CarState::OutOfService);
}

TEST(Service, OutOfServiceReassignsHallCalls) {
  auto s = elev::makeServiceableElevators(10, 2);
  s->requestPickup(4, Direction::Up);
  EXPECT_TRUE(s->stopsOf(0) == Floors({4}));
  EXPECT_EQ(s->setOutOfService(0), Status::Ok);
  EXPECT_TRUE(s->stopsOf(0).empty());
  EXPECT_TRUE(s->stopsOf(1) == Floors({4}));
  stepTimes(*s, 4);
  EXPECT_EQ(s->floorOf(1), 4);
  EXPECT_TRUE(s->stateOf(1) == CarState::DoorsOpen);
}

TEST(Service, ReassignedCallsGoToTheNearestCarInService) {
  auto s = elev::makeServiceableElevators(12, 3);
  sendTo(*s, 1, 6);
  sendTo(*s, 2, 9);
  s->requestPickup(7, Direction::Down);
  EXPECT_TRUE(s->stopsOf(1) == Floors({7}));
  EXPECT_EQ(s->setOutOfService(1), Status::Ok);
  EXPECT_TRUE(s->stopsOf(2) == Floors({7}));
  EXPECT_TRUE(s->stopsOf(0).empty());
}

TEST(Service, NewCallsSkipACarOutOfService) {
  auto s = elev::makeServiceableElevators(10, 2);
  s->setOutOfService(0);
  EXPECT_EQ(s->requestPickup(3, Direction::Up), Status::Ok);
  EXPECT_TRUE(s->stopsOf(0).empty());
  EXPECT_TRUE(s->stopsOf(1) == Floors({3}));
}

TEST(Service, PassengersCannotSelectInACarOutOfService) {
  auto s = elev::makeServiceableElevators(10, 2);
  s->setOutOfService(1);
  EXPECT_EQ(s->selectFloor(1, 4), Status::OutOfService);
  EXPECT_TRUE(s->stopsOf(1).empty());
  EXPECT_EQ(s->selectFloor(0, 4), Status::Ok);
}

TEST(Service, TheLastCarInServiceCannotBeRemoved) {
  auto s = elev::makeServiceableElevators(10, 2);
  EXPECT_EQ(s->setOutOfService(0), Status::Ok);
  EXPECT_EQ(s->setOutOfService(1), Status::CannotRemoveLastCar);
  EXPECT_FALSE(s->stateOf(1) == CarState::OutOfService);
  auto single = elev::makeServiceableElevators(10, 1);
  EXPECT_EQ(single->setOutOfService(0), Status::CannotRemoveLastCar);
}

TEST(Service, RemovingTheSameCarTwiceIsHarmless) {
  auto s = elev::makeServiceableElevators(10, 2);
  EXPECT_EQ(s->setOutOfService(0), Status::Ok);
  EXPECT_EQ(s->setOutOfService(0), Status::Ok);
  EXPECT_EQ(s->setOutOfService(1), Status::CannotRemoveLastCar);
}

TEST(Service, UnknownCarsAreRefused) {
  auto s = elev::makeServiceableElevators(10, 2);
  EXPECT_EQ(s->setOutOfService(2), Status::UnknownElevator);
  EXPECT_EQ(s->returnToService(-1), Status::UnknownElevator);
}

TEST(Service, ACarReturnsIdleWhereItStopped) {
  auto s = elev::makeServiceableElevators(10, 2);
  sendTo(*s, 0, 3);
  s->setOutOfService(0);
  EXPECT_EQ(s->returnToService(0), Status::Ok);
  EXPECT_EQ(s->floorOf(0), 3);
  EXPECT_TRUE(s->stateOf(0) == CarState::Idle);
  EXPECT_EQ(s->requestPickup(2, Direction::Up), Status::Ok);
  EXPECT_TRUE(s->stopsOf(0) == Floors({2}));  // car 0 (at 3) is one floor away; car 1 (at 0) is two
}

TEST(Service, ReturningACarThatIsInServiceChangesNothing) {
  auto s = elev::makeServiceableElevators(10, 2);
  s->selectFloor(0, 5);
  EXPECT_EQ(s->returnToService(0), Status::Ok);
  EXPECT_TRUE(s->stopsOf(0) == Floors({5}));
}

TEST(Service, BaseBehaviourIsUnchanged) {
  auto s = elev::makeServiceableElevators(10, 1);
  s->selectFloor(0, 2);
  stepTimes(*s, 2);
  EXPECT_TRUE(s->stateOf(0) == CarState::DoorsOpen);
}
