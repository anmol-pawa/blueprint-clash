#pragma once
#include <algorithm>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "subscription.h"

// The registry of live subscriptions, in the order they were made. It hands out ids and gives a delivery a snapshot to
// walk: changes made while that walk is going on (a subscribe, an unsubscribe) cannot invalidate it.
class SubscriptionTable {
 public:
  using Entry = std::shared_ptr<Subscription>;

  evb::SubscriptionId add(std::string pattern, evb::Handler handler, evb::Filter filter) {
    const evb::SubscriptionId id = ++lastId_;
    entries_.push_back(std::make_shared<Subscription>(id, std::move(pattern), std::move(handler), std::move(filter)));
    return id;
  }

  // Cancels first, so a snapshot that already holds the entry skips it.
  bool remove(evb::SubscriptionId id) {
    const auto found = std::find_if(entries_.begin(), entries_.end(), [id](const Entry& entry) { return entry->id() == id; });
    if (found == entries_.end()) return false;
    (*found)->cancel();
    entries_.erase(found);
    return true;
  }

  std::vector<Entry> snapshot() const { return entries_; }

 private:
  evb::SubscriptionId lastId_ = evb::kInvalid;
  std::vector<Entry> entries_;
};
