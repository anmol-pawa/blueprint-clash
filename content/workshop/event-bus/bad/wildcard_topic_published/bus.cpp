// Bad design: a published topic containing wildcards is matched like any other.
#include <algorithm>
#include <cstddef>
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"

namespace {

bool isWildcard(const std::string& segment) { return segment == "*" || segment == "#"; }

bool validSegment(const std::string& segment) {
  if (isWildcard(segment)) return true;
  return !segment.empty() && segment.find_first_of("*#") == std::string::npos;
}

std::optional<std::vector<std::string>> split(const std::string& text) {
  if (text.empty()) return std::nullopt;
  std::vector<std::string> parts;
  std::size_t start = 0;
  while (true) {
    const std::size_t dot = text.find('.', start);
    parts.push_back(text.substr(start, dot == std::string::npos ? std::string::npos : dot - start));
    if (dot == std::string::npos) break;
    start = dot + 1;
  }
  for (const auto& part : parts) {
    if (!validSegment(part)) return std::nullopt;
  }
  return parts;
}

class TopicPattern {
 public:
  static std::optional<TopicPattern> parse(const std::string& text) {
    auto parts = split(text);
    if (!parts) return std::nullopt;
    for (std::size_t i = 0; i + 1 < parts->size(); ++i) {
      if ((*parts)[i] == "#") return std::nullopt;
    }
    return TopicPattern(std::move(*parts));
  }

  bool exact() const { return !std::any_of(segments_.begin(), segments_.end(), isWildcard); }

  bool matches(const std::string& topic) const {
    const auto words = split(topic);
    if (!words) return false;
    for (std::size_t i = 0; i < segments_.size(); ++i) {
      if (segments_[i] == "#") return words->size() > i;
      if (i >= words->size()) return false;
      if (segments_[i] != "*" && segments_[i] != (*words)[i]) return false;
    }
    return words->size() == segments_.size();
  }

 private:
  explicit TopicPattern(std::vector<std::string> segments) : segments_(std::move(segments)) {}
  std::vector<std::string> segments_;
};

class Subscription {
 public:
  Subscription(int id, TopicPattern pattern, bus::Handler handler, bus::Options options)
      : id_(id), pattern_(std::move(pattern)), handler_(std::move(handler)), options_(options) {}

  int id() const { return id_; }
  int priority() const { return options_.priority; }
  bool once() const { return options_.once; }
  bool exact() const { return pattern_.exact(); }
  bool active() const { return active_; }
  void deactivate() { active_ = false; }
  bool matches(const std::string& topic) const { return pattern_.matches(topic); }
  void deliver(const bus::Event& event) const { handler_(event); }

 private:
  int id_;
  TopicPattern pattern_;
  bus::Handler handler_;
  bus::Options options_;
  bool active_ = true;
};

class Hub {
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

  int dispatch(const bus::Event& event) {
    const auto snapshot = matching(event.topic);
    int delivered = 0;
    for (const auto& subscription : snapshot) {
      if (!subscription->active()) continue;
      if (subscription->once()) remove(subscription->id());
      subscription->deliver(event);
      ++delivered;
    }
    return delivered;
  }

 private:
  std::vector<std::shared_ptr<Subscription>> matching(const std::string& topic) const {
    std::vector<std::shared_ptr<Subscription>> result;
    for (const auto& item : items_) {
      if (item->matches(topic)) result.push_back(item);
    }
    std::stable_sort(result.begin(), result.end(), [](const auto& a, const auto& b) { return a->priority() > b->priority(); });
    return result;
  }

  int nextId_ = 1;
  std::vector<std::shared_ptr<Subscription>> items_;
};

class BusImpl : public bus::OrderedBus {
 public:
  int subscribe(const std::string& topic, bus::Handler handler) override {
    return subscribe(topic, std::move(handler), bus::Options{});
  }

  int subscribe(const std::string& pattern, bus::Handler handler, bus::Options options) override {
    if (!handler) return bus::kRefused;
    auto parsed = TopicPattern::parse(pattern);
    if (!parsed) return bus::kRefused;
    return hub_.add(std::move(*parsed), std::move(handler), options)->id();
  }

  bool unsubscribe(int id) override { return hub_.remove(id); }

  int publish(const bus::Event& event) override { return hub_.dispatch(event); }

  int subscriptionCount() const override { return hub_.size(); }

 private:
  Hub hub_;
};

}  // namespace

std::unique_ptr<bus::EventBus> bus::makeBus() { return std::make_unique<BusImpl>(); }

std::unique_ptr<bus::EventBus> bus::makePatternBus() { return std::make_unique<BusImpl>(); }

std::unique_ptr<bus::OrderedBus> bus::makeOrderedBus() { return std::make_unique<BusImpl>(); }
