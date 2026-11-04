#pragma once
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

// The registry owns the stable part: lookup, uniqueness, laziness.
// What varies (which codecs exist) is data supplied by the callers.
class CodecRegistry {
 public:
  bool registerCodec(const std::string& name, CodecFactory factory) {
    if (name.empty() || !factory) return false;
    factories_[name] = std::move(factory);  // wrong: later registration silently replaces the first
    return true;
  }

  std::unique_ptr<Codec> create(const std::string& name) const {
    const auto it = factories_.find(name);
    if (it == factories_.end()) return nullptr;
    return it->second();
  }

  std::vector<std::string> names() const {
    std::vector<std::string> result;
    result.reserve(factories_.size());
    for (const auto& entry : factories_) result.push_back(entry.first);  // std::map is already sorted
    return result;
  }

 private:
  std::map<std::string, CodecFactory> factories_;
};
