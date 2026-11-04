#pragma once
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

// Wrong: builds a throwaway codec at registration time (to "validate" it).
class CodecRegistry {
 public:
  bool registerCodec(const std::string& name, CodecFactory factory) {
    if (name.empty() || !factory) return false;
    if (!factory()) return false;
    return factories_.emplace(name, std::move(factory)).second;
  }
  std::unique_ptr<Codec> create(const std::string& name) const {
    const auto it = factories_.find(name);
    if (it == factories_.end()) return nullptr;
    return it->second();
  }
  std::vector<std::string> names() const {
    std::vector<std::string> r;
    for (const auto& e : factories_) r.push_back(e.first);
    return r;
  }

 private:
  std::map<std::string, CodecFactory> factories_;
};
