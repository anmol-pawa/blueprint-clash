#pragma once
#include <algorithm>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "fees.h"

// A way of taking money off the food. The delivery fee is never part of it.
class Discount {
 public:
  virtual ~Discount() = default;
  virtual food::Money amount(food::Money food) const = 0;
};

class PercentOff : public Discount {
 public:
  explicit PercentOff(int percent) : percent_(percent) {}
  food::Money amount(food::Money food) const override { return food * percent_ / kPercentDenominator; }

 private:
  int percent_;
};

class AmountOff : public Discount {
 public:
  explicit AmountOff(food::Money cents) : cents_(cents) {}
  food::Money amount(food::Money food) const override { return std::min(cents_, food); }

 private:
  food::Money cents_;
};

// One code: what it takes off, and the smallest food total it applies to.
struct PromoRule {
  std::unique_ptr<Discount> discount;
  food::Money minimumFood;
};

// The codes the system was built with. Invalid or repeated entries are skipped, so a bad configuration never
// produces a half-working code.
class PromoBook {
 public:
  PromoBook() = default;

  explicit PromoBook(const std::vector<food::Promo>& promos) {
    for (const food::Promo& promo : promos) {
      std::unique_ptr<Discount> discount = build(promo);
      if (discount == nullptr || promo.code.empty() || promo.minimumFood < 0) continue;
      rules_.emplace(promo.code, PromoRule{std::move(discount), promo.minimumFood});
    }
  }

  const PromoRule* find(const std::string& code) const {
    const auto found = rules_.find(code);
    return found == rules_.end() ? nullptr : &found->second;
  }

 private:
  static std::unique_ptr<Discount> build(const food::Promo& promo) {
    if (promo.kind == food::PromoKind::PercentOff) {
      if (promo.value < 1 || promo.value > kPercentDenominator) return nullptr;
      return std::make_unique<PercentOff>(promo.value);
    }
    if (promo.value < 1) return nullptr;
    return std::make_unique<AmountOff>(promo.value);
  }

  std::map<std::string, PromoRule> rules_;
};
