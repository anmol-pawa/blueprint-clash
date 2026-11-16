#include "api_storm2.h"

#include <cstddef>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

struct Outcome {
  notif::SendResult last;  // what the final attempt said
  int attempts;            // how many calls were made
};

// Runs ONE channel until it delivers, fails for good, or runs out of attempts. It owns the retry rules (what is worth
// retrying, how many times, how long to wait) and nothing about which channel or what text.
class RetryPolicy {
 public:
  explicit RetryPolicy(notif::RetryConfig config) : config_(std::move(config)) {}

  long long firstDelay() const { return config_.firstDelayMs; }

  Outcome run(notif::Channel& channel, const std::string& recipient, const std::string& body, long long& delay) const {
    Outcome outcome{notif::SendResult::Transient, 0};
    for (int attempt = 1; attempt <= config_.maxAttempts; ++attempt) {
      if (attempt > 1) {  // only ever before another attempt, never after the last one
        wait(delay);
        delay *= 2;
      }
      outcome.last = channel.send(recipient, body);
      outcome.attempts = attempt;
      if (outcome.last != notif::SendResult::Transient) break;
    }
    return outcome;
  }

 private:
  void wait(long long millis) const {
    if (config_.pause) config_.pause(millis);
  }

  notif::RetryConfig config_;
};

// Fills "{name}" placeholders from a parameter map. Owns the grammar: a placeholder is '{', one or more letters, digits
// or underscores, '}'. Everything else is copied as it is, and inserted values are never scanned again.
class TemplateRenderer {
 public:
  // Writes the result to `out`. Returns false (leaving `out` unspecified) when a placeholder has no parameter.
  bool render(const std::string& text, const std::map<std::string, std::string>& params, std::string& out) const {
    out.clear();
    std::size_t at = 0;
    while (at < text.size()) {
      const std::size_t close = placeholderEnd(text, at);
      if (close == std::string::npos) {
        out += text[at++];
        continue;
      }
      const auto found = params.find(text.substr(at + 1, close - at - 1));
      if (found == params.end()) return false;
      out += found->second;
      at = close + 1;
    }
    return true;
  }

 private:
  // Index of the '}' closing a placeholder that starts at `open`, or npos if there is no placeholder there.
  static std::size_t placeholderEnd(const std::string& text, std::size_t open) {
    if (text[open] != '{') return std::string::npos;
    std::size_t at = open + 1;
    while (at < text.size() && isNameChar(text[at])) ++at;
    if (at == open + 1 || at == text.size() || text[at] != '}') return std::string::npos;
    return at;
  }

  static bool isNameChar(char c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_';
  }
};

// The stored template texts, by id.
class TemplateStore {
 public:
  bool add(const std::string& id, const std::string& text) {
    if (id.empty()) return false;
    return texts_.emplace(id, text).second;
  }

  // The text, or nullptr when there is no such template.
  const std::string* find(const std::string& id) const {
    const auto found = texts_.find(id);
    return found == texts_.end() ? nullptr : &found->second;
  }

 private:
  std::map<std::string, std::string> texts_;
};

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

// Carries one finished text along a route: each hop gets the whole retry policy to itself, the first delivery ends the
// trip, and a hop that gives up hands over to the next one. A route of one hop is the plain single-channel send.
class Courier {
 public:
  explicit Courier(RetryPolicy policy) : policy_(std::move(policy)) {}

  notif::Receipt deliver(const std::string& recipient, const std::string& body, const std::vector<Hop>& route) const {
    notif::Receipt receipt;
    receipt.status = notif::Status::Failed;
    receipt.body = body;
    long long delay = policy_.firstDelay();
    for (const Hop& hop : route) {
      const Outcome outcome = policy_.run(*hop.channel, recipient, body, delay);
      receipt.attempts += outcome.attempts;
      receipt.channel = hop.name;
      if (outcome.last == notif::SendResult::Delivered) {
        receipt.status = notif::Status::Delivered;
        break;
      }
    }
    return receipt;
  }

 private:
  RetryPolicy policy_;
};

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

namespace {
bool usable(const notif::RetryConfig& config) { return config.maxAttempts >= 1 && config.firstDelayMs >= 0; }
}  // namespace

std::unique_ptr<notif::NotificationService> notif::makeService(const RetryConfig& config) {
  if (!usable(config)) return nullptr;
  return std::make_unique<ServiceImpl>(config);
}

std::unique_ptr<notif::FallbackService> notif::makeFallbackService(const RetryConfig& config) {
  if (!usable(config)) return nullptr;
  return std::make_unique<ServiceImpl>(config);
}

std::unique_ptr<notif::IdempotentService> notif::makeIdempotentService(const RetryConfig& config) {
  if (!usable(config)) return nullptr;
  return std::make_unique<IdempotentServiceImpl>(std::make_unique<ServiceImpl>(config));
}
