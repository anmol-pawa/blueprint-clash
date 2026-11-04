#pragma once
#include <functional>
#include <memory>
#include <string>

// A product that callers want by name, without knowing its concrete class.
class Codec {
 public:
  virtual ~Codec() = default;
  virtual std::string name() const = 0;
  virtual std::string encode(const std::string& text) const = 0;
};

// How to make one Codec. New codecs ship a new factory, nothing else.
using CodecFactory = std::function<std::unique_ptr<Codec>()>;
