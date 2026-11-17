#include <memory>
#include <string>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using Sz = std::size_t;
std::string str(const char* s) { return std::string(s); }

struct Fixture {
  std::unique_ptr<edit::GroupingEditor> ed = edit::makeTypingEditor();
  void type(const std::string& s) {
    for (char c : s) ed->insert(std::string(1, c));
  }
};
}  // namespace

TEST(Typing, ConsecutiveCharactersShareOneStep) {
  Fixture f;
  f.type("hello");
  EXPECT_EQ(f.ed->text(), str("hello"));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(1));
  EXPECT_TRUE(f.ed->undo());
  EXPECT_EQ(f.ed->text(), str(""));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(0));
}

TEST(Typing, ASpaceEndsTheRunAndIsPartOfIt) {
  Fixture f;
  f.type("hello world");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("hello "));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str(""));
}

TEST(Typing, ANewlineEndsTheRunToo) {
  Fixture f;
  f.type("ab\ncd");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("ab\n"));
}

TEST(Typing, SeveralSpacesInARowEachStartANewStepAfterTheFirst) {
  Fixture f;
  f.type("a  b");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(3));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("a  "));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("a "));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str(""));
}

TEST(Typing, RedoReappliesTheWholeRunAndPutsTheCursorAtItsEnd) {
  Fixture f;
  f.type("hello");
  f.ed->undo();
  EXPECT_TRUE(f.ed->redo());
  EXPECT_EQ(f.ed->text(), str("hello"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(5));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(1));
}

TEST(Typing, UndoPutsTheCursorWhereTheRunStarted) {
  Fixture f;
  f.ed->insert("abcdef");
  f.ed->moveTo(3);
  f.type("XYZ");
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("abcdef"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(3));
}

TEST(Typing, MovingTheCursorEndsTheRunEvenToTheSamePlace) {
  Fixture f;
  f.type("ab");
  f.ed->moveTo(2);
  f.type("cd");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("ab"));
}

TEST(Typing, AFailedMoveAlsoEndsTheRun) {
  Fixture f;
  f.type("ab");
  EXPECT_FALSE(f.ed->moveTo(50));
  f.type("cd");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
}

TEST(Typing, ADeleteEndsTheRunAndIsItsOwnStep) {
  Fixture f;
  f.type("abc");
  f.ed->backspace(1);
  f.type("de");
  EXPECT_EQ(f.ed->text(), str("abde"));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(3));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("ab"));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("abc"));
}

TEST(Typing, ADeleteThatRemovesNothingStillEndsTheRun) {
  Fixture f;
  f.type("ab");
  EXPECT_EQ(f.ed->deleteAhead(1), static_cast<Sz>(0));
  f.type("c");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
}

TEST(Typing, ABackspaceThatRemovesNothingStillEndsTheRun) {
  Fixture f;
  f.type("ab");
  EXPECT_EQ(f.ed->backspace(0), static_cast<Sz>(0));
  f.type("c");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
}

TEST(Typing, TypingAfterUndoingALaterStepDoesNotJoinTheRunUnderIt) {
  Fixture f;
  f.type("ab");
  f.ed->insert("PASTE");
  f.ed->undo();
  f.type("c");
  EXPECT_EQ(f.ed->text(), str("abc"));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("ab"));
}

TEST(Typing, AnEmptyInsertEndsTheRun) {
  Fixture f;
  f.type("ab");
  f.ed->insert("");
  f.type("cd");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
}

TEST(Typing, APasteIsItsOwnStepAndIsNeverPartOfARun) {
  Fixture f;
  f.type("ab");
  f.ed->insert("PASTE");
  f.type("cd");
  EXPECT_EQ(f.ed->text(), str("abPASTEcd"));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(3));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("abPASTE"));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("ab"));
}

TEST(Typing, TypingRightAfterAPasteDoesNotJoinIt) {
  Fixture f;
  f.ed->insert("PASTE");
  f.type("x");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
}

TEST(Typing, UndoAndRedoEndTheRun) {
  Fixture f;
  f.type("ab");
  f.ed->undo();
  f.type("cd");
  EXPECT_EQ(f.ed->text(), str("cd"));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(1));
  f.ed->undo();
  f.ed->redo();
  f.type("e");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
  EXPECT_EQ(f.ed->text(), str("cde"));
}

TEST(Typing, ARedoWithNothingToRedoStillEndsTheRun) {
  Fixture f;
  f.type("ab");
  EXPECT_FALSE(f.ed->redo());
  f.type("c");
  EXPECT_EQ(f.ed->text(), str("abc"));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
}

TEST(Typing, TypingAfterAnUndoDoesNotJoinTheOlderRunBeforeIt) {
  Fixture f;
  f.type("ab ");
  f.type("cd");
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("ab "));
  f.type("x");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("ab "));
}

TEST(Typing, TypingDiscardsRedoLikeAnyEdit) {
  Fixture f;
  f.type("ab ");
  f.type("cd");
  f.ed->undo();
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(1));
  f.type("x");
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(0));
}

TEST(Typing, ARunInsideAGroupDoesNotMergeWithAnythingOutside) {
  Fixture f;
  f.type("ab");
  f.ed->beginGroup();
  f.type("cd");
  f.ed->endGroup();
  f.type("ef");
  EXPECT_EQ(f.ed->text(), str("abcdef"));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(3));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("abcd"));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("ab"));
}

TEST(Typing, BeginningAGroupEndsTheRunEvenIfTheGroupIsEmpty) {
  Fixture f;
  f.type("ab");
  f.ed->beginGroup();
  f.ed->endGroup();
  f.type("cd");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
}

TEST(Typing, TheStepLimitCountsRunsNotKeystrokes) {
  Fixture f;
  for (int i = 0; i < 150; ++i) {
    f.type("word");
    f.ed->moveTo(f.ed->text().size());
  }
  EXPECT_EQ(f.ed->undoSteps(), edit::kMaxUndoSteps);
  for (Sz i = 0; i < edit::kMaxUndoSteps; ++i) EXPECT_TRUE(f.ed->undo());
  EXPECT_FALSE(f.ed->undo());
  EXPECT_EQ(f.ed->text().size(), static_cast<Sz>(200));
}

TEST(Typing, AMergedRunKeepsGrowingInsideTheLimit) {
  Fixture f;
  for (int i = 0; i < 99; ++i) {
    f.ed->insert("--");
  }
  f.type(std::string(500, 'z'));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(100));
  f.ed->undo();
  EXPECT_EQ(f.ed->text().size(), static_cast<Sz>(198));
}

TEST(Typing, TheBaseAndGroupingEditorsStillNeverMerge) {
  auto base = edit::makeEditor();
  auto grouping = edit::makeGroupingEditor();
  for (char c : std::string("abc")) {
    base->insert(std::string(1, c));
    grouping->insert(std::string(1, c));
  }
  EXPECT_EQ(base->undoSteps(), static_cast<Sz>(3));
  EXPECT_EQ(grouping->undoSteps(), static_cast<Sz>(3));
}

TEST(Typing, ATypingEditorStillHandlesTheBaseOperations) {
  Fixture f;
  f.ed->insert("hello");
  f.ed->moveTo(1);
  EXPECT_EQ(f.ed->deleteAhead(2), static_cast<Sz>(2));
  EXPECT_TRUE(f.ed->undo());
  EXPECT_EQ(f.ed->text(), str("hello"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(1));
}
