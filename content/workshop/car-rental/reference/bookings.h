#pragma once
#include <map>
#include <string>

#include "time_span.h"

struct Booking {
  std::string customer;
  std::string category;
  TimeSpan span;
  rental::Money total;
  std::string plate;  // empty until the car is collected
};

inline bool isCollected(const Booking& booking) { return !booking.plate.empty(); }

// The records of promises: who holds which reservation. Issues ids and spends them: a removed record looks never issued.
class Bookings {
 public:
  rental::ReservationId add(Booking booking) {
    const rental::ReservationId id = ++lastId_;
    records_.emplace(id, std::move(booking));
    return id;
  }
  Booking* find(rental::ReservationId id) {
    const auto it = records_.find(id);
    return it == records_.end() ? nullptr : &it->second;
  }
  void remove(rental::ReservationId id) { records_.erase(id); }

 private:
  rental::ReservationId lastId_ = rental::kNoReservation;
  std::map<rental::ReservationId, Booking> records_;
};
