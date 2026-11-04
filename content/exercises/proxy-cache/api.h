#pragma once
#include <cstddef>
#include <map>
#include <optional>
#include <string>

// The subject interface. Real stores, proxies and test fakes are all interchangeable behind it.
class Store {
 public:
  virtual ~Store() = default;
  // An empty optional means the key does not exist.
  virtual std::optional<std::string> get(const std::string& key) = 0;
  virtual void put(const std::string& key, const std::string& value) = 0;
};

// The "real" store for tests and demos: pretend each access is expensive and count them.
class MemoryStore final : public Store {
 public:
  std::optional<std::string> get(const std::string& key) override {
    ++reads_;
    auto it = data_.find(key);
    if (it == data_.end()) return std::nullopt;
    return it->second;
  }
  void put(const std::string& key, const std::string& value) override {
    ++writes_;
    data_[key] = value;
  }
  std::size_t reads() const { return reads_; }
  std::size_t writes() const { return writes_; }

 private:
  std::map<std::string, std::string> data_;
  std::size_t reads_ = 0;
  std::size_t writes_ = 0;
};
