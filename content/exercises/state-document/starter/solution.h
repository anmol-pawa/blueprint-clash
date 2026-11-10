#pragma once
#include <memory>
#include <string>
#include <utility>

// TODO: one class per state (draft, review, published) behind a private State interface.
// Document forwards each action to the current state and swaps to the state it returns.
class Document {
 public:
  bool edit() { return false; }
  bool submit() { return false; }
  bool approve() { return false; }
  bool reject() { return false; }
  std::string stateName() const { return "draft"; }
  int revision() const { return 0; }
};
