#pragma once
#include <optional>
#include <string>
#include <vector>

#include "roster.h"

// How a driver is chosen for a pickup. The roster decides who is free; the matcher only ranks them.
class Matcher {
 public:
  virtual ~Matcher() = default;
  virtual std::optional<std::string> pick(const std::vector<Candidate>& candidates, ride::Point pickup) const = 0;
};

// The nearest driver within the pickup limit; equal distances go to the lowest name.
class NearestMatcher : public Matcher {
 public:
  std::optional<std::string> pick(const std::vector<Candidate>& candidates, ride::Point pickup) const override {
    const Candidate* best = nullptr;
    int bestBlocks = 0;
    for (const Candidate& candidate : candidates) {
      const int blocks = blocksBetween(candidate.at, pickup);
      if (blocks > ride::kMaxPickupDistance) continue;
      if (best == nullptr || blocks < bestBlocks || (blocks == bestBlocks && candidate.name < best->name)) {
        best = &candidate;
        bestBlocks = blocks;
      }
    }
    if (best == nullptr) return std::nullopt;
    return best->name;
  }
};
