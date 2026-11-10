#include <memory>
#include <string>
#include "bp_test.h"
#include "solution.h"

namespace {
void type(History& h, TextBuffer& b, const std::string& s) { h.run(std::make_unique<AppendCommand>(b, s)); }
void erase(History& h, TextBuffer& b, std::size_t n) { h.run(std::make_unique<EraseCommand>(b, n)); }
}  // namespace

TEST(Append, ExecuteAppendsText) {
  TextBuffer b;
  History h;
  type(h, b, "hello");
  type(h, b, " world");
  EXPECT_EQ(b.text(), std::string("hello world"));
}

TEST(Append, UndoRemovesExactlyWhatWasAppended) {
  TextBuffer b;
  History h;
  type(h, b, "ab");
  type(h, b, "cdef");
  EXPECT_TRUE(h.undo());
  EXPECT_EQ(b.text(), std::string("ab"));
}


TEST(Erase, RemovesFromTheEnd) {
  TextBuffer b;
  History h;
  type(h, b, "abcdef");
  erase(h, b, 2);
  EXPECT_EQ(b.text(), std::string("abcd"));
}

TEST(Erase, UndoRestoresTheRemovedCharacters) {
  TextBuffer b;
  History h;
  type(h, b, "abcdef");
  erase(h, b, 3);
  EXPECT_TRUE(h.undo());
  EXPECT_EQ(b.text(), std::string("abcdef"));
}

TEST(Erase, UndoRestoresOnlyWhatWasRemoved) {
  TextBuffer b;
  History h;
  type(h, b, "abc");
  erase(h, b, 5);  // only 3 characters exist
  EXPECT_EQ(b.text(), std::string(""));
  EXPECT_TRUE(h.undo());
  EXPECT_EQ(b.text(), std::string("abc"));
}

TEST(History, UndoThenRedoRestoresTheState) {
  TextBuffer b;
  History h;
  type(h, b, "one");
  type(h, b, "two");
  EXPECT_TRUE(h.undo());
  EXPECT_EQ(b.text(), std::string("one"));
  EXPECT_TRUE(h.redo());
  EXPECT_EQ(b.text(), std::string("onetwo"));
}

TEST(History, UndoWalksBackThroughEveryAction) {
  TextBuffer b;
  History h;
  type(h, b, "ab");
  erase(h, b, 1);
  type(h, b, "XY");
  EXPECT_EQ(b.text(), std::string("aXY"));
  h.undo();
  EXPECT_EQ(b.text(), std::string("a"));
  h.undo();
  EXPECT_EQ(b.text(), std::string("ab"));
  h.undo();
  EXPECT_EQ(b.text(), std::string(""));
  EXPECT_FALSE(h.canUndo());
  EXPECT_TRUE(h.canRedo());
}

TEST(History, RedoAfterEraseReplaysTheErase) {
  TextBuffer b;
  History h;
  type(h, b, "hello");
  erase(h, b, 2);
  h.undo();
  EXPECT_EQ(b.text(), std::string("hello"));
  h.redo();
  EXPECT_EQ(b.text(), std::string("hel"));
}

TEST(History, NewActionDiscardsTheRedoStack) {
  TextBuffer b;
  History h;
  type(h, b, "a");
  type(h, b, "b");
  h.undo();
  EXPECT_TRUE(h.canRedo());
  type(h, b, "c");
  EXPECT_FALSE(h.canRedo());
  EXPECT_FALSE(h.redo());
  EXPECT_EQ(b.text(), std::string("ac"));
}

TEST(History, UndoAndRedoOnEmptyHistoryReturnFalse) {
  TextBuffer b;
  History h;
  EXPECT_FALSE(h.canUndo());
  EXPECT_FALSE(h.canRedo());
  EXPECT_FALSE(h.undo());
  EXPECT_FALSE(h.redo());
  EXPECT_EQ(b.text(), std::string(""));
}

TEST(History, FlagsTrackTheStacks) {
  TextBuffer b;
  History h;
  type(h, b, "x");
  EXPECT_TRUE(h.canUndo());
  EXPECT_FALSE(h.canRedo());
  h.undo();
  EXPECT_FALSE(h.canUndo());
  EXPECT_TRUE(h.canRedo());
}
