#pragma once
// Change Storm 2 adds listing by prefix. Everything from api.h and api_storm1.h still holds.
#include <vector>

#include "api_storm1.h"

namespace kv {

class ScannableStore : public TransactionalStore {
 public:
  // The live keys that start with `prefix`, in ascending byte order (std::string comparison), without duplicates.
  // The empty prefix matches every live key. Expired keys are not listed. Uncommitted writes are visible, and a key
  // removed inside a transaction is not listed until that transaction is rolled back.
  virtual std::vector<std::string> keysWithPrefix(const std::string& prefix) const = 0;
};

// Returns nullptr when the clock is null.
std::unique_ptr<ScannableStore> makeScannableStore(std::shared_ptr<Clock> clock);

}  // namespace kv
