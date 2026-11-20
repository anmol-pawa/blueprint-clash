#pragma once
#include <memory>

#include "matcher.h"

// What an order does when it meets the book: may it start trading, and does the rest wait? One small class per rule.
class Disposition {
 public:
  virtual ~Disposition() = default;
  virtual bool mayTrade(const Matcher& matcher, const Order& order) const = 0;
  virtual bool restsRemainder() const = 0;
};

class GoodTillCancelled : public Disposition {
 public:
  bool mayTrade(const Matcher&, const Order&) const override { return true; }
  bool restsRemainder() const override { return true; }
};

class ImmediateOrCancel : public Disposition {
 public:
  bool mayTrade(const Matcher&, const Order&) const override { return true; }
  bool restsRemainder() const override { return false; }
};

class FillOrKill : public Disposition {
 public:
  bool mayTrade(const Matcher& matcher, const Order& order) const override {
    return matcher.available(order) >= order.remaining();
  }
  bool restsRemainder() const override { return false; }
};

class Dispositions {
 public:
  static const Disposition& of(book::TimeInForce tif) {
    static const GoodTillCancelled gtc;
    static const ImmediateOrCancel ioc;
    static const FillOrKill fok;
    switch (tif) {
      case book::TimeInForce::Ioc: return ioc;
      case book::TimeInForce::Fok: return fok;
      case book::TimeInForce::Gtc: break;
    }
    return gtc;
  }
};
