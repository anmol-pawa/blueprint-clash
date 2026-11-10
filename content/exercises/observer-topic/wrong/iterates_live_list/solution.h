#pragma once
#include <algorithm>
#include <cstddef>
#include <memory>
#include <string>
#include <vector>
#include "api.h"

// The subject. It observes its listeners through weak_ptr, so it never owns or outlives them.
class Topic {
 public:
  void subscribe(const std::shared_ptr<Listener>& listener) {
    if (!listener || contains(listener.get())) return;
    listeners_.push_back(listener);
  }

  void unsubscribe(const Listener& listener) {
    listeners_.erase(std::remove_if(listeners_.begin(), listeners_.end(),
                                    [&listener](const std::weak_ptr<Listener>& w) {
                                      const auto alive = w.lock();
                                      return !alive || alive.get() == &listener;
                                    }),
                     listeners_.end());
  }

  std::size_t publish(const std::string& message) {
    // Walk a snapshot: a listener may (un)subscribe from inside onMessage.
    const std::vector<std::weak_ptr<Listener>>& snapshot = listeners_;
    std::size_t delivered = 0;
    for (const auto& weak : snapshot) {
      if (const auto listener = weak.lock()) {
        listener->onMessage(message);
        ++delivered;
      }
    }
    pruneExpired();
    return delivered;
  }

  std::size_t subscriberCount() {
    pruneExpired();
    return listeners_.size();
  }

 private:
  bool contains(const Listener* target) const {
    return std::any_of(listeners_.begin(), listeners_.end(), [target](const std::weak_ptr<Listener>& w) {
      return w.lock().get() == target;
    });
  }

  void pruneExpired() {
    listeners_.erase(std::remove_if(listeners_.begin(), listeners_.end(),
                                    [](const std::weak_ptr<Listener>& w) { return w.expired(); }),
                     listeners_.end());
  }

  std::vector<std::weak_ptr<Listener>> listeners_;
};
