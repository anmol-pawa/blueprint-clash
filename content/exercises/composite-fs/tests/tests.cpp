#include <memory>
#include <string>
#include "bp_test.h"
#include "solution.h"

namespace {
std::unique_ptr<Directory> sample() {
  auto root = std::make_unique<Directory>("root");
  auto src = std::make_unique<Directory>("src");
  auto util = std::make_unique<Directory>("util");
  util->add(std::make_unique<File>("a.h", 10));
  src->add(std::make_unique<File>("main.cpp", 100));
  src->add(std::move(util));
  root->add(std::make_unique<File>("README", 5));
  root->add(std::move(src));
  return root;
}
}  // namespace

TEST(File, ReportsItself) {
  File f("a.txt", 42);
  EXPECT_EQ(f.name(), std::string("a.txt"));
  EXPECT_EQ(f.size(), 42LL);
  EXPECT_EQ(f.fileCount(), static_cast<std::size_t>(1));
  EXPECT_EQ(f.render(0), std::string("a.txt (42)\n"));
  EXPECT_EQ(f.render(2), std::string("    a.txt (42)\n"));
}

TEST(Directory, EmptyDirectory) {
  Directory d("empty");
  EXPECT_EQ(d.size(), 0LL);
  EXPECT_EQ(d.fileCount(), static_cast<std::size_t>(0));
  EXPECT_EQ(d.render(0), std::string("empty/ (0)\n"));
}

TEST(Directory, SizeAndCountAreRecursive) {
  const auto root = sample();
  EXPECT_EQ(root->size(), 115LL);
  EXPECT_EQ(root->fileCount(), static_cast<std::size_t>(3));
}

TEST(Directory, RenderIndentsNestedLevels) {
  const auto root = sample();
  EXPECT_EQ(root->render(0),
            std::string("root/ (115)\n  README (5)\n  src/ (110)\n    main.cpp (100)\n    util/ (10)\n      a.h (10)\n"));
}

TEST(Directory, FindResolvesNestedPaths) {
  const auto root = sample();
  const Node* a = root->find("src/util/a.h");
  ASSERT_TRUE(a != nullptr);
  EXPECT_EQ(a->name(), std::string("a.h"));
  const Node* util = root->find("src/util");
  ASSERT_TRUE(util != nullptr);
  EXPECT_EQ(util->size(), 10LL);
  EXPECT_TRUE(root->find("") == root.get());
  EXPECT_TRUE(root->find("src/missing.cpp") == nullptr);
  EXPECT_TRUE(root->find("nope/a.h") == nullptr);
}

TEST(File, HasNothingBelowIt) {
  const auto root = sample();
  EXPECT_TRUE(root->find("README/deeper") == nullptr);
  EXPECT_TRUE(root->find("src/main.cpp/x") == nullptr);
}

TEST(Directory, RejectsDuplicatesNullAndItself) {
  Directory d("d");
  EXPECT_TRUE(d.add(std::make_unique<File>("a", 1)));
  EXPECT_FALSE(d.add(std::make_unique<File>("a", 2)));
  EXPECT_FALSE(d.add(std::make_unique<Directory>("a")));
  EXPECT_FALSE(d.add(nullptr));
  EXPECT_EQ(d.size(), 1LL);
  EXPECT_EQ(d.fileCount(), static_cast<std::size_t>(1));
}

TEST(Composite, TreatsLeavesAndContainersUniformly) {
  const auto root = sample();
  const Node* parts[] = {root->find("README"), root->find("src"), root.get()};
  long long total = 0;
  for (const Node* n : parts) {
    ASSERT_TRUE(n != nullptr);
    total += n->size();
  }
  EXPECT_EQ(total, 5LL + 110LL + 115LL);
}
