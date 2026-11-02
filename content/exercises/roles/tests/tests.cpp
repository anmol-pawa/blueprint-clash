#include <string>
#include <type_traits>
#include "bp_test.h"
#include "solution.h"

namespace {
struct Upper : Writable {  // a writable the solution has never seen
  std::string seen;
  void write(const std::string& t) override { seen += "<" + t + ">"; }
};
struct Fixed : Readable {  // a readable the solution has never seen
  std::string read() const override { return "fixed"; }
};
}  // namespace

TEST(Notebook, StartsEmpty) {
  Notebook n;
  EXPECT_EQ(n.read(), std::string(""));
}

TEST(Notebook, WriteAppends) {
  Notebook n;
  n.write("ab");
  n.write("cd");
  EXPECT_EQ(n.read(), std::string("abcd"));
}

TEST(Roles, NotebookHasBothRoles) {
  EXPECT_TRUE((std::is_base_of<Readable, Notebook>::value));
  EXPECT_TRUE((std::is_base_of<Writable, Notebook>::value));
}

TEST(Roles, SensorCannotBeWritten) {
  EXPECT_TRUE((std::is_base_of<Readable, Sensor>::value));
  EXPECT_FALSE((std::is_base_of<Writable, Sensor>::value));
}

TEST(Sensor, ReturnsItsReading) {
  Sensor s("21.5C");
  EXPECT_EQ(s.read(), std::string("21.5C"));
}

TEST(Archive, CopiesFromAnyReadableToAnyWritable) {
  Sensor s("42");
  Upper u;
  archive(s, u);
  EXPECT_EQ(u.seen, std::string("<42>"));
  Fixed f;
  archive(f, u);
  EXPECT_EQ(u.seen, std::string("<42><fixed>"));
}

TEST(Archive, AppendsIntoNotebook) {
  Notebook a, b;
  a.write("one");
  b.write("zero-");
  archive(a, b);
  EXPECT_EQ(b.read(), std::string("zero-one"));
}
