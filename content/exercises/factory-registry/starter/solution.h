#pragma once
#include <memory>
#include <string>
#include <vector>
#include "api.h"

// TODO: look the factory up in a registry instead of hard-coding names here.
class CodecRegistry {
 public:
  bool registerCodec(const std::string& name, CodecFactory factory) {
    (void)name;
    (void)factory;
    return false;
  }
  std::unique_ptr<Codec> create(const std::string& name) const {
    (void)name;
    return nullptr;
  }
  std::vector<std::string> names() const { return {}; }
};
