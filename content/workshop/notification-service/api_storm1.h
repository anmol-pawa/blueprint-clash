#pragma once
// Change Storm 1 adds a fallback chain. Everything from api.h still holds for the new service.
#include "api.h"

#include <vector>

namespace notif {

// Like Request, but with several channels to try in order instead of one.
struct ChainRequest {
  std::string recipient;
  std::string templateId;
  std::vector<std::string> channels;  // preferred first
  std::map<std::string, std::string> params;
};

// A service that can fall back to the next channel when one gives up.
//   - Validation as in send(): empty recipient, unknown template, a placeholder with no param, in that order. Channel
//     names that are not registered are skipped without comment; a chain with no registered channel at all (including an
//     empty chain) is UnknownChannel, decided after UnknownTemplate and before MissingParam.
//   - A name that appears more than once is tried only once, at its first position.
//   - Each channel gets its own full retry budget and its own backoff, starting again from firstDelayMs. A channel that
//     gives up (Permanent, or its attempts ran out) hands over to the next one at once, with no wait in between.
//   - The first Delivered ends the chain. The body is rendered once and every channel gets the same text.
//   - Receipt.attempts is the total number of channel calls over all channels; Receipt.channel is the one that delivered,
//     or the last one tried when everything failed (status Failed).
// send() keeps working as in api.h.
class FallbackService : public NotificationService {
 public:
  virtual Receipt sendVia(const ChainRequest& request) = 0;
};

std::unique_ptr<FallbackService> makeFallbackService(const RetryConfig& config);

}  // namespace notif
