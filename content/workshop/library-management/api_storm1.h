#pragma once
// Change Storm 1 adds membership tiers. Everything from api.h still holds.
#include "api.h"

namespace lib {

enum class Tier { Basic, Premium };

// A Library whose members have a tier. Basic members may hold 3 books, Premium members 5.
class TieredLibrary : public Library {
 public:
  // New members start as Basic. Changing the tier of an unknown member returns NoSuchMember.
  // Demoting a member who holds more books than the new tier allows returns LimitReached and changes nothing.
  virtual Status setTier(const std::string& memberId, Tier tier) = 0;
  virtual Tier tierOf(const std::string& memberId) const = 0;  // Tier::Basic for unknown members
};

std::unique_ptr<TieredLibrary> makeTieredLibrary();

}  // namespace lib
