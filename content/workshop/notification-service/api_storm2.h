#pragma once
// Change Storm 2 adds idempotent sends. Everything from api.h and api_storm1.h still holds.
#include "api_storm1.h"

namespace notif {

struct OnceResult {
  bool duplicate = false;  // true when the key had already been delivered and nothing was sent this time
  Receipt receipt;         // the outcome of this call, or (for a duplicate) the receipt of the original delivery
};

// A fallback service that can promise "at most one delivery per key".
//   - sendOnce(key, request) behaves like sendVia(request), except that a non-empty key which has already been
//     delivered is not sent again: the result is duplicate == true, the original receipt, and no channel is called.
//   - Only a Delivered outcome uses up a key. A failure of any kind (Failed, or a refused request such as
//     UnknownTemplate) leaves the key free, so the caller may try again with the same key.
//   - An empty key means "no deduplication": every call sends.
//   - A key identifies one logical notification for the whole service, whatever recipient or channels the request names.
//   - send() and sendVia() never read or record keys.
class IdempotentService : public FallbackService {
 public:
  virtual OnceResult sendOnce(const std::string& key, const ChainRequest& request) = 0;
};

std::unique_ptr<IdempotentService> makeIdempotentService(const RetryConfig& config);

}  // namespace notif
