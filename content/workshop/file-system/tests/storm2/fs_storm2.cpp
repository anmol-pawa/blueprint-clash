#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using fs::Kind;
using fs::Status;
using Sz = std::size_t;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

std::string join(const std::vector<std::string>& v) {
  std::string out;
  for (const auto& s : v) out += (out.empty() ? "" : ",") + s;
  return out;
}

struct Fixture {
  std::unique_ptr<fs::LinkingFileSystem> fs = fs::makeLinkingFileSystem();
  std::string read(const std::string& path) {
    std::string out = "<unread>";
    fs->read(path, out);
    return out;
  }
  std::string ls(const std::string& path) {
    std::vector<std::string> names{"<unlisted>"};
    if (fs->list(path, names) != Status::Ok) return "<error>";
    return join(names);
  }
  std::string find(const std::string& where, const std::string& pattern) {
    std::vector<std::string> found{"<unset>"};
    return fs->find(where, pattern, found) == Status::Ok ? join(found) : "<error>";
  }
  std::string target(const std::string& path) {
    std::string out = "<none>";
    fs->readLink(path, out);
    return out;
  }
  bool isLink(const std::string& path) {
    Kind k = Kind::File;
    return fs->kind(path, k) == Status::Ok && k == Kind::Link;
  }
  // Builds /l1 -> /l2 -> ... -> /l<n> -> /end, with /end a file.
  void chain(int n) {
    fs->write("/end", "payload");
    for (int i = 1; i <= n; ++i) fs->symlink(i == n ? "/end" : "/l" + std::to_string(i + 1), "/l" + std::to_string(i));
  }
};
}  // namespace

TEST(Link, ALinkToAFileIsReadWrittenAndSizedThroughButIsStillALink) {
  Fixture f;
  f.fs->mkdir("/data");
  f.fs->write("/data/f", "hello");
  IS(f.fs->symlink("/data/f", "/l"), Ok);
  EXPECT_EQ(f.read("/l"), std::string("hello"));
  Sz n = 0;
  IS(f.fs->size("/l", n), Ok);
  EXPECT_EQ(n, static_cast<Sz>(5));
  EXPECT_TRUE(f.isLink("/l"));
  EXPECT_EQ(f.target("/l"), std::string("/data/f"));
  IS(f.fs->write("/l", "changed"), Ok);
  EXPECT_EQ(f.read("/data/f"), std::string("changed"));
  EXPECT_TRUE(f.isLink("/l"));
}

TEST(Link, ALinkInTheMiddleOfAPathIsAlwaysFollowed) {
  Fixture f;
  f.fs->mkdir("/real");
  IS(f.fs->symlink("/real", "/alias"), Ok);
  IS(f.fs->write("/alias/f", "x"), Ok);
  IS(f.fs->mkdir("/alias/sub"), Ok);
  EXPECT_EQ(f.read("/real/f"), std::string("x"));
  EXPECT_EQ(f.ls("/alias"), std::string("f,sub"));
  EXPECT_EQ(f.ls("/real"), std::string("f,sub"));
  EXPECT_EQ(f.ls("/"), std::string("alias,real"));
  IS(f.fs->write("/alias/sub/g", "deep"), Ok);
  EXPECT_EQ(f.read("/real/sub/g"), std::string("deep"));
}

TEST(Link, LinksToLinksAreFollowedInTurn) {
  Fixture f;
  f.fs->mkdir("/real");
  f.fs->write("/real/f", "x");
  f.fs->symlink("/real", "/one");
  f.fs->symlink("/one", "/two");
  EXPECT_EQ(f.read("/two/f"), std::string("x"));
  EXPECT_EQ(f.ls("/two"), std::string("f"));
}

TEST(Link, DanglingLinksResolveWhenTheTargetAppears) {
  Fixture f;
  IS(f.fs->symlink("/later", "/l"), Ok);
  std::string out = "keep";
  IS(f.fs->read("/l", out), NotFound);
  std::vector<std::string> names{"keep"};
  IS(f.fs->list("/l", names), NotFound);
  Sz n = 1;
  IS(f.fs->size("/l", n), NotFound);
  EXPECT_TRUE(f.isLink("/l"));
  f.fs->write("/later", "now");
  EXPECT_EQ(f.read("/l"), std::string("now"));
  IS(f.fs->symlink("/ghost/deeper", "/m"), Ok);
  IS(f.fs->read("/m/x", out), NotFound);
}

TEST(Link, WritingThroughADanglingLinkCreatesTheTargetIfItsDirectoryExists) {
  Fixture f;
  f.fs->mkdir("/d");
  f.fs->symlink("/d/new.txt", "/l");
  IS(f.fs->write("/l", "created"), Ok);
  EXPECT_EQ(f.read("/d/new.txt"), std::string("created"));
  EXPECT_TRUE(f.isLink("/l"));
  f.fs->symlink("/nodir/f", "/bad");
  IS(f.fs->write("/bad", "x"), NotFound);
  EXPECT_EQ(f.ls("/"), std::string("bad,d,l"));
}

TEST(Link, RemoveMoveAndKindActOnTheLinkNotItsTarget) {
  Fixture f;
  f.fs->mkdir("/dir");
  f.fs->write("/dir/f", "x");
  f.fs->symlink("/dir", "/l");
  IS(f.fs->move("/l", "/m"), Ok);
  EXPECT_TRUE(f.isLink("/m"));
  EXPECT_EQ(f.target("/m"), std::string("/dir"));
  EXPECT_EQ(f.read("/m/f"), std::string("x"));
  IS(f.fs->remove("/m"), Ok);
  EXPECT_EQ(f.read("/dir/f"), std::string("x"));
  EXPECT_EQ(f.ls("/"), std::string("dir"));
  f.fs->symlink("/dir/f", "/n");
  IS(f.fs->move("/dir/f", "/moved"), Ok);
  std::string out;
  IS(f.fs->read("/n", out), NotFound);
  EXPECT_TRUE(f.isLink("/n"));
}

TEST(Link, CreatingALinkNeedsAFreeNameAnExistingParentAndTwoValidPaths) {
  Fixture f;
  f.fs->mkdir("/d");
  f.fs->write("/f", "x");
  f.fs->symlink("/d", "/l");
  IS(f.fs->symlink("/d", "/l"), AlreadyExists);
  IS(f.fs->symlink("/x", "/d"), AlreadyExists);
  IS(f.fs->symlink("/x", "/f"), AlreadyExists);
  IS(f.fs->symlink("/x", "/"), AlreadyExists);
  IS(f.fs->symlink("/x", "/nodir/l2"), NotFound);
  IS(f.fs->symlink("/x", "/f/l2"), NotADirectory);
  IS(f.fs->symlink("relative", "/l3"), InvalidPath);
  IS(f.fs->symlink("/x", "relative"), InvalidPath);
  IS(f.fs->mkdir("/l"), AlreadyExists);
  EXPECT_EQ(f.ls("/"), std::string("d,f,l"));
  EXPECT_EQ(f.ls("/d"), std::string(""));
}

TEST(Link, CreatingOverADanglingLinkIsStillAlreadyExists) {
  Fixture f;
  f.fs->symlink("/target", "/l");
  IS(f.fs->symlink("/other", "/l"), AlreadyExists);
  IS(f.fs->mkdir("/l"), AlreadyExists);
  std::string out;
  IS(f.fs->read("/target", out), NotFound);
  EXPECT_EQ(f.target("/l"), std::string("/target"));
}

TEST(Link, TargetsAreStoredNormalisedAndOnlyLinksHaveOne) {
  Fixture f;
  f.fs->write("/f", "x");
  f.fs->symlink("/a/./b/../c//", "/l");
  EXPECT_EQ(f.target("/l"), std::string("/a/c"));
  f.fs->symlink("/..", "/root");
  EXPECT_EQ(f.target("/root"), std::string("/"));
  std::string out = "keep";
  IS(f.fs->readLink("/f", out), NotALink);
  IS(f.fs->readLink("/", out), NotALink);
  IS(f.fs->readLink("/nope", out), NotFound);
  IS(f.fs->readLink("/f/x", out), NotADirectory);
  IS(f.fs->readLink("x", out), InvalidPath);
  EXPECT_EQ(out, std::string("keep"));
}

TEST(Link, AChainOfEightLinksResolvesAndNineIsALoop) {
  Fixture f;
  f.chain(fs::kMaxLinkHops);
  EXPECT_EQ(f.read("/l1"), std::string("payload"));
  Fixture g;
  g.chain(fs::kMaxLinkHops + 1);
  std::string out = "keep";
  IS(g.fs->read("/l1", out), LinkLoop);
  EXPECT_EQ(out, std::string("keep"));
  EXPECT_EQ(g.read("/l2"), std::string("payload"));
  EXPECT_TRUE(g.isLink("/l1"));
}

TEST(Link, TheHopLimitCountsLinksInTheMiddleOfAPathToo) {
  Fixture f;
  f.fs->mkdir("/real");
  f.fs->write("/real/f", "x");
  for (int i = fs::kMaxLinkHops; i >= 1; --i) f.fs->symlink(i == fs::kMaxLinkHops ? "/real" : "/d" + std::to_string(i + 1), "/d" + std::to_string(i));
  EXPECT_EQ(f.read("/d1/f"), std::string("x"));
  f.fs->mkdir("/other");
  f.fs->symlink("/d1", "/e");
  std::string out;
  IS(f.fs->read("/e/f", out), LinkLoop);
}

TEST(Link, LinksThatPointAtThemselvesOrEachOtherAreALoopNotAHang) {
  Fixture f;
  IS(f.fs->symlink("/self", "/self"), Ok);
  IS(f.fs->symlink("/b", "/a"), Ok);
  IS(f.fs->symlink("/a", "/b"), Ok);
  std::string out = "keep";
  std::vector<std::string> names;
  Sz n = 0;
  IS(f.fs->read("/self", out), LinkLoop);
  IS(f.fs->read("/a", out), LinkLoop);
  IS(f.fs->list("/b", names), LinkLoop);
  IS(f.fs->size("/a/x", n), LinkLoop);
  IS(f.fs->write("/a", "x"), LinkLoop);
  IS(f.fs->find("/b", "*", names), LinkLoop);
  EXPECT_TRUE(f.isLink("/a"));
  IS(f.fs->remove("/a"), Ok);
  IS(f.fs->remove("/b"), Ok);
}

TEST(Link, DotDotIsAppliedToTheTextBeforeAnyLinkIsFollowed) {
  Fixture f;
  f.fs->mkdir("/x");
  f.fs->mkdir("/x/y");
  f.fs->mkdir("/other");
  f.fs->write("/other/f", "textual");
  f.fs->symlink("/x/y", "/l");
  EXPECT_EQ(f.read("/l/../other/f"), std::string("textual"));
}

TEST(Link, DirectorySizeSkipsLinksSoACycleCannotInflateIt) {
  Fixture f;
  f.fs->mkdir("/d");
  f.fs->write("/d/f", "1234");
  f.fs->symlink("/d/f", "/d/copy");
  f.fs->symlink("/", "/d/up");
  Sz n = 0;
  IS(f.fs->size("/d", n), Ok);
  EXPECT_EQ(n, static_cast<Sz>(4));
  IS(f.fs->size("/", n), Ok);
  EXPECT_EQ(n, static_cast<Sz>(4));
  IS(f.fs->size("/d/copy", n), Ok);
  EXPECT_EQ(n, static_cast<Sz>(4));
}

TEST(Link, FindReportsLinksByNameButNeverDescendsThroughThem) {
  Fixture f;
  f.fs->mkdir("/d");
  f.fs->write("/d/f", "x");
  f.fs->symlink("/", "/d/up");
  f.fs->symlink("/d", "/alias");
  EXPECT_EQ(f.find("/", "*"), std::string("/alias,/d,/d/f,/d/up"));
  EXPECT_EQ(f.find("/", "up"), std::string("/d/up"));
  EXPECT_EQ(f.find("/alias", "*"), std::string("/alias/f,/alias/up"));
  EXPECT_EQ(f.find("/alias/", "f"), std::string("/alias/f"));
}

TEST(Link, AMoveIntoItselfThroughALinkIsRefusedAndChangesNothing) {
  Fixture f;
  f.fs->mkdir("/d");
  f.fs->write("/d/f", "keep me");
  f.fs->symlink("/d", "/l");
  IS(f.fs->move("/d", "/l/x"), InvalidPath);
  IS(f.fs->move("/d", "/l/x/y"), NotFound);
  EXPECT_EQ(f.read("/d/f"), std::string("keep me"));
  EXPECT_EQ(f.ls("/"), std::string("d,l"));
  IS(f.fs->move("/d", "/e"), Ok);
  EXPECT_EQ(f.read("/e/f"), std::string("keep me"));
}

TEST(Link, TheBaseAndSearchRulesStillHoldWithLinksPresent) {
  Fixture f;
  f.fs->mkdir("/a");
  f.fs->symlink("/a", "/l");
  IS(f.fs->remove("/a"), Ok);
  EXPECT_TRUE(f.isLink("/l"));
  IS(f.fs->mkdir("/l/x"), NotFound);
  IS(f.fs->write("/a", "now a file"), Ok);
  IS(f.fs->mkdir("/l/x"), NotADirectory);
  EXPECT_EQ(f.read("/l"), std::string("now a file"));
}
