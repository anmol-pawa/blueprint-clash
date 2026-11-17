#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
using fs::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

std::string join(const std::vector<std::string>& v) {
  std::string out;
  for (const auto& s : v) out += (out.empty() ? "" : ",") + s;
  return out;
}

struct Fixture {
  std::unique_ptr<fs::SearchableFileSystem> fs = fs::makeSearchableFileSystem();
  void file(const std::string& path) { fs->write(path, "x"); }
  void dir(const std::string& path) { fs->mkdir(path); }
  std::string find(const std::string& where, const std::string& pattern) {
    std::vector<std::string> found{"<unset>"};
    const Status s = fs->find(where, pattern, found);
    return s == Status::Ok ? join(found) : "<error>";
  }
};
}  // namespace

TEST(Find, StarMatchesAnyRunOfCharactersIncludingNone) {
  Fixture f;
  f.file("/a");
  f.file("/a.txt");
  f.file("/ab.txt");
  f.file("/.txt");
  f.file("/b.md");
  EXPECT_EQ(f.find("/", "*.txt"), std::string("/.txt,/a.txt,/ab.txt"));
  EXPECT_EQ(f.find("/", "a*"), std::string("/a,/a.txt,/ab.txt"));
  EXPECT_EQ(f.find("/", "*"), std::string("/.txt,/a,/a.txt,/ab.txt,/b.md"));
  EXPECT_EQ(f.find("/", "a*.txt"), std::string("/a.txt,/ab.txt"));
}

TEST(Find, QuestionMarkIsExactlyOneCharacter) {
  Fixture f;
  f.file("/a1");
  f.file("/a22");
  f.file("/a");
  f.file("/b1");
  EXPECT_EQ(f.find("/", "a?"), std::string("/a1"));
  EXPECT_EQ(f.find("/", "?1"), std::string("/a1,/b1"));
  EXPECT_EQ(f.find("/", "a??"), std::string("/a22"));
  EXPECT_EQ(f.find("/", "?"), std::string("/a"));
}

TEST(Find, TheWholeNameMustMatchAndCaseMatters) {
  Fixture f;
  f.file("/log");
  f.file("/logs");
  f.file("/Log");
  EXPECT_EQ(f.find("/", "log"), std::string("/log"));
  EXPECT_EQ(f.find("/", "Log"), std::string("/Log"));
  EXPECT_EQ(f.find("/", "lo"), std::string(""));
  EXPECT_EQ(f.find("/", "L*"), std::string("/Log"));
}

TEST(Find, StarBacktracksAndManyStarsStayFast) {
  Fixture f;
  f.file("/aab");
  f.file("/aaab");
  f.file("/abab");
  f.file("/" + std::string(30, 'a') + "c");
  EXPECT_EQ(f.find("/", "*ab"), std::string("/aaab,/aab,/abab"));
  EXPECT_EQ(f.find("/", "a*ab"), std::string("/aaab,/aab,/abab"));
  EXPECT_EQ(f.find("/", "a*b*b"), std::string("/abab"));
  EXPECT_EQ(f.find("/", "*a*a*a*a*a*a*a*a*a*a*b"), std::string(""));
}

TEST(Find, PatternsMatchTheNameAndNotThePath) {
  Fixture f;
  f.dir("/docs");
  f.file("/docs/x.txt");
  f.file("/docs/d.txt");
  EXPECT_EQ(f.find("/", "x*"), std::string("/docs/x.txt"));
  EXPECT_EQ(f.find("/", "d*"), std::string("/docs,/docs/d.txt"));
  EXPECT_EQ(f.find("/", "docs"), std::string("/docs"));
}

TEST(Find, SearchesEveryLevelDepthFirstWithDirectoriesBeforeTheirContents) {
  Fixture f;
  f.dir("/a");
  f.file("/a/m.log");
  f.dir("/a/b");
  f.file("/a/b/n.log");
  f.file("/a-b.log");
  f.file("/z.log");
  EXPECT_EQ(f.find("/", "*"), std::string("/a,/a/b,/a/b/n.log,/a/m.log,/a-b.log,/z.log"));
  EXPECT_EQ(f.find("/", "*.log"), std::string("/a/b/n.log,/a/m.log,/a-b.log,/z.log"));
}

TEST(Find, DirectoriesMatchToo) {
  Fixture f;
  f.dir("/build");
  f.dir("/build/build-x");
  f.file("/build/build-x/f");
  f.file("/builder");
  EXPECT_EQ(f.find("/", "build*"), std::string("/build,/build/build-x,/builder"));
}

TEST(Find, StartsBelowTheGivenDirectoryAndNeverReportsItself) {
  Fixture f;
  f.dir("/a");
  f.dir("/a/b");
  f.file("/a/b/f");
  f.file("/g");
  EXPECT_EQ(f.find("/a", "*"), std::string("/a/b,/a/b/f"));
  EXPECT_EQ(f.find("/a/", "b"), std::string("/a/b"));
  EXPECT_EQ(f.find("/a/b/../b/.", "*"), std::string("/a/b/f"));
  EXPECT_EQ(f.find("/a/b", "b"), std::string(""));
  EXPECT_EQ(f.find("/", "a"), std::string("/a"));
}

TEST(Find, NoMatchIsOkAndReplacesTheResult) {
  Fixture f;
  f.file("/a");
  std::vector<std::string> found{"old1", "old2"};
  IS(f.fs->find("/", "zzz", found), Ok);
  EXPECT_TRUE(found.empty());
  IS(f.fs->find("/", "a", found), Ok);
  IS(f.fs->find("/", "a", found), Ok);
  EXPECT_EQ(join(found), std::string("/a"));
}

TEST(Find, ErrorsLeaveTheResultAlone) {
  Fixture f;
  f.file("/file");
  f.dir("/d");
  std::vector<std::string> found{"keep"};
  IS(f.fs->find("/nope", "*", found), NotFound);
  IS(f.fs->find("/file", "*", found), NotADirectory);
  IS(f.fs->find("/d", "", found), InvalidPath);
  IS(f.fs->find("/d", "a/b", found), InvalidPath);
  IS(f.fs->find("d", "*", found), InvalidPath);
  IS(f.fs->find("/" + std::string(fs::kMaxNameLength + 1, 'x'), "*", found), InvalidPath);
  IS(f.fs->find("relative", "", found), InvalidPath);
  EXPECT_EQ(join(found), std::string("keep"));
}

TEST(Find, TheSameTreeStillBehavesLikeTheBaseFileSystem) {
  Fixture f;
  IS(f.fs->mkdir("/a"), Ok);
  IS(f.fs->write("/a/f", "12"), Ok);
  IS(f.fs->move("/a", "/b"), Ok);
  std::size_t n = 0;
  IS(f.fs->size("/b", n), Ok);
  EXPECT_EQ(n, static_cast<std::size_t>(2));
}
