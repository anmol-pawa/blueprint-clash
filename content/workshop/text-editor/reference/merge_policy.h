#pragma once
#include "command.h"

// Decides whether a new edit may join the step before it. A Strategy: the history asks and never looks at characters.
class MergePolicy {
 public:
  virtual ~MergePolicy() = default;
  virtual bool joins(const Command& open, const Command& next) const = 0;
};

class NeverMerge : public MergePolicy {
 public:
  bool joins(const Command& /*open*/, const Command& /*next*/) const override { return false; }
};

// Typing runs: single keystrokes join an open run until a space or a newline ends it (word-sized undo steps).
class TypingRuns : public MergePolicy {
 public:
  bool joins(const Command& open, const Command& next) const override {
    const TypedText* run = open.typedText();
    if (run == nullptr || next.typedText() == nullptr) return false;
    const char last = run->text.back();
    return last != ' ' && last != '\n';
  }
};
