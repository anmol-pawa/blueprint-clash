#pragma once
#include <string>

// One thing that currently pays or charges a user: derived from the votes and acceptances that stand, never stored.
struct ReputationEvent {
  std::string user;
  int points = 0;
  int day = 0;         // the day of the vote behind it (0 for acceptances)
  bool capped = false; // upvote points are the ones a daily cap limits
};
