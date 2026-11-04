#include <memory>
#include <string>
#include "bp_test.h"
#include "solution.h"

namespace {
// Counts how many times it is destroyed so ownership of the chain can be checked.
int g_destroyed = 0;
class Probe final : public Writer {
 public:
  ~Probe() override { ++g_destroyed; }
  void write(const std::string&) override {}
  void flush() override {}
};

struct Sink {
  std::unique_ptr<MemoryWriter> owned = std::make_unique<MemoryWriter>();
  MemoryWriter* view = owned.get();
};
}  // namespace

TEST(Upper, UpperCasesAsciiOnly) {
  Sink s;
  UpperWriter w(std::move(s.owned));
  w.write("abc Z9-é");
  EXPECT_EQ(s.view->text(), std::string("ABC Z9-é"));
}

TEST(Truncate, KeepsAtMostMaxChars) {
  Sink s;
  TruncateWriter w(std::move(s.owned), 3);
  w.write("abcdef");
  w.write("xy");
  w.write("");
  EXPECT_EQ(s.view->text(), std::string("abcxy"));
  EXPECT_EQ(s.view->writes(), static_cast<std::size_t>(3));
}

TEST(Bracket, WrapsEmptyTextToo) {
  Sink s;
  BracketWriter w(std::move(s.owned));
  w.write("hi");
  w.write("");
  EXPECT_EQ(s.view->text(), std::string("[hi][]"));
  EXPECT_EQ(s.view->writes(), static_cast<std::size_t>(2));
}

TEST(Decorator, StacksInTheOrderTheCallerChooses) {
  Sink a;
  BracketWriter bracketOuter(std::make_unique<TruncateWriter>(std::move(a.owned), 3));
  bracketOuter.write("abcdef");
  EXPECT_EQ(a.view->text(), std::string("[ab"));

  Sink b;
  TruncateWriter truncateOuter(std::make_unique<BracketWriter>(std::move(b.owned)), 3);
  truncateOuter.write("abcdef");
  EXPECT_EQ(b.view->text(), std::string("[abc]"));
}

TEST(Decorator, ThreeLayersCompose) {
  Sink s;
  UpperWriter w(std::make_unique<BracketWriter>(std::make_unique<TruncateWriter>(std::move(s.owned), 4)));
  w.write("hello");
  EXPECT_EQ(s.view->text(), std::string("[HEL"));
}

TEST(Counting, CountsWhatItReceivesNotWhatLeaves) {
  Sink s;
  auto counting = std::make_unique<CountingWriter>(std::make_unique<TruncateWriter>(std::move(s.owned), 2));
  CountingWriter* raw = counting.get();
  counting->write("abcdef");
  counting->write("xyz");
  EXPECT_EQ(raw->writes(), static_cast<std::size_t>(2));
  EXPECT_EQ(raw->chars(), static_cast<std::size_t>(9));
  EXPECT_EQ(s.view->text(), std::string("abxy"));
}

TEST(Decorator, FlushReachesTheInnermostWriter) {
  Sink s;
  UpperWriter w(std::make_unique<CountingWriter>(std::make_unique<BracketWriter>(std::move(s.owned))));
  w.flush();
  w.flush();
  EXPECT_EQ(s.view->flushes(), static_cast<std::size_t>(2));
}

TEST(Decorator, OwnsAndDestroysTheWrappedWriter) {
  g_destroyed = 0;
  {
    UpperWriter w(std::make_unique<CountingWriter>(std::make_unique<Probe>()));
    EXPECT_EQ(g_destroyed, 0);
  }
  EXPECT_EQ(g_destroyed, 1);
}
