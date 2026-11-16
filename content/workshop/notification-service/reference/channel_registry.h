#pragma once
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api.h"

// One step of a route: a channel and the name it was registered under.
struct Hop {
  std::string name;
  std::shared_ptr<notif::Channel> channel;
};

// The registered channels, by name.
class ChannelRegistry {
 public:
  bool add(const std::string& name, std::shared_ptr<notif::Channel> channel) {
    if (name.empty() || channel == nullptr) return false;
    return channels_.emplace(name, std::move(channel)).second;
  }

  // The registered channels among `names`, in the order given, each at most once (its first position).
  std::vector<Hop> route(const std::vector<std::string>& names) const {
    std::vector<Hop> hops;
    for (const std::string& name : names) {
      const auto found = channels_.find(name);
      if (found == channels_.end() || alreadyIn(hops, name)) continue;
      hops.push_back(Hop{name, found->second});
    }
    return hops;
  }

 private:
  static bool alreadyIn(const std::vector<Hop>& hops, const std::string& name) {
    for (const Hop& hop : hops) {
      if (hop.name == name) return true;
    }
    return false;
  }

  std::map<std::string, std::shared_ptr<notif::Channel>> channels_;
};
