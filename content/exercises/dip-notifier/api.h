#pragma once
#include <string>

// The abstraction the order service depends on. Real senders (email, SMS, a test double) implement it.
class MessageSender {
 public:
  virtual ~MessageSender() = default;
  // Returns true when the message was delivered.
  virtual bool send(const std::string& to, const std::string& body) = 0;
};
