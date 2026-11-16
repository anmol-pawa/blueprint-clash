#pragma once
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"
#include "channel_registry.h"
#include "courier.h"
#include "template_renderer.h"
#include "template_store.h"

// The public face: validates a request in the documented order and sequences the collaborators. It has no rule of its
// own about placeholders, retries or routes.
class ServiceImpl : public notif::FallbackService {
 public:
  explicit ServiceImpl(const notif::RetryConfig& config) : courier_(RetryPolicy(config)) {}

  bool addChannel(const std::string& name, std::shared_ptr<notif::Channel> channel) override {
    return channels_.add(name, std::move(channel));
  }

  bool addTemplate(const std::string& id, const std::string& text) override { return templates_.add(id, text); }

  notif::Receipt send(const notif::Request& request) override {
    return run(request.recipient, request.templateId, {request.channel}, request.params);
  }

  notif::Receipt sendVia(const notif::ChainRequest& request) override {
    return run(request.recipient, request.templateId, request.channels, request.params);
  }

 private:
  static notif::Receipt refusal(notif::Status status) {
    notif::Receipt receipt;
    receipt.status = status;
    return receipt;
  }

  notif::Receipt run(const std::string& recipient, const std::string& templateId, const std::vector<std::string>& names,
                     const std::map<std::string, std::string>& params) const {
    if (recipient.empty()) return refusal(notif::Status::InvalidRequest);
    const std::string* text = templates_.find(templateId);
    if (text == nullptr) return refusal(notif::Status::UnknownTemplate);
    const std::vector<Hop> route = channels_.route(names);
    if (route.empty()) return refusal(notif::Status::UnknownChannel);
    std::string body;
    if (!renderer_.render(*text, params, body)) return refusal(notif::Status::MissingParam);
    return courier_.deliver(recipient, body, route);
  }

  TemplateStore templates_;
  ChannelRegistry channels_;
  TemplateRenderer renderer_;
  Courier courier_;
};
