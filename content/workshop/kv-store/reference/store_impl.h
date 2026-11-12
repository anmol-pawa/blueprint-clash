#pragma once
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"
#include "entry_table.h"
#include "expiry_rule.h"
#include "undo_journal.h"

// The public face. It sequences the collaborators: the table holds data, the rule decides liveness from the clock,
// and the journal remembers how to undo a write. It holds no rule of its own about time or transactions.
class StoreImpl : public kv::ScannableStore {
 public:
  explicit StoreImpl(std::shared_ptr<kv::Clock> clock) : rule_(std::move(clock)) {}

  void set(const std::string& key, const std::string& value) override { write(key, Entry{value, std::nullopt}); }

  bool setWithTtl(const std::string& key, const std::string& value, long long ttl) override {
    if (ttl <= 0) return false;
    write(key, Entry{value, rule_.expiryFor(ttl)});
    return true;
  }

  std::optional<std::string> get(const std::string& key) const override {
    const Entry* entry = table_.find(key);
    if (entry == nullptr || !rule_.isLive(*entry)) return std::nullopt;
    return entry->value;
  }

  bool erase(const std::string& key) override {
    const Entry* entry = table_.find(key);
    const bool wasLive = entry != nullptr && rule_.isLive(*entry);
    if (entry != nullptr) {
      journal_.record(key, entry);
      table_.remove(key);
    }
    return wasLive;
  }

  int size() const override {
    return table_.count([this](const Entry& entry) { return rule_.isLive(entry); });
  }

  std::optional<long long> ttlRemaining(const std::string& key) const override {
    const Entry* entry = table_.find(key);
    return entry == nullptr ? std::nullopt : rule_.remaining(*entry);
  }

  void begin() override { journal_.begin(); }
  bool commit() override { return journal_.commit(); }
  bool rollback() override { return journal_.rollbackInto(table_); }
  int depth() const override { return journal_.depth(); }

  std::vector<std::string> keysWithPrefix(const std::string& prefix) const override {
    return table_.keysWithPrefix(prefix, [this](const Entry& entry) { return rule_.isLive(entry); });
  }

 private:
  void write(const std::string& key, Entry entry) {
    journal_.record(key, table_.find(key));
    table_.put(key, std::move(entry));
  }

  EntryTable table_;
  ExpiryRule rule_;
  UndoJournal journal_;
};
