#pragma once
#include <map>
#include <string>

#include "api.h"

// Owns the spots and which of them are taken. The only place occupancy changes.
class SpotInventory {
 public:
  bool add(const std::string& id, park::SpotSize size) { return spots_.emplace(id, Spot{size, false}).second; }

  // Takes the smallest free spot that fits the vehicle (ties: lowest id). Returns its id, or "" if none fits.
  std::string occupyBestFit(park::Vehicle vehicle) {
    Spot* best = nullptr;
    std::string bestId;
    for (auto& [id, spot] : spots_) {  // std::map iterates in id order, so ties keep the lowest id
      if (spot.taken || !fits(vehicle, spot.size)) continue;
      if (best == nullptr || spot.size < best->size) {
        best = &spot;
        bestId = id;
      }
    }
    if (best == nullptr) return "";
    best->taken = true;
    return bestId;
  }

  // Precondition: the spot exists and is taken.
  void release(const std::string& id) { spots_.at(id).taken = false; }

  int freeCount(park::SpotSize size) const {
    int n = 0;
    for (const auto& [id, spot] : spots_) n += (spot.size == size && !spot.taken) ? 1 : 0;
    return n;
  }

 private:
  struct Spot {
    park::SpotSize size;
    bool taken;
  };

  // Both enums are ordered smallest first, so "fits" is a comparison of ranks: a motorcycle needs
  // at least Small, a car at least Medium, a truck Large.
  static bool fits(park::Vehicle vehicle, park::SpotSize size) {
    return static_cast<int>(size) >= static_cast<int>(vehicle);
  }

  std::map<std::string, Spot> spots_;
};
