#include <optional>
#include <string>
#include <type_traits>
#include "bp_test.h"
#include "solution.h"

TEST(Defaults, GetWithThirtySecondTimeout) {
  auto r = HttpRequestBuilder().url("https://example.com/a").build();
  ASSERT_TRUE(r.has_value());
  EXPECT_EQ(r->method(), std::string("GET"));
  EXPECT_EQ(r->url(), std::string("https://example.com/a"));
  EXPECT_EQ(r->timeoutMs(), 30000);
  EXPECT_TRUE(r->body().empty());
  EXPECT_TRUE(r->headers().empty());
}

TEST(Fluent, SettersChainAndAreApplied) {
  HttpRequestBuilder b;
  b.method("POST").url("http://x.test/p").body("{}").timeoutMs(500).header("Accept", "json");
  auto r = b.build();
  ASSERT_TRUE(r.has_value());
  EXPECT_EQ(r->method(), std::string("POST"));
  EXPECT_EQ(r->body(), std::string("{}"));
  EXPECT_EQ(r->timeoutMs(), 500);
  ASSERT_EQ(r->headers().size(), static_cast<std::size_t>(1));
  EXPECT_EQ(r->headers()[0].first, std::string("Accept"));
  EXPECT_EQ(r->headers()[0].second, std::string("json"));
}

TEST(Validation, UrlIsRequiredAndMustBeHttp) {
  EXPECT_FALSE(HttpRequestBuilder().build().has_value());
  EXPECT_FALSE(HttpRequestBuilder().url("").build().has_value());
  EXPECT_FALSE(HttpRequestBuilder().url("ftp://x.test").build().has_value());
  EXPECT_FALSE(HttpRequestBuilder().url("example.com").build().has_value());
  EXPECT_TRUE(HttpRequestBuilder().url("http://x.test").build().has_value());
}

TEST(Validation, MethodMustBeKnown) {
  for (const char* m : {"GET", "POST", "PUT", "DELETE"}) {
    EXPECT_TRUE(HttpRequestBuilder().url("https://a.test").method(m).build().has_value());
  }
  EXPECT_FALSE(HttpRequestBuilder().url("https://a.test").method("PATCH").build().has_value());
  EXPECT_FALSE(HttpRequestBuilder().url("https://a.test").method("get").build().has_value());
}

TEST(Validation, BodyNeedsPostOrPut) {
  EXPECT_FALSE(HttpRequestBuilder().url("https://a.test").body("x").build().has_value());
  EXPECT_FALSE(HttpRequestBuilder().url("https://a.test").method("DELETE").body("x").build().has_value());
  EXPECT_TRUE(HttpRequestBuilder().url("https://a.test").method("PUT").body("x").build().has_value());
  EXPECT_TRUE(HttpRequestBuilder().url("https://a.test").method("POST").body("").build().has_value());
}

TEST(Validation, TimeoutRangeIsInclusive) {
  auto make = [](int ms) { return HttpRequestBuilder().url("https://a.test").timeoutMs(ms).build().has_value(); };
  EXPECT_FALSE(make(0));
  EXPECT_FALSE(make(-5));
  EXPECT_TRUE(make(1));
  EXPECT_TRUE(make(120000));
  EXPECT_FALSE(make(120001));
}

TEST(Headers, NamesAreCaseInsensitiveAndReplaceInPlace) {
  auto r = HttpRequestBuilder()
               .url("https://a.test")
               .header("Content-Type", "a")
               .header("X-Id", "1")
               .header("content-type", "b")
               .build();
  ASSERT_TRUE(r.has_value());
  ASSERT_EQ(r->headers().size(), static_cast<std::size_t>(2));
  EXPECT_EQ(r->headers()[0].first, std::string("Content-Type"));
  EXPECT_EQ(r->headers()[0].second, std::string("b"));
  EXPECT_EQ(r->headers()[1].first, std::string("X-Id"));
}

TEST(Headers, EmptyNameIsInvalid) {
  EXPECT_FALSE(HttpRequestBuilder().url("https://a.test").header("", "v").build().has_value());
}

TEST(Reuse, BuiltRequestIsASnapshot) {
  HttpRequestBuilder b;
  b.url("https://a.test").header("A", "1");
  auto first = b.build();
  b.url("https://b.test").header("A", "2").header("B", "3");
  auto second = b.build();
  ASSERT_TRUE(first.has_value() && second.has_value());
  EXPECT_EQ(first->url(), std::string("https://a.test"));
  EXPECT_EQ(first->headers().size(), static_cast<std::size_t>(1));
  EXPECT_EQ(first->headers()[0].second, std::string("1"));
  EXPECT_EQ(second->headers().size(), static_cast<std::size_t>(2));
}

TEST(Shape, RequestHasNoPublicConstructorButIsCopyable) {
  EXPECT_FALSE(std::is_default_constructible<HttpRequest>::value);
  EXPECT_FALSE((std::is_constructible<HttpRequest, std::string, std::string>::value));
  EXPECT_TRUE(std::is_copy_constructible<HttpRequest>::value);
  EXPECT_TRUE(std::is_nothrow_move_constructible<HttpRequest>::value);
}
