#pragma once
#include <string>
#include <utility>
#include <vector>

#include "calendar.h"

// A named room with a number of seats and its own calendar.
class Room {
 public:
  Room(std::string name, int capacity) : name_(std::move(name)), capacity_(capacity) {}

  const std::string& name() const { return name_; }
  int capacity() const { return capacity_; }
  Calendar& calendar() { return calendar_; }
  const Calendar& calendar() const { return calendar_; }

  bool fits(int attendees) const { return attendees <= capacity_; }
  bool freeFor(const std::vector<Span>& spans) const { return calendar_.allFree(spans); }

 private:
  std::string name_;
  int capacity_;
  Calendar calendar_;
};
