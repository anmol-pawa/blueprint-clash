#include "api.h"
#include "bp_test.h"

using lib::Status;

namespace {
std::unique_ptr<lib::Library> shelf() {
  auto l = lib::makeLibrary();
  l->addBook("b1", "Dune", "Herbert", 1);
  l->addBook("b2", "Emma", "Austen", 2);
  l->addBook("b3", "Persuasion", "Austen", 1);
  l->addBook("b4", "Ulysses", "Joyce", 1);
  l->addMember("m1", "Ann");
  l->addMember("m2", "Bo");
  return l;
}
}  // namespace

TEST(Registration, DuplicateIdsAreRefused) {
  auto l = shelf();
  EXPECT_EQ(l->addBook("b1", "Other", "X", 1), Status::DuplicateId);
  EXPECT_EQ(l->addMember("m1", "Other"), Status::DuplicateId);
  EXPECT_EQ(l->availableCopies("b1"), 1);
}

TEST(Registration, UnknownBookHasNoCopies) {
  auto l = shelf();
  EXPECT_EQ(l->availableCopies("nope"), -1);
}

TEST(Borrowing, BorrowTakesACopy) {
  auto l = shelf();
  EXPECT_EQ(l->borrow("m1", "b2"), Status::Ok);
  EXPECT_EQ(l->availableCopies("b2"), 1);
  ASSERT_EQ(l->loansOf("m1").size(), 1u);
  EXPECT_EQ(l->loansOf("m1")[0], "b2");
}

TEST(Borrowing, ReturnRestoresCopy) {
  auto l = shelf();
  l->borrow("m1", "b1");
  EXPECT_EQ(l->availableCopies("b1"), 0);
  EXPECT_EQ(l->giveBack("m1", "b1"), Status::Ok);
  EXPECT_EQ(l->availableCopies("b1"), 1);
  EXPECT_TRUE(l->loansOf("m1").empty());
}

TEST(Borrowing, NoCopiesLeft) {
  auto l = shelf();
  EXPECT_EQ(l->borrow("m1", "b1"), Status::Ok);
  EXPECT_EQ(l->borrow("m2", "b1"), Status::NoCopiesAvailable);
  EXPECT_TRUE(l->loansOf("m2").empty());
}

TEST(Borrowing, UnknownMemberOrBook) {
  auto l = shelf();
  EXPECT_EQ(l->borrow("zz", "b1"), Status::NoSuchMember);
  EXPECT_EQ(l->borrow("m1", "zz"), Status::NoSuchBook);
  EXPECT_EQ(l->giveBack("zz", "b1"), Status::NoSuchMember);
  EXPECT_EQ(l->giveBack("m1", "zz"), Status::NoSuchBook);
  EXPECT_EQ(l->availableCopies("b1"), 1);
}

TEST(Borrowing, ReturningWhatYouDoNotHold) {
  auto l = shelf();
  EXPECT_EQ(l->giveBack("m1", "b1"), Status::NotBorrowed);
  EXPECT_EQ(l->availableCopies("b1"), 1);
}

TEST(Limits, FourthBookIsRefused) {
  auto l = shelf();
  EXPECT_EQ(l->borrow("m1", "b1"), Status::Ok);
  EXPECT_EQ(l->borrow("m1", "b2"), Status::Ok);
  EXPECT_EQ(l->borrow("m1", "b3"), Status::Ok);
  EXPECT_EQ(l->borrow("m1", "b4"), Status::LimitReached);
  EXPECT_EQ(l->availableCopies("b4"), 1);
  EXPECT_EQ(l->loansOf("m1").size(), 3u);
}

TEST(Limits, SameBookTwiceIsRefused) {
  auto l = shelf();
  EXPECT_EQ(l->borrow("m1", "b2"), Status::Ok);
  EXPECT_EQ(l->borrow("m1", "b2"), Status::AlreadyBorrowed);
  EXPECT_EQ(l->availableCopies("b2"), 1);
}

TEST(Limits, ReturnFreesALoanSlot) {
  auto l = shelf();
  l->borrow("m1", "b1");
  l->borrow("m1", "b2");
  l->borrow("m1", "b3");
  EXPECT_EQ(l->giveBack("m1", "b1"), Status::Ok);
  EXPECT_EQ(l->borrow("m1", "b4"), Status::Ok);
  EXPECT_EQ(l->borrow("m2", "b1"), Status::Ok);
}

TEST(Search, ByAuthorIsExactAndSorted) {
  auto l = shelf();
  auto austen = l->findByAuthor("Austen");
  ASSERT_EQ(austen.size(), 2u);
  EXPECT_EQ(austen[0], "b2");
  EXPECT_EQ(austen[1], "b3");
  EXPECT_TRUE(l->findByAuthor("austen").empty());
}

TEST(Search, LoansAreSorted) {
  auto l = shelf();
  l->borrow("m1", "b3");
  l->borrow("m1", "b1");
  auto loans = l->loansOf("m1");
  ASSERT_EQ(loans.size(), 2u);
  EXPECT_EQ(loans[0], "b1");
  EXPECT_EQ(loans[1], "b3");
}
