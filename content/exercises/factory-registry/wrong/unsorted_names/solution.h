#pragma once
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

// Wrong: names() comes back in registration order.
class CodecRegistry {
 public:
  bool registerCodec(const std::string& name, CodecFactory factory) {
    if (name.empty() || !factory) return false;
    for (const auto& e : entries_) {
      if (e.first == name) return false;
    }
    entries_.emplace_back(name, std::move(factory));
    return true;
  }
  std::unique_ptr<Codec> create(const std::string& name) const {
    for (const auto& e : entries_) {
      if (e.first == name) return e.second();
    }
    return nullptr;
  }
  std::vector<std::string> names() const {
    std::vector<std::string> r;
    for (const auto& e : entries_) r.push_back(e.first);
    return r;
  }

 private:
  std::vector<std::pair<std::string, CodecFactory>> entries_;
};
