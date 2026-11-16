#pragma once
// Public API for the Notification service problem. The hidden tests only use what is declared here.
// You implement notif::makeService() (in any of your .cpp files); everything behind it is your design.
// Channels are supplied by the caller (the tests bring fakes), so your code never opens a socket.
// Nothing here throws: this code is compiled without exceptions.
#include <functional>
#include <map>
#include <memory>
#include <string>

namespace notif {

// What one attempt on a channel reports.
enum class SendResult {
  Delivered,  // the message was accepted
  Transient,  // it failed, but trying again may work (timeout, 503)
  Permanent,  // it failed and will keep failing (bad address, blocked recipient)
};

// A way to reach a person: email, SMS, push... Implemented by the caller. A channel makes exactly one attempt per call.
class Channel {
 public:
  virtual ~Channel() = default;
  virtual SendResult send(const std::string& recipient, const std::string& body) = 0;
};

// How the service waits between two attempts. Called with the number of milliseconds to wait; the tests record it
// instead of sleeping. May be empty (then the service does not wait at all).
using Pause = std::function<void(long long millis)>;

struct RetryConfig {
  int maxAttempts = 3;            // attempts per channel, including the first. Must be >= 1.
  long long firstDelayMs = 100;   // the wait before the second attempt; it doubles before every later one
  Pause pause;
};

// One message to send: a stored template filled with `params`, to `recipient`, over the channel registered as `channel`.
struct Request {
  std::string recipient;
  std::string templateId;
  std::string channel;
  std::map<std::string, std::string> params;
};

enum class Status {
  Delivered,        // a channel accepted the message
  Failed,           // every attempt failed (a permanent failure, or the attempts ran out)
  InvalidRequest,   // the recipient is empty
  UnknownTemplate,  // no template with that id
  UnknownChannel,   // no channel with that name
  MissingParam,     // the template needs a parameter the request does not carry
};

struct Receipt {
  Status status = Status::Failed;
  int attempts = 0;      // how many times a channel was asked to send (0 when the request was refused before sending)
  std::string channel;   // the channel that delivered, or the last one tried when it failed ("" if none was tried)
  std::string body;      // the rendered text ("" when rendering did not happen or failed)
};

class NotificationService {
 public:
  virtual ~NotificationService() = default;

  // Registers a channel under a name. Returns false (and changes nothing) for an empty name, a null channel or a
  // name that is already registered.
  virtual bool addChannel(const std::string& name, std::shared_ptr<Channel> channel) = 0;

  // Stores a template. Returns false (and changes nothing) for an empty id or an id that already exists.
  // Placeholders: "{name}" where name is one or more letters, digits or underscores is replaced by params["name"].
  // Everything else is literal text, including "{}", "{ x }", "{a-b}", a lone "{" or "}". A replacement value is
  // inserted as it is and never scanned again for placeholders.
  virtual bool addTemplate(const std::string& id, const std::string& text) = 0;

  // Renders the template and delivers it. The checks run in this order and the first failure decides the status:
  //   1. empty recipient              -> InvalidRequest
  //   2. unknown template id          -> UnknownTemplate
  //   3. unknown channel name         -> UnknownChannel
  //   4. a placeholder with no param  -> MissingParam   (extra params are ignored)
  // A refused request never reaches a channel (attempts == 0).
  // Delivery: the channel is asked up to maxAttempts times. Delivered ends it. Permanent ends it at once (no wait, no
  // retry). Transient is retried after a wait of firstDelayMs, then 2x, 4x, ... (the wait before attempt n+1 is
  // firstDelayMs * 2^(n-1)); there is no wait after the last attempt. Every send starts again from firstDelayMs.
  // Receipt.attempts counts the calls made to the channel.
  virtual Receipt send(const Request& request) = 0;
};

// Returns nullptr when config.maxAttempts < 1 or config.firstDelayMs < 0.
std::unique_ptr<NotificationService> makeService(const RetryConfig& config);

}  // namespace notif
