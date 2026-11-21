#pragma once
// Change Storm 1: a daily cap on reputation earned from votes.
#include "api.h"

namespace qa {

// makeCappedSite(dailyCap) is a site with everything makeSite() has, plus days and a cap (dailyCap >= 1, otherwise nullptr).
// Every vote belongs to the DAY it was cast (the replaced vote's day does not carry over). setDay(day) moves the clock:
// InvalidInput when day is below the current day (never backwards) or above kMaxDay; the same day is fine; the clock
// starts at day 0.
//
// THE CAP: for each user and each day, the points earned from UPVOTES that were cast that day count at most dailyCap
// in total. Everything else is uncapped: downvote penalties (to the author and to the voter), and the acceptance points
// (+15 and +2). So a user's reputation is 1 + sum over days of (min(dailyCap, upvote points of that day) + penalties of
// that day) + acceptance points, never below 1. Because reputation is derived, taking a vote back or removing a post
// can lift a day back under the cap, and the numbers must come out as if the vote had never been cast.
class CappedSite : public Site {
 public:
  virtual Status setDay(int day) = 0;
};

std::unique_ptr<CappedSite> makeCappedSite(int dailyCap);

}  // namespace qa
