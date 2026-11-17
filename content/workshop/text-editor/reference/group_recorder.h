#pragma once
#include <cstddef>
#include <memory>
#include <utility>

#include "command.h"
#include "history.h"

// Sits between the editor and the history. Outside a group an edit goes straight to the history; inside one it is
// collected into a MacroCommand that becomes a single step when the outermost group ends.
class GroupRecorder {
 public:
  explicit GroupRecorder(History& history) : history_(history) {}

  void begin() {
    history_.seal();
    ++depth_;
  }

  bool end() {
    if (depth_ == 0) return false;
    --depth_;
    if (depth_ == 0 && pending_ != nullptr) history_.record(std::move(pending_));
    return true;
  }

  std::size_t depth() const { return depth_; }

  void submit(std::unique_ptr<Command> done) {
    if (depth_ == 0) {
      history_.record(std::move(done));
      return;
    }
    if (pending_ == nullptr) {
      pending_ = std::make_unique<MacroCommand>();
      history_.discardRedo();
    }
    pending_->add(std::move(done));
  }

 private:
  History& history_;
  std::size_t depth_ = 0;
  std::unique_ptr<MacroCommand> pending_;
};
