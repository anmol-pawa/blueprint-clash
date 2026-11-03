#include <string>
#include <type_traits>
#include "bp_test.h"
#include "solution.h"

namespace {
struct FixedScanner : Scanner {  // a scanner the solution has never seen
  std::string text;
  explicit FixedScanner(std::string t) : text(std::move(t)) {}
  std::string scan() override { return text; }
};
struct CountingPrinter : Printer {
  int jobs = 0;
  int print(const std::string& t) override {
    ++jobs;
    return static_cast<int>(t.size());
  }
};
}  // namespace

TEST(Roles, BasicPrinterIsOnlyAPrinter) {
  EXPECT_TRUE((std::is_base_of<Printer, BasicPrinter>::value));
}

TEST(Roles, BasicPrinterIsNotAScanner) {
  EXPECT_FALSE((std::is_base_of<Scanner, BasicPrinter>::value));
}

TEST(Roles, AllInOneHasBothRoles) {
  EXPECT_TRUE((std::is_base_of<Printer, AllInOne>::value));
  EXPECT_TRUE((std::is_base_of<Scanner, AllInOne>::value));
}

TEST(Print, RoundsPagesUp) {
  BasicPrinter p;
  EXPECT_EQ(p.print(""), 0);
  EXPECT_EQ(p.print("a"), 1);
  EXPECT_EQ(p.print("0123456789"), 1);
  EXPECT_EQ(p.print("0123456789a"), 2);
  AllInOne m;
  EXPECT_EQ(m.print(std::string(25, 'x')), 3);
}

TEST(Scan, NumbersEachDocument) {
  AllInOne m;
  EXPECT_EQ(m.scan(), std::string("scan#1"));
  EXPECT_EQ(m.scan(), std::string("scan#2"));
}

TEST(Copy, WorksWithSeparateScannerAndPrinter) {
  FixedScanner s(std::string(25, 'y'));
  BasicPrinter p;
  EXPECT_EQ(copyDocument(s, p), 3);
}

TEST(Copy, ScansOnceAndPrintsOnce) {
  FixedScanner s("hello");
  CountingPrinter p;
  EXPECT_EQ(copyDocument(s, p), 5);
  EXPECT_EQ(p.jobs, 1);
}

TEST(Copy, AnAllInOneCanCopyOntoItself) {
  AllInOne m;
  EXPECT_EQ(copyDocument(m, m), 1);  // "scan#1" is 6 characters
}
