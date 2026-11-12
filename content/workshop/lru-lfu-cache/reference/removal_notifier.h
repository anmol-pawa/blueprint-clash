#pragma once
#include <memory>
#include <string>
#include <utility>

#include "api_storm2.h"

// Tells the registered listener, if any, that an entry has left the cache.
class RemovalNotifier {
 public:
  void setListener(std::shared_ptr<cachex::RemovalListener> listener) { listener_ = std::move(listener); }

  void removed(const std::string& key, const std::string& value, cachex::RemovalReason reason) const {
    if (listener_ != nullptr) listener_->onRemoved(key, value, reason);
  }

 private:
  std::shared_ptr<cachex::RemovalListener> listener_;
};
