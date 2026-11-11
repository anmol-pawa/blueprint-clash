#include <vector>

#include "api.h"
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

// Steps until nothing is pending and every car has stopped moving.
void settle(elev::ElevatorSystem& s) {
  for (int i = 0; i < 200 && !allQuiet(s); ++i) s.step();
}

void stepTimes(elev::ElevatorSystem& s, int n) {
  for (int i = 0; i < n; ++i) s.step();
}

// Runs until the car has nothing left to do and returns the floors where its doors opened, in order.
Floors doorOpenings(elev::ElevatorSystem& s, int car) {
  Floors opened;
  for (int i = 0; i < 200; ++i) {
    s.step();
    if (s.stateOf(car) == CarState::DoorsOpen) opened.push_back(s.floorOf(car));
    if (s.stopsOf(car).empty() && s.stateOf(car) == CarState::Idle) break;
  }
  return opened;
}

void sendTo(elev::ElevatorSystem& s, int car, int floor) {
  s.selectFloor(car, floor);
  settle(s);
}
}  // namespace

TEST(Setup, EveryCarStartsIdleAtTheGroundFloor) {
  auto s = elev::makeElevatorSystem(10, 3);
  EXPECT_EQ(s->floorCount(), 10);
  EXPECT_EQ(s->elevatorCount(), 3);
  for (int i = 0; i < 3; ++i) {
    EXPECT_EQ(s->floorOf(i), 0);
    EXPECT_TRUE(s->stateOf(i) == CarState::Idle);
    EXPECT_TRUE(s->stopsOf(i).empty());
  }
}

TEST(Validation, PickupChecksTheFloor) {
  auto s = elev::makeElevatorSystem(10, 2);
  EXPECT_EQ(s->requestPickup(-1, Direction::Up), Status::InvalidFloor);
  EXPECT_EQ(s->requestPickup(10, Direction::Down), Status::InvalidFloor);
  EXPECT_TRUE(s->stopsOf(0).empty());
  EXPECT_TRUE(s->stopsOf(1).empty());
}

TEST(Validation, PickupChecksTheDirectionAtTheEnds) {
  auto s = elev::makeElevatorSystem(10, 2);
  EXPECT_EQ(s->requestPickup(9, Direction::Up), Status::InvalidDirection);
  EXPECT_EQ(s->requestPickup(0, Direction::Down), Status::InvalidDirection);
  EXPECT_TRUE(s->stopsOf(0).empty());
  EXPECT_EQ(s->requestPickup(9, Direction::Down), Status::Ok);
  EXPECT_EQ(s->requestPickup(0, Direction::Up), Status::Ok);
}

TEST(Validation, SelectFloorChecksCarAndFloor) {
  auto s = elev::makeElevatorSystem(10, 2);
  EXPECT_EQ(s->selectFloor(-1, 3), Status::UnknownElevator);
  EXPECT_EQ(s->selectFloor(2, 3), Status::UnknownElevator);
  EXPECT_EQ(s->selectFloor(0, 10), Status::InvalidFloor);
  EXPECT_EQ(s->selectFloor(1, -1), Status::InvalidFloor);
  EXPECT_TRUE(s->stopsOf(0).empty());
  EXPECT_TRUE(s->stopsOf(1).empty());
  EXPECT_EQ(s->selectFloor(1, 9), Status::Ok);
  EXPECT_TRUE(s->stopsOf(1) == Floors({9}));
}

TEST(Dispatch, NearestCarAnswersAHallCall) {
  auto s = elev::makeElevatorSystem(12, 3);
  sendTo(*s, 1, 6);
  sendTo(*s, 2, 9);
  EXPECT_EQ(s->requestPickup(7, Direction::Down), Status::Ok);
  EXPECT_TRUE(s->stopsOf(1) == Floors({7}));
  EXPECT_TRUE(s->stopsOf(0).empty());
  EXPECT_TRUE(s->stopsOf(2).empty());
}

TEST(Dispatch, TiesGoToTheLowestId) {
  auto s = elev::makeElevatorSystem(12, 3);
  sendTo(*s, 0, 2);
  sendTo(*s, 1, 6);
  EXPECT_EQ(s->requestPickup(4, Direction::Up), Status::Ok);
  EXPECT_TRUE(s->stopsOf(0) == Floors({4}));
  EXPECT_TRUE(s->stopsOf(1).empty());
}

TEST(Dispatch, CarsAreRankedByPositionEvenWhenBusy) {
  auto s = elev::makeElevatorSystem(12, 2);
  s->requestPickup(3, Direction::Up);
  s->requestPickup(4, Direction::Up);
  EXPECT_TRUE(s->stopsOf(0) == Floors({3, 4}));
  EXPECT_TRUE(s->stopsOf(1).empty());
}

TEST(Movement, ACarMovesOneFloorPerStep) {
  auto s = elev::makeElevatorSystem(10, 1);
  s->selectFloor(0, 3);
  s->step();
  EXPECT_EQ(s->floorOf(0), 1);
  EXPECT_TRUE(s->stateOf(0) == CarState::MovingUp);
  s->step();
  EXPECT_EQ(s->floorOf(0), 2);
  EXPECT_TRUE(s->stopsOf(0) == Floors({3}));
}

TEST(Movement, AnIdleCarStaysPut) {
  auto s = elev::makeElevatorSystem(10, 2);
  stepTimes(*s, 5);
  EXPECT_EQ(s->floorOf(0), 0);
  EXPECT_EQ(s->floorOf(1), 0);
  EXPECT_TRUE(s->stateOf(0) == CarState::Idle);
}

TEST(Movement, CarsMoveIndependently) {
  auto s = elev::makeElevatorSystem(10, 2);
  s->selectFloor(0, 4);
  s->selectFloor(1, 2);
  stepTimes(*s, 2);
  EXPECT_EQ(s->floorOf(0), 2);
  EXPECT_EQ(s->floorOf(1), 2);
  EXPECT_TRUE(s->stateOf(1) == CarState::DoorsOpen);
  EXPECT_TRUE(s->stateOf(0) == CarState::MovingUp);
}

TEST(Movement, ACarGoesDownToo) {
  auto s = elev::makeElevatorSystem(10, 1);
  sendTo(*s, 0, 6);
  s->selectFloor(0, 2);
  s->step();
  EXPECT_EQ(s->floorOf(0), 5);
  EXPECT_TRUE(s->stateOf(0) == CarState::MovingDown);
}

TEST(Doors, ArrivalOpensTheDoorsOnTheSameTick) {
  auto s = elev::makeElevatorSystem(10, 1);
  s->selectFloor(0, 2);
  stepTimes(*s, 2);
  EXPECT_EQ(s->floorOf(0), 2);
  EXPECT_TRUE(s->stateOf(0) == CarState::DoorsOpen);
  EXPECT_TRUE(s->stopsOf(0).empty());
}

TEST(Doors, DoorsStayOpenForOneTickAndTheCarDoesNotMoveWhileClosing) {
  auto s = elev::makeElevatorSystem(10, 1);
  s->selectFloor(0, 2);
  s->selectFloor(0, 5);
  stepTimes(*s, 2);
  EXPECT_TRUE(s->stateOf(0) == CarState::DoorsOpen);
  s->step();
  EXPECT_EQ(s->floorOf(0), 2);
  EXPECT_TRUE(s->stateOf(0) == CarState::Idle);
  s->step();
  EXPECT_EQ(s->floorOf(0), 3);
  EXPECT_TRUE(s->stateOf(0) == CarState::MovingUp);
}

TEST(Doors, SelectingTheCurrentFloorOpensTheDoors) {
  auto s = elev::makeElevatorSystem(10, 1);
  EXPECT_EQ(s->selectFloor(0, 0), Status::Ok);
  s->step();
  EXPECT_EQ(s->floorOf(0), 0);
  EXPECT_TRUE(s->stateOf(0) == CarState::DoorsOpen);
  EXPECT_TRUE(s->stopsOf(0).empty());
}

TEST(Doors, AHallCallOnTheCarsFloorOpensTheDoors) {
  auto s = elev::makeElevatorSystem(10, 2);
  EXPECT_EQ(s->requestPickup(0, Direction::Up), Status::Ok);
  s->step();
  EXPECT_TRUE(s->stateOf(0) == CarState::DoorsOpen);
  EXPECT_TRUE(s->stateOf(1) == CarState::Idle);
}

TEST(Doors, ASharedFloorIsServedOnce) {
  auto s = elev::makeElevatorSystem(10, 1);
  s->requestPickup(3, Direction::Up);
  s->selectFloor(0, 3);
  s->selectFloor(0, 3);
  EXPECT_TRUE(s->stopsOf(0) == Floors({3}));
  Floors opened = doorOpenings(*s, 0);
  EXPECT_TRUE(opened == Floors({3}));
}

TEST(Sweep, StopsOnTheWayAreServedInFloorOrder) {
  auto s = elev::makeElevatorSystem(10, 1);
  s->selectFloor(0, 5);
  s->selectFloor(0, 3);
  EXPECT_TRUE(doorOpenings(*s, 0) == Floors({3, 5}));
}

TEST(Sweep, KeepsHeadingBeforeReversing) {
  auto s = elev::makeElevatorSystem(10, 1);
  s->selectFloor(0, 6);
  stepTimes(*s, 4);
  EXPECT_EQ(s->floorOf(0), 4);
  s->selectFloor(0, 3);  // behind the car, and nearer than 6
  s->selectFloor(0, 8);
  EXPECT_TRUE(doorOpenings(*s, 0) == Floors({6, 8, 3}));
}

TEST(Sweep, DownwardSweepKeepsHeadingToo) {
  auto s = elev::makeElevatorSystem(10, 1);
  sendTo(*s, 0, 8);
  s->selectFloor(0, 3);
  stepTimes(*s, 2);
  EXPECT_EQ(s->floorOf(0), 6);
  s->selectFloor(0, 7);  // behind, and nearer than 3
  s->selectFloor(0, 1);
  EXPECT_TRUE(doorOpenings(*s, 0) == Floors({3, 1, 7}));
}

TEST(Sweep, ReversesOnlyWhenNothingIsAhead) {
  auto s = elev::makeElevatorSystem(10, 1);
  sendTo(*s, 0, 4);
  s->selectFloor(0, 1);
  s->step();
  EXPECT_TRUE(s->stateOf(0) == CarState::MovingDown);
  EXPECT_EQ(s->floorOf(0), 3);
}

TEST(Sweep, HallCallsAreSweptLikeCabStops) {
  auto s = elev::makeElevatorSystem(10, 1);
  s->selectFloor(0, 7);
  stepTimes(*s, 2);
  s->requestPickup(5, Direction::Down);  // on the way up, served in passing
  EXPECT_TRUE(doorOpenings(*s, 0) == Floors({5, 7}));
}
