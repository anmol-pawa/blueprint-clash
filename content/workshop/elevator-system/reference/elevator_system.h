#pragma once
#include "api_storm1.h"
#include "fleet.h"
#include "modes.h"

// The public face: validates input, then hands the work to the fleet.
class ElevatorSystemImpl : public elev::ServiceableElevators {
 public:
  ElevatorSystemImpl(int floors, int elevators)
      : floors_(floors), fleet_(elevators, std::make_unique<NearestCarDispatcher>()) {}

  elev::Status requestPickup(int floor, elev::Direction direction) override {
    if (!validFloor(floor)) return elev::Status::InvalidFloor;
    if (direction == elev::Direction::Up && floor == floors_ - 1) return elev::Status::InvalidDirection;
    if (direction == elev::Direction::Down && floor == 0) return elev::Status::InvalidDirection;
    fleet_.assignHallCall(floor);
    return elev::Status::Ok;
  }

  elev::Status selectFloor(int elevator, int floor) override {
    if (!fleet_.has(elevator)) return elev::Status::UnknownElevator;
    if (!validFloor(floor)) return elev::Status::InvalidFloor;
    if (!fleet_.at(elevator).inService()) return elev::Status::OutOfService;
    fleet_.at(elevator).stops().addCabin(floor);
    return elev::Status::Ok;
  }

  void step() override { fleet_.stepAll(); }

  int elevatorCount() const override { return fleet_.size(); }
  int floorCount() const override { return floors_; }
  int floorOf(int elevator) const override { return fleet_.has(elevator) ? fleet_.at(elevator).floor() : -1; }
  elev::CarState stateOf(int elevator) const override {
    return fleet_.has(elevator) ? fleet_.at(elevator).report() : elev::CarState::Idle;
  }
  std::vector<int> stopsOf(int elevator) const override {
    return fleet_.has(elevator) ? fleet_.at(elevator).stops().all() : std::vector<int>();
  }

  elev::Status setOutOfService(int elevator) override {
    if (!fleet_.has(elevator)) return elev::Status::UnknownElevator;
    if (!fleet_.at(elevator).inService()) return elev::Status::Ok;
    if (fleet_.inServiceCount() == 1) return elev::Status::CannotRemoveLastCar;
    fleet_.takeOutOfService(elevator);
    return elev::Status::Ok;
  }

  elev::Status returnToService(int elevator) override {
    if (!fleet_.has(elevator)) return elev::Status::UnknownElevator;
    fleet_.returnToService(elevator);
    return elev::Status::Ok;
  }

 private:
  bool validFloor(int floor) const { return floor >= 0 && floor < floors_; }

  int floors_;
  Fleet fleet_;
};
