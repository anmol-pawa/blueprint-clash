// keysWithPrefix() lists expired keys.
#include <map>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include "api_storm2.h"

namespace {
using namespace kv;

struct Entry {
  std::string value;
  std::optional<long long> expiresAt;
};

class StoreImpl : public ScannableStore {
 public:
  explicit StoreImpl(std::shared_ptr<Clock> clock) : clock_(std::move(clock)) {}

  void set(const std::string& key, const std::string& value) override {
    note(key);
    Entry entry{value, std::nullopt};
    table_[key] = entry;
  }

  bool setWithTtl(const std::string& key, const std::string& value, long long ttl) override {
    if (ttl <= 0) return false;
    note(key);
    table_[key] = Entry{value, clock_->now() + ttl};
    return true;
  }

  std::optional<std::string> get(const std::string& key) const override {
    const auto found = table_.find(key);
    if (found == table_.end() || !live(found->second)) return std::nullopt;
    return found->second.value;
  }

  bool erase(const std::string& key) override {
    const auto found = table_.find(key);
    if (found == table_.end()) return false;
    const bool wasLive = live(found->second);
    note(key);
    table_.erase(key);
    return wasLive;
  }

  int size() const override {
    int total = 0;
    for (const auto& item : table_) total += live(item.second) ? 1 : 0;
    return total;
  }

  std::optional<long long> ttlRemaining(const std::string& key) const override {
    const auto found = table_.find(key);
    if (found == table_.end() || !live(found->second) || !found->second.expiresAt.has_value()) return std::nullopt;
    return *found->second.expiresAt - clock_->now();
  }

  void begin() override { frames_.emplace_back(); }

  bool commit() override {
    if (frames_.empty()) return false;
    Frame done = std::move(frames_.back());
    frames_.pop_back();
    if (!frames_.empty()) {
      for (auto& record : done) frames_.back().push_back(std::move(record));
    }
    return true;
  }

  bool rollback() override {
    if (frames_.empty()) return false;
    Frame done = std::move(frames_.back());
    frames_.pop_back();
    for (auto it = done.rbegin(); it != done.rend(); ++it) {
      if (it->before.has_value()) {
        table_[it->key] = *it->before;
      } else {
        table_.erase(it->key);
      }
    }
    return true;
  }

  int depth() const override { return static_cast<int>(frames_.size()); }

  std::vector<std::string> keysWithPrefix(const std::string& prefix) const override {
    std::vector<std::string> keys;
    for (const auto& item : table_) {
      const bool matches = item.first.compare(0, prefix.size(), prefix) == 0;
      if (matches) keys.push_back(item.first);
    }
    return keys;
  }

 private:
  struct Record {
    std::string key;
    std::optional<Entry> before;
  };
  using Frame = std::vector<Record>;

  bool live(const Entry& entry) const {
    return !entry.expiresAt.has_value() || clock_->now() < *entry.expiresAt;
  }

  void note(const std::string& key) {
    if (frames_.empty()) return;
    const auto found = table_.find(key);
    std::optional<Entry> before;
    if (found != table_.end()) before = found->second;
    frames_.back().push_back({key, before});
  }

  std::shared_ptr<Clock> clock_;
  std::map<std::string, Entry> table_;
  std::vector<Frame> frames_;
};
}  // namespace

std::unique_ptr<Store> kv::makeStore(std::shared_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<StoreImpl>(std::move(clock));
}
std::unique_ptr<TransactionalStore> kv::makeTransactionalStore(std::shared_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<StoreImpl>(std::move(clock));
}
std::unique_ptr<ScannableStore> kv::makeScannableStore(std::shared_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<StoreImpl>(std::move(clock));
}
