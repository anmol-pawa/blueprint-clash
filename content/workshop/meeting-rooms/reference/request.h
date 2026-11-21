#pragma once
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"
#include "span.h"

// One request to book: a first meeting plus how often it repeats. A single booking is a series of one.
class BookingRequest {
 public:
  BookingRequest(std::string id, Span first, int attendees, int every, int count)
      : id_(std::move(id)), first_(first), attendees_(attendees), every_(every), count_(count) {}

  const std::string& id() const { return id_; }
  int attendees() const { return attendees_; }

  bool wellFormed() const {
    if (id_.empty() || id_.size() > 32 || attendees_ < 1) return false;
    if (first_.start < 0 || first_.end <= first_.start) return false;
    if (count_ < 1 || count_ > rooms::kMaxCount) return false;
    if (every_ < first_.end - first_.start || every_ > rooms::kMaxTime) return false;
    return lastEnd() <= rooms::kMaxTime;
  }

  std::vector<Span> occurrences() const {
    std::vector<Span> spans;
    for (int k = 0; k < count_; ++k) spans.push_back({first_.start + k * every_, first_.end + k * every_});
    return spans;
  }

 private:
  long long lastEnd() const { return static_cast<long long>(first_.end) + static_cast<long long>(count_ - 1) * every_; }

  std::string id_;
  Span first_;
  int attendees_;
  int every_;
  int count_;
};
