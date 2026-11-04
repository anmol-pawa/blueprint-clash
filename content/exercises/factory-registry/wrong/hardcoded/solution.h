#pragma once
#include <cctype>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api.h"

namespace {
class Upper : public Codec {
 public:
  std::string name() const override { return "upper"; }
  std::string encode(const std::string& t) const override {
    std::string r = t;
    for (auto& c : r) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
    return r;
  }
};
}  // namespace

// Wrong: keeps the if-ladder for known names; a new codec needs an edit here.
class CodecRegistry {
 public:
  bool registerCodec(const std::string& name, CodecFactory factory) {
    if (name.empty() || !factory) return false;
    return factories_.emplace(name, std::move(factory)).second;
  }
  std::unique_ptr<Codec> create(const std::string& name) const {
    if (name == "upper") return std::make_unique<Upper>();
    return nullptr;
  }
  std::vector<std::string> names() const {
    std::vector<std::string> r;
    for (const auto& e : factories_) r.push_back(e.first);
    return r;
  }

 private:
  std::map<std::string, CodecFactory> factories_;
};
