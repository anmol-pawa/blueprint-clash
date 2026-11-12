#pragma once
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "entry_table.h"

// Remembers how to undo writes, one frame per open transaction. Each record is the key plus what it held before
// the write, so undoing is "put this back", whatever the write was. This is the Command / Memento idea in its
// smallest form: the journal stores the inverse, not the operation.
class UndoJournal {
 public:
  int depth() const { return static_cast<int>(frames_.size()); }
  bool isOpen() const { return !frames_.empty(); }

  void begin() { frames_.emplace_back(); }

  // Called before a write. Outside any transaction there is nothing to undo, so nothing is kept.
  void record(const std::string& key, const Entry* before) {
    if (frames_.empty()) return;
    frames_.back().push_back({key, before == nullptr ? std::nullopt : std::optional<Entry>(*before)});
  }

  // Closes the innermost frame and keeps its records for the frame around it. False when none is open.
  bool commit() {
    if (frames_.empty()) return false;
    Frame done = std::move(frames_.back());
    frames_.pop_back();
    if (!frames_.empty()) {
      for (auto& record : done) frames_.back().push_back(std::move(record));
    }
    return true;
  }

  // Closes the innermost frame and undoes its records, newest first. False when none is open.
  bool rollbackInto(EntryTable& table) {
    if (frames_.empty()) return false;
    Frame done = std::move(frames_.back());
    frames_.pop_back();
    for (auto it = done.rbegin(); it != done.rend(); ++it) table.restore(it->key, std::move(it->before));
    return true;
  }

 private:
  struct Record {
    std::string key;
    std::optional<Entry> before;
  };
  using Frame = std::vector<Record>;
  std::vector<Frame> frames_;
};
