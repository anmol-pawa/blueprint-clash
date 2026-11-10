#pragma once
#include <string>

// Anything that wants to hear about messages implements this.
class Listener {
 public:
  virtual ~Listener() = default;
  virtual void onMessage(const std::string& message) = 0;
};
