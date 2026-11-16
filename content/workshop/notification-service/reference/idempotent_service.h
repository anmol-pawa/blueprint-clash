#pragma once
#include <map>
#include <memory>
#include <string>
#include <utility>

#include "api_storm2.h"

// The receipts of notifications that have been delivered, by idempotency key.
class DeliveredLog {
 public:
  // The receipt recorded for `key`, or nullptr.
  const notif::Receipt* find(const std::string& key) const {
    const auto found = receipts_.find(key);
    return found == receipts_.end() ? nullptr : &found->second;
  }

  void record(const std::string& key, const notif::Receipt& receipt) { receipts_.emplace(key, receipt); }

 private:
  std::map<std::string, notif::Receipt> receipts_;
};

// A Decorator: everything is forwarded to the wrapped service, and sendOnce() adds "at most one delivery per key" on top.
// Only a Delivered receipt uses up a key, so a failed attempt can be repeated under the same key.
class IdempotentServiceImpl : public notif::IdempotentService {
 public:
  explicit IdempotentServiceImpl(std::unique_ptr<notif::FallbackService> inner) : inner_(std::move(inner)) {}

  bool addChannel(const std::string& name, std::shared_ptr<notif::Channel> channel) override {
    return inner_->addChannel(name, std::move(channel));
  }

  bool addTemplate(const std::string& id, const std::string& text) override { return inner_->addTemplate(id, text); }

  notif::Receipt send(const notif::Request& request) override { return inner_->send(request); }

  notif::Receipt sendVia(const notif::ChainRequest& request) override { return inner_->sendVia(request); }

  notif::OnceResult sendOnce(const std::string& key, const notif::ChainRequest& request) override {
    const bool keyed = !key.empty();
    if (keyed) {
      if (const notif::Receipt* earlier = log_.find(key)) return notif::OnceResult{true, *earlier};
    }
    const notif::Receipt receipt = inner_->sendVia(request);
    if (keyed && receipt.status == notif::Status::Delivered) log_.record(key, receipt);
    return notif::OnceResult{false, receipt};
  }

 private:
  std::unique_ptr<notif::FallbackService> inner_;
  DeliveredLog log_;
};
