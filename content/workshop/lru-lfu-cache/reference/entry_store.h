#pragma once
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>

// Holds the entries and knows the capacity. It has no opinion about which entry to drop.
class EntryStore {
 public:
  explicit EntryStore(int capacity) : capacity_(capacity) {}

  int capacity() const { return capacity_; }
  int size() const { return static_cast<int>(entries_.size()); }
  bool full() const { return size() >= capacity_; }
  bool contains(const std::string& key) const { return entries_.count(key) != 0; }

  const std::string* find(const std::string& key) const {
    const auto found = entries_.find(key);
    return found == entries_.end() ? nullptr : &found->second;
  }

  void store(const std::string& key, const std::string& value) { entries_[key] = value; }

  // Removes the key and hands back the value it held, or nothing if it was absent.
  std::optional<std::string> remove(const std::string& key) {
    const auto found = entries_.find(key);
    if (found == entries_.end()) return std::nullopt;
    std::string value = std::move(found->second);
    entries_.erase(found);
    return value;
  }

 private:
  int capacity_;
  std::unordered_map<std::string, std::string> entries_;
};
