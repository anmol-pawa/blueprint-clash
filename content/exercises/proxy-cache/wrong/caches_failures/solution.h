#pragma once
#include <functional>
#include <map>
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include "api.h"

// Caching proxy: same interface as the real store, but remembers what it has read.
class CachingStore final : public Store {
 public:
  explicit CachingStore(Store& real) : real_(real) {}

  std::optional<std::string> get(const std::string& key) override {
    const auto hit = cache_.find(key);
    if (hit != cache_.end()) return hit->second;
    const std::string value = real_.get(key).value_or(std::string());  // 'missing' becomes ""
    cache_.emplace(key, value);                                         // ...and is remembered
    return value;
  }

  void put(const std::string& key, const std::string& value) override {
    real_.put(key, value);  // write first, so a failing write does not leave a lie in the cache
    cache_[key] = value;
  }

 private:
  Store& real_;
  std::map<std::string, std::string> cache_;
};

// Virtual proxy: postpones building the (expensive) real store until it is first needed.
class LazyStore final : public Store {
 public:
  explicit LazyStore(std::function<std::unique_ptr<Store>()> make) : make_(std::move(make)) {}

  std::optional<std::string> get(const std::string& key) override { return real().get(key); }
  void put(const std::string& key, const std::string& value) override { real().put(key, value); }

 private:
  Store& real() {
    if (!real_) real_ = make_();
    return *real_;
  }

  std::function<std::unique_ptr<Store>()> make_;
  std::unique_ptr<Store> real_;
};
