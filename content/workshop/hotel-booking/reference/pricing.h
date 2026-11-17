#pragma once
#include <map>
#include <optional>
#include <string>
#include <vector>

#include "stay_range.h"

// One source of nightly prices. Rules are asked in priority order; the first one with an answer decides.
class RateRule {
 public:
  virtual ~RateRule() = default;
  virtual std::optional<hotel::Money> rateFor(const std::string& type, long long night) const = 0;
};

// The normal rate of each room type, set when the type is added.
class BaseRates : public RateRule {
 public:
  void set(const std::string& type, hotel::Money rate) { rates_[type] = rate; }
  std::optional<hotel::Money> rateFor(const std::string& type, long long) const override {
    const auto it = rates_.find(type);
    if (it == rates_.end()) return std::nullopt;
    return it->second;
  }

 private:
  std::map<std::string, hotel::Money> rates_;
};

// Seasonal overrides. The season added last wins where seasons overlap, so the list is searched newest first.
class SeasonRates : public RateRule {
 public:
  void add(const std::string& type, long long fromDay, long long toDay, hotel::Money rate) {
    seasons_.push_back(Season{type, fromDay, toDay, rate});
  }

  std::optional<hotel::Money> rateFor(const std::string& type, long long night) const override {
    for (auto it = seasons_.rbegin(); it != seasons_.rend(); ++it) {
      if (it->type == type && night >= it->from && night < it->to) return it->rate;
    }
    return std::nullopt;
  }

 private:
  struct Season {
    std::string type;
    long long from;
    long long to;
    hotel::Money rate;
  };
  std::vector<Season> seasons_;
};

// The price of a stay: the nights' rates added up. Booking and quoting both call total(), so they cannot disagree.
class Pricing {
 public:
  void setBase(const std::string& type, hotel::Money rate) { base_.set(type, rate); }
  void addSeason(const std::string& type, long long from, long long to, hotel::Money rate) {
    seasons_.add(type, from, to, rate);
  }

  hotel::Money total(const std::string& type, const StayRange& stay) const {
    hotel::Money sum = 0;
    for (long long night = stay.firstNight(); night < stay.endDay(); ++night) sum += nightly(type, night);
    return sum;
  }

 private:
  hotel::Money nightly(const std::string& type, long long night) const {
    const std::optional<hotel::Money> seasonal = seasons_.rateFor(type, night);
    return seasonal.has_value() ? *seasonal : *base_.rateFor(type, night);
  }

  BaseRates base_;
  SeasonRates seasons_;
};
