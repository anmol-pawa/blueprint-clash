#pragma once
#include <map>
#include <optional>
#include <set>
#include <string>

#include "api.h"

// One vehicle's stay in the lot.
struct Stay {
  std::string plate;
  park::Vehicle vehicle;
  std::string spotId;
};

// Owns the open stays: which plates are inside and which ticket belongs to which stay.
class TicketBook {
 public:
  bool isInside(const std::string& plate) const { return byPlate_.count(plate) != 0; }

  std::string open(const Stay& stay) {
    std::string ticketId = "T" + std::to_string(++issued_);
    byPlate_[stay.plate] = ticketId;
    stays_.emplace(ticketId, stay);
    return ticketId;
  }

  // Closes the ticket and returns the stay; empty if the ticket is unknown or already used.
  std::optional<Stay> close(const std::string& ticketId) {
    auto it = stays_.find(ticketId);
    if (it == stays_.end()) return std::nullopt;
    Stay stay = it->second;
    byPlate_.erase(stay.plate);
    stays_.erase(it);
    return stay;
  }

  std::string spotOf(const std::string& plate) const {
    auto it = byPlate_.find(plate);
    return it == byPlate_.end() ? "" : stays_.at(it->second).spotId;
  }

 private:
  int issued_ = 0;
  std::map<std::string, Stay> stays_;          // ticket id -> stay
  std::map<std::string, std::string> byPlate_;  // plate -> ticket id
};
