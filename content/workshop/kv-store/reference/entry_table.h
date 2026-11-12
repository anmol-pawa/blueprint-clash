#pragma once
#include <functional>
#include <map>
#include <optional>
#include <string>
#include <utility>
#include <vector>

// What the table keeps for one key. `expiresAt` is an absolute tick; empty means the key never expires.
struct Entry {
  std::string value;
  std::optional<long long> expiresAt;
};

// Holds the entries, ordered by key. It does not know what time it is or which entries are still live.
class EntryTable {
 public:
  const Entry* find(const std::string& key) const {
    const auto found = entries_.find(key);
    return found == entries_.end() ? nullptr : &found->second;
  }

  void put(const std::string& key, Entry entry) { entries_[key] = std::move(entry); }

  // Removes the key and hands back what it held, or nothing if it was absent.
  std::optional<Entry> remove(const std::string& key) {
    const auto found = entries_.find(key);
    if (found == entries_.end()) return std::nullopt;
    Entry entry = std::move(found->second);
    entries_.erase(found);
    return entry;
  }

  // Puts the key back as it was: the given entry, or no entry at all.
  void restore(const std::string& key, std::optional<Entry> entry) {
    if (entry.has_value()) {
      put(key, std::move(*entry));
    } else {
      entries_.erase(key);
    }
  }

  // Keys starting with `prefix`, ascending, for which `keep` is true.
  std::vector<std::string> keysWithPrefix(const std::string& prefix, const std::function<bool(const Entry&)>& keep) const {
    std::vector<std::string> keys;
    for (auto it = entries_.lower_bound(prefix); it != entries_.end() && it->first.compare(0, prefix.size(), prefix) == 0; ++it) {
      if (keep(it->second)) keys.push_back(it->first);
    }
    return keys;
  }

  int count(const std::function<bool(const Entry&)>& keep) const {
    int total = 0;
    for (const auto& item : entries_) total += keep(item.second) ? 1 : 0;
    return total;
  }

 private:
  std::map<std::string, Entry> entries_;
};
