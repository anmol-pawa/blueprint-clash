// bp_test.h: the tiny behaviour-test framework for Blueprint Clash.
//
// Hidden tests include this header. Output is one JSON object per line on stdout:
//   {"t":"begin","suite":"S","name":"N"}
//   {"t":"result","suite":"S","name":"N","status":"pass"|"fail","ms":1.2,"failures":[{"file":"a.cpp","line":3,"msg":"..."}]}
//   {"t":"summary","passed":2,"failed":1}
// A "begin" with no matching "result" means the test crashed or timed out; the judge attributes it.
//
// Two build modes (ADR 0001): with exceptions (native g++) and without (-fno-exceptions, the browser
// toolchain has no C++ unwinder). Without exceptions ASSERT_*/FAIL report the failure, print the
// test's result line and exit(3); the judge re-runs the remaining tests with `--only Suite.name`.
// `--list` prints one "Suite.name" per line. EXPECT_THROWS needs exceptions.
//
// Exactly one translation unit (the driver) defines BP_TEST_MAIN before including this header.
#pragma once

#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <exception>
#include <functional>
#include <sstream>
#include <string>
#include <type_traits>
#include <utility>
#include <vector>

namespace bp {

struct Failure {
  std::string file;
  int line;
  std::string msg;
};

struct TestCase {
  std::string suite;
  std::string name;
  std::function<void()> body;
};

inline std::vector<TestCase>& registry() {
  static std::vector<TestCase> tests;
  return tests;
}

inline std::vector<Failure>& currentFailures() {
  static std::vector<Failure> failures;
  return failures;
}

#if defined(__cpp_exceptions) || defined(__EXCEPTIONS)
#define BP_HAS_EXCEPTIONS 1
#else
#define BP_HAS_EXCEPTIONS 0
#endif

// Thrown by ASSERT_* to abandon the current test only (exception builds).
struct AbortTest {};

inline void emitResult(const TestCase& t, double ms);
inline const TestCase*& currentTest() {
  static const TestCase* current = nullptr;
  return current;
}
inline double& currentStartMs() {
  static double start = 0;
  return start;
}
inline double nowMs() {
  return std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now().time_since_epoch()).count();
}

// Abandons the current test: throws when exceptions exist, otherwise emits the result and exits.
[[noreturn]] inline void abortTest() {
#if BP_HAS_EXCEPTIONS
  throw AbortTest{};
#else
  emitResult(*currentTest(), nowMs() - currentStartMs());
  std::exit(3);
#endif
}

struct Registrar {
  Registrar(const char* suite, const char* name, std::function<void()> body) {
    registry().push_back({suite, name, std::move(body)});
  }
};

inline std::string jsonEscape(const std::string& in) {
  std::string out;
  out.reserve(in.size() + 8);
  for (unsigned char c : in) {
    switch (c) {
      case '"': out += "\\\""; break;
      case '\\': out += "\\\\"; break;
      case '\n': out += "\\n"; break;
      case '\r': out += "\\r"; break;
      case '\t': out += "\\t"; break;
      default:
        if (c < 0x20) {
          char buf[8];
          std::snprintf(buf, sizeof buf, "\\u%04x", c);
          out += buf;
        } else {
          out += static_cast<char>(c);
        }
    }
  }
  return out;
}

template <typename T, typename = void>
struct IsStreamable : std::false_type {};
template <typename T>
struct IsStreamable<T, std::void_t<decltype(std::declval<std::ostream&>() << std::declval<const T&>())>>
    : std::true_type {};

template <typename T>
std::string show(const T& value) {
  if constexpr (std::is_same_v<T, bool>) {
    return value ? "true" : "false";
  } else if constexpr (std::is_same_v<T, std::string>) {
    return "\"" + value + "\"";
  } else if constexpr (IsStreamable<T>::value) {
    std::ostringstream os;
    os << value;
    return os.str();
  } else {
    return "<unprintable>";
  }
}

inline void report(const char* file, int line, const std::string& msg) {
  currentFailures().push_back({file, line, msg});
}

template <typename A, typename B, typename Cmp>
bool check(const A& a, const B& b, Cmp cmp, const char* op, const char* ea, const char* eb, const char* file,
           int line) {
  if (cmp(a, b)) return true;
  report(file, line, std::string("expected ") + ea + " " + op + " " + eb + " but got " + show(a) + " vs " + show(b));
  return false;
}

inline bool checkTrue(bool ok, const char* expr, const char* file, int line, bool expected) {
  if (ok == expected) return true;
  report(file, line, std::string("expected ") + expr + " to be " + (expected ? "true" : "false"));
  return false;
}

inline std::string basename(const char* path) {
  std::string p(path);
  auto slash = p.find_last_of("/\\");
  return slash == std::string::npos ? p : p.substr(slash + 1);
}

inline void emitResult(const TestCase& t, double ms) {
  bool ok = currentFailures().empty();
  std::string out = "{\"t\":\"result\",\"suite\":\"" + jsonEscape(t.suite) + "\",\"name\":\"" + jsonEscape(t.name) +
                    "\",\"status\":\"" + (ok ? "pass" : "fail") + "\",\"ms\":" + std::to_string(ms) +
                    ",\"failures\":[";
  bool first = true;
  for (const auto& f : currentFailures()) {
    if (!first) out += ",";
    first = false;
    out += "{\"file\":\"" + jsonEscape(basename(f.file.c_str())) + "\",\"line\":" + std::to_string(f.line) +
           ",\"msg\":\"" + jsonEscape(f.msg) + "\"}";
  }
  out += "]}";
  std::printf("%s\n", out.c_str());
  std::fflush(stdout);
}

// Usage: prog [substring-filter] | prog --list | prog --only Suite.name
inline int runAll(int argc, char** argv) {
  std::string filter;
  bool exact = false;
  if (argc > 1 && std::string(argv[1]) == "--list") {
    for (const auto& t : registry()) std::printf("%s.%s\n", t.suite.c_str(), t.name.c_str());
    return 0;
  }
  if (argc > 2 && std::string(argv[1]) == "--only") {
    filter = argv[2];
    exact = true;
  } else if (argc > 1) {
    filter = argv[1];
  }
  int passed = 0, failed = 0;
  for (const auto& t : registry()) {
    std::string full = t.suite + "." + t.name;
    if (exact ? full != filter : (!filter.empty() && full.find(filter) == std::string::npos)) continue;
    std::printf("{\"t\":\"begin\",\"suite\":\"%s\",\"name\":\"%s\"}\n", jsonEscape(t.suite).c_str(),
                jsonEscape(t.name).c_str());
    std::fflush(stdout);
    currentFailures().clear();
    currentTest() = &t;
    currentStartMs() = nowMs();
#if BP_HAS_EXCEPTIONS
    try {
      t.body();
    } catch (const AbortTest&) {
    } catch (const std::exception& e) {
      report("", 0, std::string("unexpected exception: ") + e.what());
    } catch (...) {
      report("", 0, "unexpected non-standard exception");
    }
#else
    t.body();
#endif
    bool ok = currentFailures().empty();
    ok ? ++passed : ++failed;
    emitResult(t, nowMs() - currentStartMs());
  }
  std::printf("{\"t\":\"summary\",\"passed\":%d,\"failed\":%d}\n", passed, failed);
  std::fflush(stdout);
  return failed == 0 ? 0 : 1;
}

}  // namespace bp

#define BP_CAT2(a, b) a##b
#define BP_CAT(a, b) BP_CAT2(a, b)

#define TEST(suite, name)                                                             \
  static void BP_CAT(bp_body_##suite##_, name)();                                     \
  static ::bp::Registrar BP_CAT(bp_reg_##suite##_, name)(#suite, #name,               \
                                                         BP_CAT(bp_body_##suite##_, name)); \
  static void BP_CAT(bp_body_##suite##_, name)()

#define BP_EXPECT_CMP(a, b, op, opstr) \
  ::bp::check((a), (b), [](const auto& x, const auto& y) { return x op y; }, opstr, #a, #b, __FILE__, __LINE__)

#define EXPECT_EQ(a, b) (void)BP_EXPECT_CMP(a, b, ==, "==")
#define EXPECT_NE(a, b) (void)BP_EXPECT_CMP(a, b, !=, "!=")
#define EXPECT_LT(a, b) (void)BP_EXPECT_CMP(a, b, <, "<")
#define EXPECT_LE(a, b) (void)BP_EXPECT_CMP(a, b, <=, "<=")
#define EXPECT_GT(a, b) (void)BP_EXPECT_CMP(a, b, >, ">")
#define EXPECT_GE(a, b) (void)BP_EXPECT_CMP(a, b, >=, ">=")
#define EXPECT_TRUE(x) (void)::bp::checkTrue(static_cast<bool>(x), #x, __FILE__, __LINE__, true)
#define EXPECT_FALSE(x) (void)::bp::checkTrue(static_cast<bool>(x), #x, __FILE__, __LINE__, false)

#define ASSERT_EQ(a, b) do { if (!BP_EXPECT_CMP(a, b, ==, "==")) ::bp::abortTest(); } while (0)
#define ASSERT_NE(a, b) do { if (!BP_EXPECT_CMP(a, b, !=, "!=")) ::bp::abortTest(); } while (0)
#define ASSERT_TRUE(x) do { if (!::bp::checkTrue(static_cast<bool>(x), #x, __FILE__, __LINE__, true)) ::bp::abortTest(); } while (0)
#define ASSERT_FALSE(x) do { if (!::bp::checkTrue(static_cast<bool>(x), #x, __FILE__, __LINE__, false)) ::bp::abortTest(); } while (0)

// EXPECT_THROWS(expr, ExceptionType): passes when expr throws that type. Exception builds only.
#if BP_HAS_EXCEPTIONS
#define EXPECT_THROWS(expr, ExType)                                                              \
  do {                                                                                           \
    bool bp_threw = false;                                                                       \
    try { (void)(expr); } catch (const ExType&) { bp_threw = true; } catch (...) {}              \
    if (!bp_threw) ::bp::report(__FILE__, __LINE__, std::string("expected ") + #expr + " to throw " + #ExType); \
  } while (0)
#else
#define EXPECT_THROWS(expr, ExType) static_assert(sizeof(#expr) == 0, "EXPECT_THROWS needs exceptions (-fno-exceptions build)")
#endif

#define FAIL(msg) do { ::bp::report(__FILE__, __LINE__, (msg)); ::bp::abortTest(); } while (0)

#ifdef BP_TEST_MAIN
int main(int argc, char** argv) { return ::bp::runAll(argc, argv); }
#endif
