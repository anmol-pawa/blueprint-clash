#pragma once
// Change Storm 1: time in force.
#include "api.h"

namespace book {

// How long an order may wait for a trade. makeTimedBook() is exactly makeBook() when every order is Gtc.
enum class TimeInForce {
  Gtc,  // good till cancelled: today's behaviour, the remainder rests
  Ioc,  // immediate or cancel: trade what you can now; the remainder is dropped and never rests
  Fok,  // fill or kill: trade the WHOLE quantity now or do nothing at all (no fills, nothing changes, still Ok)
};

class TimedBook : public Book {
 public:
  // Same checks and answers as Book::submit. An Ioc or Fok order is still accepted (its id is used for good) even when it
  // trades nothing. An Fok order sees only orders it could really trade with: price limit respected, own side ignored.
  virtual Status submitWith(int id, Side side, int price, int quantity, TimeInForce tif, std::vector<Fill>& fills) = 0;
};

std::unique_ptr<TimedBook> makeTimedBook();

}  // namespace book
