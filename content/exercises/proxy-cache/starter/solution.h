#pragma once
#include <functional>
#include <map>
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include "api.h"

// TODO: CachingStore answers repeated get()s from memory, writes through on put() without leaving
// stale data, and never caches a missing key.
class CachingStore final : public Store {
 public:
  explicit CachingStore(Store& real) : real_(real) {}
  std::optional<std::string> get(const std::string& key) override { return real_.get(key); }
  void put(const std::string& key, const std::string& value) override { real_.put(key, value); }

 private:
  Store& real_;
};

// TODO: LazyStore builds the real store on first use, once, and then forwards everything to it.
class LazyStore final : public Store {
 public:
  explicit LazyStore(std::function<std::unique_ptr<Store>()> make) : make_(std::move(make)) {}
  std::optional<std::string> get(const std::string&) override { return std::nullopt; }
  void put(const std::string&, const std::string&) override {}

 private:
  std::function<std::unique_ptr<Store>()> make_;
  std::unique_ptr<Store> real_;
};
