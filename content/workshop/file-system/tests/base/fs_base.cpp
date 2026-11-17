#include <map>
#include <memory>
#include <set>
#include <string>
#include <vector>

#include "api.h"
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
  std::unique_ptr<fs::FileSystem> fs = fs::makeFileSystem();
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
  Sz size(const std::string& path) {
    Sz n = 999999;
    fs->size(path, n);
    return n;
  }
  bool isDir(const std::string& path) {
    Kind k = Kind::File;
    return fs->kind(path, k) == Status::Ok && k == Kind::Directory;
  }
  bool isFile(const std::string& path) {
    Kind k = Kind::Directory;
    return fs->kind(path, k) == Status::Ok && k == Kind::File;
  }
  bool missing(const std::string& path) {
    Kind k;
    return fs->kind(path, k) == Status::NotFound;
  }
};
}  // namespace

TEST(Path, MustBeAbsoluteAndNonEmpty) {
  Fixture f;
  IS(f.fs->mkdir("a"), InvalidPath);
  IS(f.fs->mkdir(""), InvalidPath);
  IS(f.fs->write("a.txt", "x"), InvalidPath);
  std::string out = "keep";
  IS(f.fs->read("", out), InvalidPath);
  EXPECT_EQ(out, std::string("keep"));
  IS(f.fs->remove("a"), InvalidPath);
  IS(f.fs->move("/", "x"), InvalidPath);
  EXPECT_EQ(f.ls("/"), std::string(""));
}

TEST(Path, RepeatedSlashesDotsAndTrailingSlashAreIgnored) {
  Fixture f;
  IS(f.fs->mkdir("//a/"), Ok);
  IS(f.fs->mkdir("/a/./b/"), Ok);
  IS(f.fs->write("/a//b/./f.txt", "hi"), Ok);
  EXPECT_EQ(f.read("/a/b/f.txt"), std::string("hi"));
  EXPECT_EQ(f.read("/a/b/f.txt/"), std::string("hi"));
  EXPECT_TRUE(f.isDir("/a/b/."));
  EXPECT_EQ(f.ls("/"), std::string("a"));
}

TEST(Path, DotDotGoesUpAndStopsAtTheRoot) {
  Fixture f;
  IS(f.fs->mkdir("/a"), Ok);
  IS(f.fs->mkdir("/a/b"), Ok);
  IS(f.fs->write("/a/b/../f.txt", "up"), Ok);
  EXPECT_EQ(f.read("/a/f.txt"), std::string("up"));
  IS(f.fs->mkdir("/../../c"), Ok);
  EXPECT_TRUE(f.isDir("/c"));
  EXPECT_TRUE(f.isDir("/.."));
  EXPECT_TRUE(f.isDir("/a/b/../.."));
  IS(f.fs->mkdir("/a/gone/../d"), Ok);  // textual: "gone" never has to exist
  EXPECT_TRUE(f.isDir("/a/d"));
}

TEST(Path, NamesAreLimitedInLengthEvenWhenDotDotRemovesThem) {
  Fixture f;
  const std::string ok(fs::kMaxNameLength, 'n');
  const std::string tooLong(fs::kMaxNameLength + 1, 'n');
  IS(f.fs->mkdir("/" + ok), Ok);
  IS(f.fs->mkdir("/" + tooLong), InvalidPath);
  IS(f.fs->mkdir("/" + tooLong + "/../fine"), InvalidPath);
  EXPECT_TRUE(f.missing("/fine"));
  IS(f.fs->write("/" + ok + "/" + tooLong, "x"), InvalidPath);
  EXPECT_EQ(f.ls("/"), ok);
}

TEST(Dirs, MkdirNeedsAnExistingDirectoryParentAndAFreeName) {
  Fixture f;
  IS(f.fs->mkdir("/a/b"), NotFound);
  IS(f.fs->mkdir("/a"), Ok);
  IS(f.fs->mkdir("/a/b"), Ok);
  IS(f.fs->mkdir("/a"), AlreadyExists);
  IS(f.fs->mkdir("/"), AlreadyExists);
  IS(f.fs->write("/f", "x"), Ok);
  IS(f.fs->mkdir("/f"), AlreadyExists);
  IS(f.fs->mkdir("/f/x"), NotADirectory);
  IS(f.fs->mkdir("/nope/deeper/x"), NotFound);
  EXPECT_EQ(f.ls("/"), std::string("a,f"));
}

TEST(Files, WriteCreatesThenReplacesTheWholeContent) {
  Fixture f;
  IS(f.fs->write("/f", "one"), Ok);
  EXPECT_EQ(f.read("/f"), std::string("one"));
  IS(f.fs->write("/f", "2"), Ok);
  EXPECT_EQ(f.read("/f"), std::string("2"));
  IS(f.fs->write("/f", ""), Ok);
  EXPECT_EQ(f.read("/f"), std::string(""));
  EXPECT_EQ(f.size("/f"), static_cast<Sz>(0));
  EXPECT_EQ(f.ls("/"), std::string("f"));
  IS(f.fs->write("/bin", std::string("a\0b", 3)), Ok);
  EXPECT_EQ(f.size("/bin"), static_cast<Sz>(3));
}

TEST(Files, WriteErrors) {
  Fixture f;
  IS(f.fs->write("/x/f", "1"), NotFound);
  IS(f.fs->mkdir("/d"), Ok);
  IS(f.fs->write("/d", "1"), IsADirectory);
  IS(f.fs->write("/", "1"), IsADirectory);
  IS(f.fs->write("/f", "1"), Ok);
  IS(f.fs->write("/f/g", "1"), NotADirectory);
  EXPECT_TRUE(f.isDir("/d"));
  EXPECT_EQ(f.read("/f"), std::string("1"));
}

TEST(Files, ReadErrorsLeaveTheOutputAlone) {
  Fixture f;
  std::string out = "keep";
  IS(f.fs->read("/missing", out), NotFound);
  IS(f.fs->mkdir("/d"), Ok);
  IS(f.fs->read("/d", out), IsADirectory);
  IS(f.fs->read("/", out), IsADirectory);
  IS(f.fs->write("/f", "x"), Ok);
  IS(f.fs->read("/f/inside", out), NotADirectory);
  IS(f.fs->read("/nowhere/f", out), NotFound);
  EXPECT_EQ(out, std::string("keep"));
}

TEST(List, GivesSortedNamesOfTheDirectChildrenOnly) {
  Fixture f;
  f.fs->mkdir("/b");
  f.fs->mkdir("/a");
  f.fs->write("/c", "x");
  f.fs->write("/a/x", "y");
  f.fs->mkdir("/a/sub");
  f.fs->write("/Z", "caps sort first");
  EXPECT_EQ(f.ls("/"), std::string("Z,a,b,c"));
  EXPECT_EQ(f.ls("/a"), std::string("sub,x"));
  EXPECT_EQ(f.ls("/b"), std::string(""));
  EXPECT_EQ(f.ls("/a/sub/.."), std::string("sub,x"));
}

TEST(List, ReplacesTheCallersVectorAndFailsCleanly) {
  Fixture f;
  f.fs->write("/f", "x");
  f.fs->mkdir("/d");
  std::vector<std::string> names{"old1", "old2"};
  IS(f.fs->list("/d", names), Ok);
  EXPECT_TRUE(names.empty());
  names = {"keep"};
  IS(f.fs->list("/f", names), NotADirectory);
  IS(f.fs->list("/nope", names), NotFound);
  EXPECT_EQ(join(names), std::string("keep"));
}

TEST(Remove, FilesAndEmptyDirectoriesGoAndFullOnesStay) {
  Fixture f;
  f.fs->mkdir("/d");
  f.fs->write("/d/f", "x");
  IS(f.fs->remove("/d"), NotEmpty);
  EXPECT_EQ(f.read("/d/f"), std::string("x"));
  IS(f.fs->remove("/d/f"), Ok);
  EXPECT_TRUE(f.missing("/d/f"));
  IS(f.fs->remove("/d"), Ok);
  EXPECT_TRUE(f.missing("/d"));
  IS(f.fs->remove("/d"), NotFound);
  IS(f.fs->remove("/"), InvalidPath);
  IS(f.fs->remove("/gone/x"), NotFound);
  f.fs->write("/g", "x");
  IS(f.fs->remove("/g/x"), NotADirectory);
}

TEST(Size, FileIsItsLengthAndDirectoryIsEverythingBelow) {
  Fixture f;
  f.fs->mkdir("/a");
  f.fs->mkdir("/a/b");
  f.fs->mkdir("/empty");
  f.fs->write("/a/one", "12345");
  f.fs->write("/a/b/two", "123");
  f.fs->write("/top", "12");
  EXPECT_EQ(f.size("/a/one"), static_cast<Sz>(5));
  EXPECT_EQ(f.size("/a/b"), static_cast<Sz>(3));
  EXPECT_EQ(f.size("/a"), static_cast<Sz>(8));
  EXPECT_EQ(f.size("/empty"), static_cast<Sz>(0));
  EXPECT_EQ(f.size("/"), static_cast<Sz>(10));
  f.fs->write("/a/b/two", "1");
  EXPECT_EQ(f.size("/"), static_cast<Sz>(8));
  f.fs->remove("/a/one");
  EXPECT_EQ(f.size("/a"), static_cast<Sz>(1));
  Sz n = 7;
  IS(f.fs->size("/missing", n), NotFound);
  EXPECT_EQ(n, static_cast<Sz>(7));
}

TEST(Kind, SeparatesFilesFromDirectories) {
  Fixture f;
  f.fs->mkdir("/d");
  f.fs->write("/f", "x");
  EXPECT_TRUE(f.isDir("/"));
  EXPECT_TRUE(f.isDir("/d"));
  EXPECT_TRUE(f.isFile("/f"));
  Kind k = Kind::Link;
  IS(f.fs->kind("/f/x", k), NotADirectory);
  IS(f.fs->kind("/nope", k), NotFound);
  EXPECT_TRUE(k == Kind::Link);
}

TEST(Move, RenamesAFileKeepingItsContent) {
  Fixture f;
  f.fs->write("/a.txt", "data");
  f.fs->mkdir("/d");
  IS(f.fs->move("/a.txt", "/d/b.txt"), Ok);
  EXPECT_TRUE(f.missing("/a.txt"));
  EXPECT_EQ(f.read("/d/b.txt"), std::string("data"));
  IS(f.fs->move("/d/b.txt", "/c.txt"), Ok);
  EXPECT_EQ(f.ls("/"), std::string("c.txt,d"));
  EXPECT_EQ(f.ls("/d"), std::string(""));
}

TEST(Move, CarriesAWholeDirectoryAndEverythingBelowIt) {
  Fixture f;
  f.fs->mkdir("/src");
  f.fs->mkdir("/src/lib");
  f.fs->write("/src/lib/a", "aaa");
  f.fs->write("/src/b", "bb");
  f.fs->mkdir("/dst");
  IS(f.fs->move("/src", "/dst/code"), Ok);
  EXPECT_TRUE(f.missing("/src"));
  EXPECT_EQ(f.read("/dst/code/lib/a"), std::string("aaa"));
  EXPECT_EQ(f.read("/dst/code/b"), std::string("bb"));
  EXPECT_EQ(f.size("/dst"), static_cast<Sz>(5));
  IS(f.fs->move("/dst/code/lib", "/lib2"), Ok);
  EXPECT_EQ(f.ls("/"), std::string("dst,lib2"));
  EXPECT_EQ(f.size("/"), static_cast<Sz>(5));
}

TEST(Move, NeverOverwritesAndAFailedMoveChangesNothing) {
  Fixture f;
  f.fs->write("/a", "A");
  f.fs->write("/b", "B");
  f.fs->mkdir("/d");
  IS(f.fs->move("/a", "/b"), AlreadyExists);
  IS(f.fs->move("/a", "/d"), AlreadyExists);
  IS(f.fs->move("/d", "/a"), AlreadyExists);
  IS(f.fs->move("/a", "/a"), AlreadyExists);
  IS(f.fs->move("/a", "/"), AlreadyExists);
  EXPECT_EQ(f.read("/a"), std::string("A"));
  EXPECT_EQ(f.read("/b"), std::string("B"));
  EXPECT_EQ(f.ls("/"), std::string("a,b,d"));
}

TEST(Move, ADirectoryCannotMoveIntoItselfOrTheRoot) {
  Fixture f;
  f.fs->mkdir("/a");
  f.fs->mkdir("/a/b");
  f.fs->write("/a/b/f", "x");
  IS(f.fs->move("/a", "/a/x"), InvalidPath);
  IS(f.fs->move("/a", "/a/b/c"), InvalidPath);
  IS(f.fs->move("/a", "/a/nope/deeper/c"), InvalidPath);
  IS(f.fs->move("/a/b", "/a/b/./c"), InvalidPath);
  IS(f.fs->move("/", "/x"), InvalidPath);
  IS(f.fs->move("/a", "/a/b/../b/q"), InvalidPath);
  EXPECT_EQ(f.read("/a/b/f"), std::string("x"));
  EXPECT_EQ(f.ls("/a"), std::string("b"));
}

TEST(Move, ChecksTheSourceBeforeTheDestination) {
  Fixture f;
  f.fs->write("/f", "x");
  IS(f.fs->move("/missing", "/f"), NotFound);
  IS(f.fs->move("/missing", "/nodir/x"), NotFound);
  IS(f.fs->move("/f", "/nodir/x"), NotFound);
  IS(f.fs->move("/f", "/f/x"), InvalidPath);
  f.fs->write("/g", "y");
  IS(f.fs->move("/f", "/g/x"), NotADirectory);
  IS(f.fs->move("/f/x", "/y"), NotADirectory);
  IS(f.fs->move("relative", "/y"), InvalidPath);
  IS(f.fs->move("/f", "relative"), InvalidPath);
  EXPECT_EQ(f.read("/f"), std::string("x"));
}

// ---- A model-based test: a flat map of full paths is the reference the real tree must agree with. ----
namespace {
struct Model {
  struct Entry {
    bool dir = true;
    std::string content;
  };
  std::map<std::string, Entry> entries{{"/", Entry{}}};

  static std::string parentOf(const std::string& p) { return p.rfind('/') == 0 ? "/" : p.substr(0, p.rfind('/')); }
  static std::string nameOf(const std::string& p) { return p.substr(p.rfind('/') + 1); }
  bool hasBelow(const std::string& p) const {
    for (const auto& e : entries) if (e.first.size() > p.size() + 1 && e.first.compare(0, p.size() + 1, p + "/") == 0) return true;
    return false;
  }
  // Status of looking the ancestors of p up from the root down; Ok when p's parent is a directory.
  Status ancestors(const std::string& p) const {
    std::string at;
    std::vector<std::string> chain;
    for (std::size_t i = 1; i < p.size(); ++i) if (p[i] == '/') chain.push_back(p.substr(0, i));
    for (const auto& a : chain) {
      auto it = entries.find(a);
      if (it == entries.end()) return Status::NotFound;
      if (!it->second.dir) return Status::NotADirectory;
    }
    return Status::Ok;
  }
  Status mkdir(const std::string& p) {
    Status s = ancestors(p);
    if (s != Status::Ok) return s;
    if (entries.count(p)) return Status::AlreadyExists;
    entries[p] = Entry{};
    return Status::Ok;
  }
  Status write(const std::string& p, const std::string& c) {
    Status s = ancestors(p);
    if (s != Status::Ok) return s;
    auto it = entries.find(p);
    if (it != entries.end() && it->second.dir) return Status::IsADirectory;
    entries[p] = Entry{false, c};
    return Status::Ok;
  }
  Status read(const std::string& p, std::string& out) const {
    Status s = ancestors(p);
    if (s != Status::Ok) return s;
    auto it = entries.find(p);
    if (it == entries.end()) return Status::NotFound;
    if (it->second.dir) return Status::IsADirectory;
    out = it->second.content;
    return Status::Ok;
  }
  Status remove(const std::string& p) {
    Status s = ancestors(p);
    if (s != Status::Ok) return s;
    auto it = entries.find(p);
    if (it == entries.end()) return Status::NotFound;
    if (it->second.dir && hasBelow(p)) return Status::NotEmpty;
    entries.erase(it);
    return Status::Ok;
  }
  Status list(const std::string& p, std::string& out) const {
    Status s = ancestors(p);
    if (s != Status::Ok) return s;
    auto it = entries.find(p);
    if (it == entries.end()) return Status::NotFound;
    if (!it->second.dir) return Status::NotADirectory;
    std::set<std::string> names;
    for (const auto& e : entries) if (e.first != "/" && parentOf(e.first) == p) names.insert(nameOf(e.first));
    out.clear();
    for (const auto& n : names) out += (out.empty() ? "" : ",") + n;
    return Status::Ok;
  }
  Status size(const std::string& p, Sz& out) const {
    Status s = ancestors(p);
    if (s != Status::Ok) return s;
    auto it = entries.find(p);
    if (it == entries.end()) return Status::NotFound;
    out = 0;
    for (const auto& e : entries) {
      const bool below = p == "/" || e.first == p || (e.first.size() > p.size() + 1 && e.first.compare(0, p.size() + 1, p + "/") == 0);
      if (below && !e.second.dir) out += e.second.content.size();
    }
    return Status::Ok;
  }
  Status move(const std::string& a, const std::string& b) {
    if (b.size() > a.size() + 1 && b.compare(0, a.size() + 1, a + "/") == 0) return Status::InvalidPath;
    Status s = ancestors(a);
    if (s != Status::Ok) return s;
    if (!entries.count(a)) return Status::NotFound;
    s = ancestors(b);
    if (s != Status::Ok) return s;
    if (entries.count(b)) return Status::AlreadyExists;
    std::map<std::string, Entry> moved;
    for (auto it = entries.begin(); it != entries.end();) {
      if (it->first == a || (it->first.size() > a.size() + 1 && it->first.compare(0, a.size() + 1, a + "/") == 0)) {
        moved[b + it->first.substr(a.size())] = it->second;
        it = entries.erase(it);
      } else {
        ++it;
      }
    }
    for (auto& m : moved) entries[m.first] = m.second;
    return Status::Ok;
  }
};
}  // namespace

TEST(Model, RandomOperationsAgreeWithAFlatMapModel) {
  Fixture f;
  Model model;
  unsigned long long state = 20240607ULL;
  auto next = [&](unsigned n) {
    state = state * 6364136223846793005ULL + 1442695040888963407ULL;
    return static_cast<unsigned>((state >> 33) % n);
  };
  const char* names[] = {"a", "b", "c"};
  auto randomPath = [&]() {
    std::string p;
    const unsigned depth = 1 + next(3);
    for (unsigned i = 0; i < depth; ++i) p += std::string("/") + names[next(3)];
    return p;
  };
  for (int step = 0; step < 6000; ++step) {
    const std::string p = randomPath();
    const unsigned op = next(8);
    const std::string where = " (step " + std::to_string(step) + ", op " + std::to_string(op) + ", " + p + ")";
    if (op <= 1) {
      EXPECT_TRUE(f.fs->mkdir(p) == model.mkdir(p));
    } else if (op == 2 || op == 3) {
      const std::string c(next(5), 'x');
      EXPECT_TRUE(f.fs->write(p, c) == model.write(p, c));
    } else if (op == 4) {
      std::string got = "g";
      std::string want = "w";
      const Status a = f.fs->read(p, got);
      const Status b = model.read(p, want);
      EXPECT_TRUE(a == b);
      if (a == Status::Ok && b == Status::Ok) EXPECT_EQ(got, want);
    } else if (op == 5) {
      EXPECT_TRUE(f.fs->remove(p) == model.remove(p));
    } else if (op == 6) {
      const std::string q = randomPath();
      EXPECT_TRUE(f.fs->move(p, q) == model.move(p, q));
    } else {
      std::vector<std::string> names;
      std::string want;
      const Status a = f.fs->list(p, names);
      const Status b = model.list(p, want);
      EXPECT_TRUE(a == b);
      if (a == Status::Ok && b == Status::Ok) EXPECT_EQ(join(names), want);
      Sz sg = 1, sw = 2;
      const Status c = f.fs->size(p, sg);
      const Status d = model.size(p, sw);
      EXPECT_TRUE(c == d);
      if (c == Status::Ok && d == Status::Ok) EXPECT_EQ(sg, sw);
    }
    (void)where;
  }
  Sz total = 0, want = 0;
  f.fs->size("/", total);
  model.size("/", want);
  EXPECT_EQ(total, want);
}
