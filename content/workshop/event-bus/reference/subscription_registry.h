#pragma once
#include <algorithm>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "subscription.h"

// Owns the subscriptions and the id counter. Decides who is interested in a topic and in which order they are called.
class SubscriptionRegistry {
 public:
  std::shared_ptr<Subscription> add(TopicPattern pattern, bus::Handler handler, bus::Options options) {
    auto subscription = std::make_shared<Subscription>(nextId_++, std::move(pattern), std::move(handler), options);
    items_.push_back(subscription);
    return subscription;
  }

  bool remove(int id) {
    const auto it = std::find_if(items_.begin(), items_.end(), [id](const auto& item) { return item->id() == id; });
    if (it == items_.end()) return false;
    (*it)->deactivate();
    items_.erase(it);
    return true;
  }

  int size() const { return static_cast<int>(items_.size()); }

  // A snapshot, in delivery order: highest priority first, equal priorities in subscription order.
  std::vector<std::shared_ptr<Subscription>> matching(const std::string& topic) const {
    std::vector<std::shared_ptr<Subscription>> result;
    for (const auto& item : items_) {
      if (item->matches(topic)) result.push_back(item);
    }
    std::stable_sort(result.begin(), result.end(), [](const auto& a, const auto& b) { return a->priority() > b->priority(); });
    return result;
  }

 private:
  int nextId_ = 1;
  std::vector<std::shared_ptr<Subscription>> items_;
};
