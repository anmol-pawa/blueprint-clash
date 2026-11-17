#pragma once
#include "api.h"

// The legal moves of a trip, in one table. Matched can go to Arrived-or-InProgress or Cancelled; InProgress can only
// complete. "Arrived" is a flag on a Matched trip, so the public TripState enum stays the base game's.
enum class Step { Arrive, Start, Cancel, Complete };

class TripMachine {
 public:
  static bool allows(ride::TripState from, Step step) {
    switch (step) {
      case Step::Arrive: return from == ride::TripState::Matched;
      case Step::Start: return from == ride::TripState::Matched;
      case Step::Cancel: return from == ride::TripState::Matched;
      case Step::Complete: return from == ride::TripState::InProgress;
    }
    return false;
  }
  static ride::TripState after(Step step) {
    switch (step) {
      case Step::Arrive: return ride::TripState::Matched;
      case Step::Start: return ride::TripState::InProgress;
      case Step::Cancel: return ride::TripState::Cancelled;
      case Step::Complete: return ride::TripState::Completed;
    }
    return ride::TripState::None;
  }
};
