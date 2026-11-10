#pragma once
#include <string>
#include <vector>
#include "api.h"

// TODO: the mediator. Keep each player's name, a non-owning Participant* and a ready flag.
// say() fans out to everyone but the sender; the start rule (>= 2 players, all ready, once)
// is checked after setReady() and after leave().
class Lobby {
 public:
  bool join(const std::string&, Participant&) { return false; }
  void leave(const std::string&) {}
  void setReady(const std::string&, bool) {}
  void say(const std::string&, const std::string&) {}
  bool matchStarted() const { return false; }
};
