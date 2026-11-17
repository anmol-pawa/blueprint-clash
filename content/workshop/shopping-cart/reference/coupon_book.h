#pragma once
#include <algorithm>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "discounts.h"

// Which coupons exist and which are attached to whose cart, in the order they were attached.
class CouponBook {
 public:
  bool add(const std::string& code, std::unique_ptr<Discount> discount, bool stackable) {
    if (code.empty() || discount == nullptr) return false;
    return byCode_.emplace(code, Entry{std::move(discount), stackable}).second;
  }

  bool has(const std::string& code) const { return byCode_.count(code) > 0; }

  // Precondition: has(code). An ordinary coupon replaces everything; a stackable one joins the stackable ones and
  // pushes out an ordinary one.
  void apply(const std::string& customer, const std::string& code) {
    auto& attached = attached_[customer];
    if (!byCode_.at(code).stackable) {
      attached.assign(1, code);
      return;
    }
    attached.erase(std::remove_if(attached.begin(), attached.end(),
                                  [this](const std::string& c) { return !byCode_.at(c).stackable; }),
                   attached.end());
    if (std::find(attached.begin(), attached.end(), code) == attached.end()) attached.push_back(code);
  }

  void clear(const std::string& customer) { attached_.erase(customer); }

  std::vector<const Discount*> attachedTo(const std::string& customer) const {
    std::vector<const Discount*> out;
    const auto it = attached_.find(customer);
    if (it == attached_.end()) return out;
    for (const std::string& code : it->second) out.push_back(byCode_.at(code).discount.get());
    return out;
  }

 private:
  struct Entry {
    std::unique_ptr<Discount> discount;
    bool stackable;
  };
  std::map<std::string, Entry> byCode_;
  std::map<std::string, std::vector<std::string>> attached_;
};
