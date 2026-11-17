#pragma once
#include <map>
#include <string>
#include <utility>

#include "stay_range.h"

// A reservation as it was made. The total is fixed at booking time and never recomputed.
struct Reservation {
  std::string guest;
  std::string type;
  StayRange stay;
  hotel::Money total;
};

// Who holds which reservation. Ids are positive, increasing and never reused; cancelling removes the record, so
// "cancelled" and "never issued" look the same, as the API says.
class ReservationBook {
 public:
  hotel::ReservationId add(Reservation reservation) {
    const hotel::ReservationId id = nextId_++;
    records_.emplace(id, std::move(reservation));
    return id;
  }

  const Reservation* find(hotel::ReservationId id) const {
    const auto it = records_.find(id);
    return it == records_.end() ? nullptr : &it->second;
  }

  void remove(hotel::ReservationId id) { records_.erase(id); }

 private:
  hotel::ReservationId nextId_ = 1;
  std::map<hotel::ReservationId, Reservation> records_;
};
