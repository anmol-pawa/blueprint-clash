#include <string>
#include <type_traits>
#include "bp_test.h"
#include "solution.h"

TEST(Editor, TypingInsertsAtTheCursorAndAdvancesIt) {
  Editor e;
  e.type("held");
  e.moveCursor(2);
  e.type("l");
  EXPECT_EQ(e.text(), std::string("helld"));
  EXPECT_EQ(e.cursor(), static_cast<std::size_t>(3));
}

TEST(Editor, CursorIsClampedToTheText) {
  Editor e;
  e.type("abc");
  e.moveCursor(99);
  EXPECT_EQ(e.cursor(), static_cast<std::size_t>(3));
}

TEST(Snapshot, RestoreBringsBackTextAndCursor) {
  Editor e;
  e.type("hello");
  e.moveCursor(2);
  auto snap = e.save();
  e.moveCursor(5);
  e.type(" world");
  e.restore(snap);
  EXPECT_EQ(e.text(), std::string("hello"));
  EXPECT_EQ(e.cursor(), static_cast<std::size_t>(2));
}

TEST(Snapshot, IsAValueNotAViewOfTheEditor) {
  Editor e;
  e.type("one");
  auto snap = e.save();
  e.type(" two");
  e.type(" three");
  e.restore(snap);
  EXPECT_EQ(e.text(), std::string("one"));
}

TEST(Snapshot, CanBeRestoredMoreThanOnce) {
  Editor e;
  e.type("a");
  auto snap = e.save();
  e.type("b");
  e.restore(snap);
  e.type("c");
  e.restore(snap);
  EXPECT_EQ(e.text(), std::string("a"));
}

TEST(Snapshot, OnlyTheEditorCanMakeOne) {
  EXPECT_FALSE((std::is_constructible<Editor::Snapshot, std::string, std::size_t>::value));
  EXPECT_FALSE(std::is_default_constructible<Editor::Snapshot>::value);
  EXPECT_TRUE(std::is_copy_constructible<Editor::Snapshot>::value);
}

TEST(History, UndoGoesBackNewestFirst) {
  Editor e;
  History h;
  h.push(e.save());
  e.type("a");
  h.push(e.save());
  e.type("b");
  h.push(e.save());
  e.type("c");
  EXPECT_EQ(e.text(), std::string("abc"));
  EXPECT_TRUE(h.undo(e));
  EXPECT_EQ(e.text(), std::string("ab"));
  EXPECT_TRUE(h.undo(e));
  EXPECT_EQ(e.text(), std::string("a"));
  EXPECT_TRUE(h.undo(e));
  EXPECT_EQ(e.text(), std::string(""));
  EXPECT_EQ(h.size(), static_cast<std::size_t>(0));
}

TEST(History, UndoOnEmptyHistoryChangesNothing) {
  Editor e;
  e.type("keep");
  History h;
  EXPECT_FALSE(h.undo(e));
  EXPECT_EQ(e.text(), std::string("keep"));
  EXPECT_EQ(e.cursor(), static_cast<std::size_t>(4));
}

TEST(History, UndoRestoresTheCursorToo) {
  Editor e;
  e.type("abcdef");
  e.moveCursor(3);
  History h;
  h.push(e.save());
  e.moveCursor(0);
  e.type("XY");
  EXPECT_TRUE(h.undo(e));
  EXPECT_EQ(e.cursor(), static_cast<std::size_t>(3));
  EXPECT_EQ(e.text(), std::string("abcdef"));
}
