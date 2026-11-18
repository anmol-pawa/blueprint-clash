#pragma once
#include <algorithm>
#include <string>
#include <vector>

// The ids of dead jobs, oldest death first.
class DeadLetters {
 public:
  void add(const std::string& id) { ids_.push_back(id); }
  void remove(const std::string& id) { ids_.erase(std::remove(ids_.begin(), ids_.end(), id), ids_.end()); }
  const std::vector<std::string>& ids() const { return ids_; }

 private:
  std::vector<std::string> ids_;
};
