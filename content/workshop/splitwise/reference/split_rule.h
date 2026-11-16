#pragma once
#include <cstddef>
#include <map>
#include <memory>
#include <vector>

#include "api_storm2.h"
#include "apportioner.h"

// One way of turning "an amount and some people" into "what each person owes". A new way is a new class.
class SplitRule {
 public:
  virtual ~SplitRule() = default;
  // Do the numbers in `parts` describe a valid split of `cents`?
  virtual bool accepts(long long cents, const std::vector<split::Part>& parts) const = 0;
  // What each part owes, in the same order. Only called when accepts() said yes; the shares add up to `cents`.
  virtual std::vector<long long> shares(long long cents, const std::vector<split::Part>& parts) const = 0;
};

namespace split_rules {
inline std::vector<long long> values(const std::vector<split::Part>& parts) {
  std::vector<long long> out;
  for (const auto& part : parts) out.push_back(part.value);
  return out;
}
inline long long total(const std::vector<split::Part>& parts) {
  long long sum = 0;
  for (const auto& part : parts) sum += part.value;
  return sum;
}
}  // namespace split_rules

class EqualSplit : public SplitRule {
 public:
  bool accepts(long long, const std::vector<split::Part>&) const override { return true; }
  std::vector<long long> shares(long long cents, const std::vector<split::Part>& parts) const override {
    return Apportioner().divide(cents, std::vector<long long>(parts.size(), 1));
  }
};

class ExactSplit : public SplitRule {
 public:
  bool accepts(long long cents, const std::vector<split::Part>& parts) const override {
    for (const auto& part : parts) {
      if (part.value < 0) return false;
    }
    return split_rules::total(parts) == cents;
  }
  std::vector<long long> shares(long long, const std::vector<split::Part>& parts) const override {
    return split_rules::values(parts);
  }
};

class PercentSplit : public SplitRule {
 public:
  bool accepts(long long, const std::vector<split::Part>& parts) const override {
    for (const auto& part : parts) {
      if (part.value < 0) return false;
    }
    return split_rules::total(parts) == 10000;
  }
  std::vector<long long> shares(long long cents, const std::vector<split::Part>& parts) const override {
    return Apportioner().divide(cents, split_rules::values(parts));
  }
};

class SharesSplit : public SplitRule {
 public:
  bool accepts(long long, const std::vector<split::Part>& parts) const override {
    for (const auto& part : parts) {
      if (part.value <= 0) return false;
    }
    return true;
  }
  std::vector<long long> shares(long long cents, const std::vector<split::Part>& parts) const override {
    return Apportioner().divide(cents, split_rules::values(parts));
  }
};

// Finds the rule for a kind. Adding a kind means adding a class and one line here.
class SplitRules {
 public:
  SplitRules() {
    rules_[split::SplitKind::Equal] = std::make_unique<EqualSplit>();
    rules_[split::SplitKind::Exact] = std::make_unique<ExactSplit>();
    rules_[split::SplitKind::Percent] = std::make_unique<PercentSplit>();
    rules_[split::SplitKind::Shares] = std::make_unique<SharesSplit>();
  }
  const SplitRule& of(split::SplitKind kind) const {
    const auto found = rules_.find(kind);
    return found != rules_.end() ? *found->second : *rules_.at(split::SplitKind::Equal);
  }

 private:
  std::map<split::SplitKind, std::unique_ptr<SplitRule>> rules_;
};
