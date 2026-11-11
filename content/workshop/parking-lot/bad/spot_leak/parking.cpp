// leave() closes the ticket but forgets to free the spot.
#include <map>
#include <set>

#include "api_storm1.h"

namespace {
using namespace park;

class Lot : public ParkingLot {
 public:
  Status addSpot(const std::string& id, SpotSize size) override {
    if (sizes_.count(id)) return Status::DuplicateId;
    sizes_[id] = size;
    return Status::Ok;
  }
  Ticket park(const std::string& plate, Vehicle v) override {
    if (plates_.count(plate)) return {Status::AlreadyParked, "", ""};
    const std::string* pick = nullptr;
    for (const auto& [id, size] : sizes_) {
      if (taken_.count(id)) continue;
      if (!(static_cast<int>(size) >= static_cast<int>(v))) continue;
      if (pick == nullptr || size < sizes_.at(*pick)) pick = &id;
    }
    if (pick != nullptr) {
      const std::string id = *pick;
      taken_.insert(id);
      std::string t = "T" + std::to_string(++n_);
      tickets_[t] = {plate, v, id};
      plates_[plate] = id;
      return {Status::Ok, t, id};
    }
    return {Status::LotFull, "", ""};
  }
  Receipt leave(const std::string& t, int minutes) override {
    auto it = tickets_.find(t);
    if (it == tickets_.end()) return {Status::NoSuchTicket, 0, ""};
    Stay s = it->second;
    tickets_.erase(it);
    plates_.erase(s.plate);
    
    long long fee = 100LL * (minutes <= 60 ? 1 : (minutes + 59) / 60);
    return {Status::Ok, fee, s.spot};
  }
  int freeSpots(SpotSize size) const override {
    int n = 0;
    for (const auto& [id, sz] : sizes_) n += (sz == size && !taken_.count(id)) ? 1 : 0;
    return n;
  }
  std::string spotOf(const std::string& plate) const override {
    auto it = plates_.find(plate);
    return it == plates_.end() ? "" : it->second;
  }

 private:
  struct Stay { std::string plate; Vehicle vehicle; std::string spot; };
  std::map<std::string, SpotSize> sizes_;
  std::set<std::string> taken_;
  std::map<std::string, Stay> tickets_;
  std::map<std::string, std::string> plates_;
  int n_ = 0;
};
}  // namespace

std::unique_ptr<park::ParkingLot> park::makeParkingLot() { return std::make_unique<Lot>(); }
std::unique_ptr<park::ParkingLot> park::makePricedParkingLot() { return std::make_unique<Lot>(); }
