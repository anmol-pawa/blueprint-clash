#pragma once
#include <memory>
#include <utility>
#include <vector>

#include "dispatcher.h"

// Owns the cars and the dispatcher. Knows which cars may take work and moves hall calls between them.
class Fleet {
 public:
  Fleet(int cars, std::unique_ptr<Dispatcher> dispatcher) : dispatcher_(std::move(dispatcher)) {
    for (int i = 0; i < cars; ++i) cars_.push_back(std::make_unique<Car>(i));
  }

  int size() const { return static_cast<int>(cars_.size()); }
  bool has(int id) const { return id >= 0 && id < size(); }
  Car& at(int id) { return *cars_[id]; }
  const Car& at(int id) const { return *cars_[id]; }

  void assignHallCall(int floor) { dispatcher_->choose(inService(), floor)->stops().addHall(floor); }

  void stepAll() {
    for (auto& car : cars_) car->step();
  }

  int inServiceCount() const { return static_cast<int>(inService().size()); }

  // Retire the car first, then re-dispatch its hall calls so it cannot be chosen again.
  void takeOutOfService(int id) {
    Car& car = at(id);
    car.goOutOfService();
    car.stops().dropCabin();
    for (int floor : car.stops().takeHall()) assignHallCall(floor);
  }

  void returnToService(int id) {
    if (!at(id).inService()) at(id).goIdle();
  }

 private:
  std::vector<Car*> inService() const {
    std::vector<Car*> result;
    for (const auto& car : cars_) {
      if (car->inService()) result.push_back(car.get());
    }
    return result;
  }

  std::vector<std::unique_ptr<Car>> cars_;
  std::unique_ptr<Dispatcher> dispatcher_;
};
