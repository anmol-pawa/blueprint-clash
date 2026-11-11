#pragma once
#include <set>
#include <vector>

// The floors a car still has to visit, kept in two kinds because they have different fates when a car is
// retired: passengers' choices (cabin) die with the trip, hall calls must be handed on.
class StopList {
 public:
  void addCabin(int floor) { cabin_.insert(floor); }
  void addHall(int floor) { hall_.insert(floor); }
  bool empty() const { return cabin_.empty() && hall_.empty(); }
  bool has(int floor) const { return cabin_.count(floor) > 0 || hall_.count(floor) > 0; }

  // True if any stop lies strictly beyond `floor` in `direction` (+1 up, -1 down).
  bool anyBeyond(int floor, int direction) const {
    for (int f : all()) {
      if ((f - floor) * direction > 0) return true;
    }
    return false;
  }

  // Serving a floor clears it for both kinds of request.
  void serve(int floor) {
    cabin_.erase(floor);
    hall_.erase(floor);
  }

  std::vector<int> all() const {
    std::set<int> merged(cabin_);
    merged.insert(hall_.begin(), hall_.end());
    return std::vector<int>(merged.begin(), merged.end());
  }

  std::vector<int> takeHall() {
    std::vector<int> taken(hall_.begin(), hall_.end());
    hall_.clear();
    return taken;
  }
  void dropCabin() { cabin_.clear(); }

 private:
  std::set<int> cabin_;
  std::set<int> hall_;
};
