#include <memory>
#include <string>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
using Sz = std::size_t;
std::string str(const char* s) { return std::string(s); }

struct Fixture {
  std::unique_ptr<edit::GroupingEditor> ed = edit::makeGroupingEditor();
};
}  // namespace

TEST(Group, EditsInsideAGroupAreOneUndoStep) {
  Fixture f;
  f.ed->insert("abc");
  EXPECT_TRUE(f.ed->beginGroup());
  f.ed->insert("X");
  f.ed->insert("Y");
  f.ed->backspace(1);
  f.ed->insert("Z");
  EXPECT_TRUE(f.ed->endGroup());
  EXPECT_EQ(f.ed->text(), str("abcXZ"));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
  EXPECT_TRUE(f.ed->undo());
  EXPECT_EQ(f.ed->text(), str("abc"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(3));
}

TEST(Group, RedoReappliesTheWholeGroupInOrder) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->beginGroup();
  f.ed->moveTo(1);
  f.ed->insert("X");
  f.ed->deleteAhead(1);
  f.ed->insert("Y");
  f.ed->endGroup();
  EXPECT_EQ(f.ed->text(), str("aXYc"));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("abc"));
  EXPECT_TRUE(f.ed->redo());
  EXPECT_EQ(f.ed->text(), str("aXYc"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(3));
}

TEST(Group, UndoPutsTheCursorWhereItWasBeforeTheGroupsFirstEdit) {
  Fixture f;
  f.ed->insert("0123456789");
  f.ed->moveTo(7);
  f.ed->beginGroup();
  f.ed->moveTo(2);
  f.ed->insert("AA");
  f.ed->moveTo(9);
  f.ed->deleteAhead(1);
  f.ed->endGroup();
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("0123456789"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(2));
}

TEST(Group, TheCursorMovesInsideAGroupAreNotPartOfTheStep) {
  Fixture f;
  f.ed->insert("abcdef");
  f.ed->beginGroup();
  f.ed->moveTo(3);
  f.ed->insert("-");
  f.ed->endGroup();
  f.ed->moveTo(0);
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("abcdef"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(3));
}

TEST(Group, NestedGroupsFormOneStepAtTheOutermostEnd) {
  Fixture f;
  f.ed->beginGroup();
  f.ed->insert("a");
  f.ed->beginGroup();
  f.ed->insert("b");
  EXPECT_EQ(f.ed->openGroups(), static_cast<Sz>(2));
  EXPECT_TRUE(f.ed->endGroup());
  EXPECT_EQ(f.ed->openGroups(), static_cast<Sz>(1));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(0));
  f.ed->insert("c");
  EXPECT_TRUE(f.ed->endGroup());
  EXPECT_EQ(f.ed->openGroups(), static_cast<Sz>(0));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(1));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str(""));
}

TEST(Group, EndingWithNoOpenGroupIsRefused) {
  Fixture f;
  EXPECT_FALSE(f.ed->endGroup());
  f.ed->beginGroup();
  EXPECT_TRUE(f.ed->endGroup());
  EXPECT_FALSE(f.ed->endGroup());
  EXPECT_EQ(f.ed->openGroups(), static_cast<Sz>(0));
}

TEST(Group, AnEmptyGroupRecordsNothing) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->undo();
  f.ed->beginGroup();
  f.ed->endGroup();
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(0));
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(1));
}

TEST(Group, AGroupOfOnlyNoOpsRecordsNothing) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->beginGroup();
  f.ed->insert("");
  f.ed->backspace(0);
  f.ed->moveTo(0);
  f.ed->backspace(3);
  f.ed->endGroup();
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(1));
}

TEST(Group, UndoAndRedoAreRefusedWhileAGroupIsOpen) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->insert("def");
  f.ed->undo();
  f.ed->beginGroup();
  f.ed->insert("X");
  EXPECT_FALSE(f.ed->undo());
  EXPECT_FALSE(f.ed->redo());
  EXPECT_EQ(f.ed->text(), str("abcX"));
  f.ed->endGroup();
  EXPECT_TRUE(f.ed->undo());
  EXPECT_EQ(f.ed->text(), str("abc"));
}

TEST(Group, UndoStepsCountOnlyFinishedSteps) {
  Fixture f;
  f.ed->insert("a");
  f.ed->beginGroup();
  f.ed->insert("b");
  f.ed->insert("c");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(1));
  f.ed->endGroup();
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
}

TEST(Group, TheFirstEditInsideAGroupDiscardsRedo) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->insert("def");
  f.ed->undo();
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(1));
  f.ed->beginGroup();
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(1));
  f.ed->insert("X");
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(0));
  f.ed->endGroup();
  EXPECT_FALSE(f.ed->redo());
}

TEST(Group, AGroupWithNoEditKeepsRedo) {
  Fixture f;
  f.ed->insert("abc");
  f.ed->undo();
  f.ed->beginGroup();
  f.ed->moveTo(0);
  f.ed->endGroup();
  EXPECT_EQ(f.ed->redoSteps(), static_cast<Sz>(1));
}

TEST(Group, AGroupCountsAsOneStepAgainstTheLimit) {
  Fixture f;
  f.ed->beginGroup();
  for (int i = 0; i < 300; ++i) f.ed->insert("x");
  f.ed->endGroup();
  for (int i = 0; i < 99; ++i) f.ed->insert("y");
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(100));
  for (int i = 0; i < 99; ++i) f.ed->undo();
  EXPECT_EQ(f.ed->text().size(), static_cast<Sz>(300));
  EXPECT_TRUE(f.ed->undo());
  EXPECT_EQ(f.ed->text(), str(""));
}

TEST(Group, TheOldestStepIsDroppedWhenAGroupOverflowsTheLimit) {
  Fixture f;
  for (int i = 0; i < 100; ++i) f.ed->insert("a");
  f.ed->beginGroup();
  f.ed->insert("G");
  f.ed->insert("H");
  f.ed->endGroup();
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(100));
  for (int i = 0; i < 100; ++i) f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("a"));
}

TEST(Group, AGroupedEditorStillBehavesLikeTheBaseEditorOutsideGroups) {
  Fixture f;
  f.ed->insert("hello");
  f.ed->moveTo(2);
  EXPECT_EQ(f.ed->deleteAhead(2), static_cast<Sz>(2));
  EXPECT_TRUE(f.ed->undo());
  EXPECT_EQ(f.ed->text(), str("hello"));
  EXPECT_EQ(f.ed->cursor(), static_cast<Sz>(2));
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(1));
  EXPECT_EQ(f.ed->openGroups(), static_cast<Sz>(0));
}

TEST(Group, TwoGroupsInARowAreTwoSteps) {
  Fixture f;
  f.ed->beginGroup();
  f.ed->insert("a");
  f.ed->insert("b");
  f.ed->endGroup();
  f.ed->beginGroup();
  f.ed->insert("c");
  f.ed->insert("d");
  f.ed->endGroup();
  EXPECT_EQ(f.ed->undoSteps(), static_cast<Sz>(2));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str("ab"));
  f.ed->undo();
  EXPECT_EQ(f.ed->text(), str(""));
}
