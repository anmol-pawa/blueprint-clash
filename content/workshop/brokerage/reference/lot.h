#pragma once
#include <deque>

#include "api.h"

// One purchase still (partly) held: how many shares remain and what those shares cost, commission included.
class Lot {
 public:
  Lot(long long shares, long long cost) : shares_(shares), cost_(cost) {}

  long long shares() const { return shares_; }
  long long cost() const { return cost_; }

  // Gives up `count` shares (at most shares()) and returns the cost that went with them. A part of a lot takes its share of
  // the cost rounded down; the last shares take whatever is left, so the cents always add up.
  long long take(long long count) {
    const long long given = count == shares_ ? cost_ : cost_ * count / shares_;
    shares_ -= count;
    cost_ -= given;
    return given;
  }

  void multiplyShares(int factor) { shares_ *= factor; }

 private:
  long long shares_;
  long long cost_;
};

// Everything one account holds of one symbol, as lots in the order they were bought.
class Position {
 public:
  void add(const Lot& lot) { lots_.push_back(lot); }

  long long shares() const {
    long long total = 0;
    for (const Lot& lot : lots_) total += lot.shares();
    return total;
  }

  long long cost() const {
    long long total = 0;
    for (const Lot& lot : lots_) total += lot.cost();
    return total;
  }

  // First in, first out. The caller has checked that `count` shares are held. Returns the cost of the shares sold.
  long long sellFifo(long long count) {
    long long cost = 0;
    while (count > 0) {
      Lot& oldest = lots_.front();
      const long long used = oldest.shares() < count ? oldest.shares() : count;
      cost += oldest.take(used);
      count -= used;
      if (oldest.shares() == 0) lots_.pop_front();
    }
    return cost;
  }

  void split(int factor) {
    for (Lot& lot : lots_) lot.multiplyShares(factor);
  }

  bool empty() const { return lots_.empty(); }

 private:
  std::deque<Lot> lots_;
};
