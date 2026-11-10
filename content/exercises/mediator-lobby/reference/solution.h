#pragma once
#include <algorithm>
#include <string>
#include <vector>
#include "api.h"

// The mediator: participants know only the Lobby; the Lobby owns the routing and the start rule.
class Lobby {
  struct Member {
    std::string name;
    Participant* participant;  // non-owning
    bool ready;
  };

 public:
  bool join(const std::string& name, Participant& participant) {
    if (find(name) != members_.end()) {
      return false;
    }
    members_.push_back({name, &participant, false});
    return true;
  }

  void leave(const std::string& name) {
    const auto it = find(name);
    if (it == members_.end()) {
      return;
    }
    members_.erase(it);
    startIfEveryoneIsReady();  // the departure may have been the missing "not ready"
  }

  void setReady(const std::string& name, bool ready) {
    const auto it = find(name);
    if (it == members_.end()) {
      return;
    }
    it->ready = ready;
    startIfEveryoneIsReady();
  }

  void say(const std::string& from, const std::string& text) {
    if (find(from) == members_.end()) {
      return;
    }
    for (const Member& member : members_) {
      if (member.name != from) {
        member.participant->notify(from + ": " + text);
      }
    }
  }

  bool matchStarted() const { return started_; }

 private:
  std::vector<Member>::iterator find(const std::string& name) {
    return std::find_if(members_.begin(), members_.end(), [&](const Member& m) { return m.name == name; });
  }

  void startIfEveryoneIsReady() {
    if (started_ || members_.size() < 2) {
      return;
    }
    const bool allReady = std::all_of(members_.begin(), members_.end(), [](const Member& m) { return m.ready; });
    if (!allReady) {
      return;
    }
    started_ = true;
    for (const Member& member : members_) {
      member.participant->notify("match started");
    }
  }

  std::vector<Member> members_;
  bool started_ = false;
};
