#pragma once
#include <functional>
#include <map>
#include <memory>
#include <string>
#include <utility>

#include "limit_policy.h"

// One policy per client, created the first time the client is seen. The factory is how an algorithm is chosen:
// this class knows nothing about token buckets or windows.
class ClientPolicies {
 public:
  using Factory = std::function<std::unique_ptr<LimitPolicy>()>;

  explicit ClientPolicies(Factory factory) : factory_(std::move(factory)) {}

  LimitPolicy& forClient(const std::string& client) {
    auto found = policies_.find(client);
    if (found == policies_.end()) found = policies_.emplace(client, factory_()).first;
    return *found->second;
  }

 private:
  Factory factory_;
  std::map<std::string, std::unique_ptr<LimitPolicy>> policies_;
};
