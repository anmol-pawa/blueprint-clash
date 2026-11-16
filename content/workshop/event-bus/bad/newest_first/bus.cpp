// Bad design: Handlers are called newest subscription first.
#include <algorithm>
#include <cstddef>
#include <functional>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"

namespace {
using namespace evb;

bool splitTopic(const std::string& text, std::vector<std::string>* parts) {
  parts->clear();
  std::size_t start = 0;
  while (true) {
    const std::size_t dot = text.find('.', start);
    const std::string part = text.substr(start, dot == std::string::npos ? std::string::npos : dot - start);
    if (part.empty()) return false;
    parts->push_back(part);
    if (dot == std::string::npos) return true;
    start = dot + 1;
  }
}

bool matchFrom(const std::vector<std::string>& p, std::size_t pi, const std::vector<std::string>& t, std::size_t ti) {
  if (pi == p.size()) return ti == t.size();
  if (p[pi] == "#") {
    return true;
  }
  if (ti == t.size()) return false;
  if (p[pi] == "*") {
    return matchFrom(p, pi + 1, t, ti + 1);
  }
  if (p[pi] != t[ti]) return false;
  return matchFrom(p, pi + 1, t, ti + 1);
}

bool hasWildcard(const std::string& pattern) { return pattern.find('*') != std::string::npos || pattern.find('#') != std::string::npos; }

struct Sub {
  SubscriptionId id;
  std::string pattern;
  Handler handler;
  Filter filter;
  bool active;
};

class BusImpl : public FilteredBus {
 public:
  explicit BusImpl(bool hierarchical) : hierarchical_(hierarchical) {}

  SubscriptionId subscribe(const std::string& topic, Handler handler) override { return add(topic, std::move(handler), nullptr); }

  SubscriptionId subscribe(const std::string& topic, Handler handler, Filter filter) override {
    
    return add(topic, std::move(handler), std::move(filter));
  }

  SubscriptionId add(const std::string& topic, Handler handler, Filter filter) {
    if (!handler || !validPattern(topic)) return kInvalid;
    const SubscriptionId id = ++lastId_;
    subs_.push_back(std::make_shared<Sub>(Sub{id, topic, std::move(handler), std::move(filter), true}));
    return id;
  }

  bool unsubscribe(SubscriptionId id) override {
    for (auto it = subs_.begin(); it != subs_.end(); ++it) {
      if ((*it)->id == id) {
        (*it)->active = false;
        subs_.erase(it);
        return true;
      }
    }
    return false;
  }

  std::size_t publish(const std::string& topic, const std::string& payload) override {
    if (!validTopic(topic)) return 0;
    const Event event{topic, payload};
    return deliver(event);
  }

 private:
  bool validPattern(const std::string& pattern) const {
    if (!hierarchical_) return !pattern.empty();
    std::vector<std::string> parts;
    if (!splitTopic(pattern, &parts)) return false;
    for (std::size_t i = 0; i + 1 < parts.size(); ++i) {
      if (parts[i] == "#") return false;
    }
    return true;
  }

  bool validTopic(const std::string& topic) const {
    if (!hierarchical_) return !topic.empty();
    std::vector<std::string> parts;
    if (!splitTopic(topic, &parts)) return false;
    for (const auto& part : parts) {
      if (part == "*" || part == "#") return false;
    }
    return true;
  }

  bool matches(const std::string& pattern, const std::string& topic) const {
    if (!hierarchical_) { return pattern == topic; }
    std::vector<std::string> p;
    std::vector<std::string> t;
    if (!splitTopic(pattern, &p) || !splitTopic(topic, &t)) return false;
    return matchFrom(p, 0, t, 0);
  }

  std::size_t deliver(const Event& event) {
    std::vector<std::shared_ptr<Sub>> order = subs_;
    std::reverse(order.begin(), order.end());
    std::size_t count = 0;
    std::size_t promised = 0;
    for (const auto& sub : order) {
      if (matches(sub->pattern, event.topic)) ++promised;
    }
    for (const auto& sub : order) {
      if (!sub->active) continue;
      if (!matches(sub->pattern, event.topic)) continue;
      if (sub->filter && !sub->filter(event)) continue;
      sub->handler(event);
      ++count;
    }
    return count;
  }

  bool hierarchical_;
  SubscriptionId lastId_ = 0;
  std::vector<std::shared_ptr<Sub>> subs_;
  bool delivering_ = false;
  std::vector<Event> pending_;
};
}  // namespace

std::unique_ptr<evb::EventBus> evb::makeBus() { return std::make_unique<BusImpl>(false); }
std::unique_ptr<evb::EventBus> evb::makeHierarchicalBus() { return std::make_unique<BusImpl>(true); }
std::unique_ptr<evb::FilteredBus> evb::makeFilteredBus() { return std::make_unique<BusImpl>(true); }
