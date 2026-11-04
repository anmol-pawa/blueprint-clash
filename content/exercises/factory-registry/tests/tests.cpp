#include <memory>
#include <string>
#include "bp_test.h"
#include "solution.h"

namespace {
int liveCodecs = 0;
int factoryCalls = 0;

struct Tag : Codec {  // a codec the solution has never seen
  std::string label;
  explicit Tag(std::string l) : label(std::move(l)) { ++liveCodecs; }
  ~Tag() override { --liveCodecs; }
  std::string name() const override { return label; }
  std::string encode(const std::string& t) const override { return label + ":" + t; }
};

CodecFactory tagFactory(const std::string& label) {
  return [label] {
    ++factoryCalls;
    return std::make_unique<Tag>(label);
  };
}
}  // namespace

TEST(Registry, CreatesWhatWasRegistered) {
  CodecRegistry reg;
  EXPECT_TRUE(reg.registerCodec("zip", tagFactory("zip")));
  EXPECT_TRUE(reg.registerCodec("b64", tagFactory("b64")));
  auto zip = reg.create("zip");
  ASSERT_TRUE(zip != nullptr);
  EXPECT_EQ(zip->encode("x"), std::string("zip:x"));
  auto b64 = reg.create("b64");
  ASSERT_TRUE(b64 != nullptr);
  EXPECT_EQ(b64->name(), std::string("b64"));
}

TEST(Registry, UnknownNameIsNull) {
  CodecRegistry reg;
  EXPECT_TRUE(reg.create("zip") == nullptr);
  reg.registerCodec("zip", tagFactory("zip"));
  EXPECT_TRUE(reg.create("gzip") == nullptr);
  EXPECT_TRUE(reg.create("") == nullptr);
}

TEST(Registry, EveryCallMakesAFreshCodec) {
  liveCodecs = 0;
  CodecRegistry reg;
  reg.registerCodec("zip", tagFactory("zip"));
  auto a = reg.create("zip");
  auto b = reg.create("zip");
  ASSERT_TRUE(a != nullptr && b != nullptr);
  EXPECT_TRUE(a.get() != b.get());
  EXPECT_EQ(liveCodecs, 2);
  a.reset();
  EXPECT_EQ(liveCodecs, 1);
}

TEST(Registry, FactoriesRunLazily) {
  factoryCalls = 0;
  CodecRegistry reg;
  reg.registerCodec("zip", tagFactory("zip"));
  reg.registerCodec("b64", tagFactory("b64"));
  EXPECT_EQ(factoryCalls, 0);
  auto c = reg.create("zip");
  EXPECT_EQ(factoryCalls, 1);
  auto d = reg.create("zip");
  EXPECT_EQ(factoryCalls, 2);
}

TEST(Registry, FirstRegistrationWins) {
  CodecRegistry reg;
  EXPECT_TRUE(reg.registerCodec("zip", tagFactory("first")));
  EXPECT_FALSE(reg.registerCodec("zip", tagFactory("second")));
  auto c = reg.create("zip");
  ASSERT_TRUE(c != nullptr);
  EXPECT_EQ(c->name(), std::string("first"));
  EXPECT_EQ(reg.names().size(), static_cast<std::size_t>(1));
}

TEST(Registry, RejectsEmptyNameAndEmptyFactory) {
  CodecRegistry reg;
  EXPECT_FALSE(reg.registerCodec("", tagFactory("x")));
  EXPECT_FALSE(reg.registerCodec("zip", CodecFactory{}));
  EXPECT_EQ(reg.names().size(), static_cast<std::size_t>(0));
  EXPECT_TRUE(reg.create("zip") == nullptr);
}

TEST(Registry, NamesAreAlphabetical) {
  CodecRegistry reg;
  reg.registerCodec("rot13", tagFactory("rot13"));
  reg.registerCodec("b64", tagFactory("b64"));
  reg.registerCodec("upper", tagFactory("upper"));
  const std::vector<std::string> expected{"b64", "rot13", "upper"};
  EXPECT_TRUE(reg.names() == expected);
}

TEST(Registry, FactoryReturningNullGivesNull) {
  CodecRegistry reg;
  EXPECT_TRUE(reg.registerCodec("broken", [] { return std::unique_ptr<Codec>(); }));
  EXPECT_TRUE(reg.create("broken") == nullptr);
}
