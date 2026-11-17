#include <algorithm>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
using Sz = std::size_t;

std::string str(const char* s) { return std::string(s); }

struct Fixture {
  std::unique_ptr<edit::Editor> ed = edit::makeEditor();
  void type(const std::string& s) {
    for (char c : s) ed->insert(std::string(1, c));
  }
};
}  // namespace

TEST(Edit, StartsEmptyWithTheCursorAtZero) {
  Fixture f;
  EXPECT_EQ(f.ed->text(), str(""));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(0));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(0));
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(0));
  EXPECT_FALSE(f.ed->undo());
  EXPECT_FALSE(f.ed->redo());
}

TEST(Edit, InsertGoesAtTheCursorAndMovesIt) {
  Fixture f;
  EXPECT_TRUE(f.ed->insert("hello"));
  EXPECT_EQ(f.ed->text(), str("hello"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(5));
  f.ed->moveTo(2);
  EXPECT_TRUE(f.ed->insert("XY"));
  EXPECT_EQ(f.ed->text(), str("heXYllo"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(4));
}

TEST(Edit, InsertingNothingIsRefusedAndRecordsNothing) {
  Fixture f;
  EXPECT_FALSE(f.ed->insert(""));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(0));
  f.ed->insert("a");
  EXPECT_FALSE(f.ed->insert(""));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(1));
}

TEST(Edit, BackspaceDeletesBeforeTheCursor) {
  Fixture f;
  f.ed->insert("abcdef");
  f.ed->moveTo(4);
  EXPECT_EQ(f.ed->backspace(2), static_cast<Sz>(2));
  EXPECT_EQ(f.ed->text(), str("abef"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(2));
}

TEST(Edit, BackspaceIsClampedAtTheStart) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->moveTo(2);
  EXPECT_EQ(f.ed->backspace(10), static_cast<Sz>(2));
  EXPECT_EQ(f.ed->text(), str("c"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(0));
  EXPECT_EQ(f.ed->backspace(1), static_cast<Sz>(0));
}

TEST(Edit, DeleteAheadDeletesAfterTheCursorAndKeepsIt) {
  Fixture f;
  f.ed->insert("abcdef");
  f.ed->moveTo(1);
  EXPECT_EQ(f.ed->deleteAhead(3), static_cast<Sz>(3));
  EXPECT_EQ(f.ed->text(), str("aef"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(1));
}

TEST(Edit, DeleteAheadIsClampedAtTheEnd) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->moveTo(1);
  EXPECT_EQ(f.ed->deleteAhead(99), static_cast<Sz>(2));
  EXPECT_EQ(f.ed->text(), str("a"));
  EXPECT_EQ(f.ed->deleteAhead(1), static_cast<Sz>(0));
}

TEST(Edit, DeletesThatRemoveNothingRecordNothing) {
  Fixture f;
  f.ed->insert("ab");
  f.ed->moveTo(0);
  EXPECT_EQ(f.ed->backspace(3), static_cast<Sz>(0));
  f.ed->moveTo(2);
  EXPECT_EQ(f.ed->deleteAhead(3), static_cast<Sz>(0));
  EXPECT_EQ(f.ed->backspace(0), static_cast<Sz>(0));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(1));
}

TEST(Edit, MoveToRejectsPositionsPastTheEnd) {
  Fixture f;
  f.ed->insert("abc");
  EXPECT_TRUE(f.ed->moveTo(0));
  EXPECT_TRUE(f.ed->moveTo(3));
  EXPECT_FALSE(f.ed->moveTo(4));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(3));
}

TEST(Undo, TakesBackAnInsertAndRestoresTheCursor) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->moveTo(1);
  f.ed->insert("XY");
  EXPECT_EQ(f.ed->text(), str("aXYbc"));
  EXPECT_TRUE(f.ed->undo());
  EXPECT_EQ(f.ed->text(), str("abc"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(1));
}

TEST(Undo, TakesBackABackspaceAndPutsTheCursorWhereItWas) {
  Fixture f;
  f.ed->insert("abcdef");
  f.ed->moveTo(4);
  f.ed->backspace(2);
  EXPECT_TRUE(f.ed->undo());
  EXPECT_EQ(f.ed->text(), str("abcdef"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(4));
}

TEST(Undo, TakesBackADeleteAndPutsTheCursorWhereItWas) {
  Fixture f;
  f.ed->insert("abcdef");
  f.ed->moveTo(1);
  f.ed->deleteAhead(3);
  EXPECT_TRUE(f.ed->undo());
  EXPECT_EQ(f.ed->text(), str("abcdef"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(1));
}

TEST(Undo, GoesBackOneStepAtATimeInReverseOrder) {
  Fixture f;
  f.ed->insert("one");
  f.ed->insert(" two");
  f.ed->insert(" three");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(3));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("one two"));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("one"));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str(""));
  EXPECT_FALSE(f.ed->undo());
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(3));
}

TEST(Undo, MovingTheCursorIsNotAStepAndDoesNotChangeWhatUndoTakesBack) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->moveTo(0);
  f.ed->moveTo(2);
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(1));
  EXPECT_TRUE(f.ed->undo());
  EXPECT_EQ(f.ed->text(), str(""));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(0));
}

TEST(Redo, ReappliesTheStepAndPutsTheCursorAfterIt) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->moveTo(1);
  f.ed->insert("XY");
  f.ed->undo();
  EXPECT_TRUE(f.ed->redo());
  EXPECT_EQ(f.ed->text(), str("aXYbc"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(3));
}

TEST(Redo, ReappliesABackspaceWithTheCursorWhereItEnded) {
  Fixture f;
  f.ed->insert("abcdef");
  f.ed->moveTo(4);
  f.ed->backspace(2);
  f.ed->undo();
  EXPECT_TRUE(f.ed->redo());
  EXPECT_EQ(f.ed->text(), str("abef"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(2));
}

TEST(Redo, ASecondUndoRedoRoundTripIsTheSameAsTheFirst) {
  Fixture f;
  f.ed->insert("abcdef");
  f.ed->moveTo(1);
  f.ed->deleteAhead(2);
  for (int round = 0; round < 3; ++round) {
    f.ed->undo();
    EXPECT_EQ(f.ed->text(), str("abcdef"));
    EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(1));
    f.ed->redo();
    EXPECT_EQ(f.ed->text(), str("adef"));
    EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(1));
  }
}

TEST(Redo, ANewEditDiscardsWhatCouldHaveBeenRedone) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->insert("def");
  f.ed->undo();
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(1));
  f.ed->insert("X");
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(0));
  EXPECT_FALSE(f.ed->redo());
  EXPECT_EQ(f.ed->text(), str("abcX"));
}

TEST(Redo, ADeleteAlsoDiscardsRedo) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->insert("def");
  f.ed->undo();
  EXPECT_EQ(f.ed->backspace(1), static_cast<Sz>(1));
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(0));
}

TEST(Redo, ACallThatChangedNothingKeepsRedo) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->insert("def");
  f.ed->undo();
  f.ed->insert("");
  f.ed->moveTo(0);
  f.ed->backspace(5);
  f.ed->moveTo(99);
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(1));
  EXPECT_TRUE(f.ed->redo());
  EXPECT_EQ(f.ed->text(), str("abcdef"));
}

TEST(Redo, MovingTheCursorKeepsRedoAndRedoStillAppliesWhereItWasRecorded) {
  Fixture f;
  f.ed->insert("hello");
  f.ed->insert(" world");
  f.ed->undo();
  f.ed->moveTo(0);
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(1));
  EXPECT_TRUE(f.ed->redo());
  EXPECT_EQ(f.ed->text(), str("hello world"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(11));
}

TEST(Undo, UndoStillWorksAfterMovingAwayFromTheEdit) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->insert("XYZ");
  f.ed->moveTo(0);
  EXPECT_TRUE(f.ed->undo());
  EXPECT_EQ(f.ed->text(), str("abc"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(3));
}

TEST(Undo, StepCountsFollowUndoAndRedo) {
  Fixture f;
  f.ed->insert("a");
  f.ed->insert("b");
  f.ed->insert("c");
  f.ed->undo();
  f.ed->undo();
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(1));
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(2));
  f.ed->redo();
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(1));
}

TEST(Undo, EverySingleKeystrokeIsItsOwnStepInTheBaseEditor) {
  Fixture f;
  f.type("hello world");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(11));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("hello worl"));
}

TEST(History, KeepsAtMostTheLastHundredSteps) {
  Fixture f;
  for (int i = 0; i < 130; ++i) f.ed->insert(std::string(1, static_cast<char>('a' + i % 26)));
  EXPECT_EQ(f.ed->undoSteps(), edit::kMaxUndoSteps);
  for (Sz i = 0; i < edit::kMaxUndoSteps; ++i) EXPECT_TRUE(f.ed->undo());
  EXPECT_FALSE(f.ed->undo());
  EXPECT_EQ(f.ed->text().size(), static_cast<Sz>(30));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(30));
}

TEST(History, ExactlyAHundredStepsAreAllKept) {
  Fixture f;
  for (int i = 0; i < 100; ++i) f.ed->insert("x");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(100));
  for (int i = 0; i < 100; ++i) EXPECT_TRUE(f.ed->undo());
  EXPECT_EQ(f.ed->text(), str(""));
}

TEST(History, TheLimitCountsStepsNotCharacters) {
  Fixture f;
  f.ed->insert(std::string(5000, 'a'));
  for (int i = 0; i < 99; ++i) f.ed->insert("b");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(100));
  for (int i = 0; i < 100; ++i) f.ed->undo();
  EXPECT_EQ(f.ed->text(), str(""));
}

TEST(History, RedoAfterTheLimitStillWorks) {
  Fixture f;
  for (int i = 0; i < 120; ++i) f.ed->insert("x");
  for (int i = 0; i < 100; ++i) f.ed->undo();
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(100));
  for (int i = 0; i < 100; ++i) EXPECT_TRUE(f.ed->redo());
  EXPECT_EQ(f.ed->text().size(), static_cast<Sz>(120));
}

TEST(Editors, AreIndependent) {
  auto a = edit::makeEditor();
  auto b = edit::makeEditor();
  a->insert("left");
  b->insert("right");
  a->undo();
  EXPECT_EQ(a->text(), str(""));
  EXPECT_EQ(b->text(), str("right"));
}

// A snapshot model: every step remembers the whole state before and after it. Simple and obviously right, so the
// editor under test must agree with it after every operation.
namespace {
struct State {
  std::string text;
  Sz cursor = 0;
};
struct Step {
  State before;
  State after;
};
class Model {
 public:
  bool insert(const std::string& s) {
    if (s.empty()) return false;
    State before = now_;
    now_.text.insert(now_.cursor, s);
    now_.cursor += s.size();
    record(before);
    return true;
  }
  Sz backspace(Sz n) {
    n = std::min(n, now_.cursor);
    if (n == 0) return 0;
    State before = now_;
    now_.text.erase(now_.cursor - n, n);
    now_.cursor -= n;
    record(before);
    return n;
  }
  Sz deleteAhead(Sz n) {
    n = std::min(n, now_.text.size() - now_.cursor);
    if (n == 0) return 0;
    State before = now_;
    now_.text.erase(now_.cursor, n);
    record(before);
    return n;
  }
  bool moveTo(Sz p) {
    if (p > now_.text.size()) return false;
    now_.cursor = p;
    return true;
  }
  bool undo() {
    if (undo_.empty()) return false;
    now_ = undo_.back().before;
    redo_.push_back(undo_.back());
    undo_.pop_back();
    return true;
  }
  bool redo() {
    if (redo_.empty()) return false;
    now_ = redo_.back().after;
    undo_.push_back(redo_.back());
    redo_.pop_back();
    return true;
  }
  const State& now() const { return now_; }
  Sz undoSteps() const { return undo_.size(); }
  Sz redoSteps() const { return redo_.size(); }

 private:
  void record(const State& before) {
    redo_.clear();
    undo_.push_back(Step{before, now_});
    if (undo_.size() > edit::kMaxUndoSteps) undo_.erase(undo_.begin());
  }
  State now_;
  std::vector<Step> undo_;
  std::vector<Step> redo_;
};
}  // namespace

TEST(Edit, AgreesWithASnapshotModelOnRandomOperations) {
  std::uint32_t seed = 12345;
  auto next = [&seed](std::uint32_t bound) {
    seed = seed * 1664525u + 1013904223u;
    return (seed >> 8) % bound;
  };
  Fixture f;
  Model model;
  for (int i = 0; i < 6000; ++i) {
    const std::uint32_t op = next(10);
    if (op <= 2) {
      std::string s(next(4), 'a');
      for (char& c : s) c = static_cast<char>('a' + next(26));
      EXPECT_EQ(f.ed->insert(s), model.insert(s));
    } else if (op == 3) {
      const Sz n = next(4);
      EXPECT_EQ(f.ed->backspace(n), model.backspace(n));
    } else if (op == 4) {
      const Sz n = next(4);
      EXPECT_EQ(f.ed->deleteAhead(n), model.deleteAhead(n));
    } else if (op == 5 || op == 6) {
      const Sz p = next(static_cast<std::uint32_t>(model.now().text.size() + 2));
      EXPECT_EQ(f.ed->moveTo(p), model.moveTo(p));
    } else if (op <= 8) {
      EXPECT_EQ(f.ed->undo(), model.undo());
    } else {
      EXPECT_EQ(f.ed->redo(), model.redo());
    }
    if (f.ed->text() != model.now().text || f.ed->cursor() != model.now().cursor ||
        f.ed->undoSteps() != model.undoSteps() || f.ed->redoSteps() != model.redoSteps()) {
      EXPECT_EQ(f.ed->text(), model.now().text);
      EXPECT_EQ(f.ed->cursor(), model.now().cursor);
      EXPECT_EQ(f.ed->undoSteps(), model.undoSteps());
      EXPECT_EQ(f.ed->redoSteps(), model.redoSteps());
      return;
    }
  }
}
