#include <string>
#include <type_traits>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
struct Memory : InvoiceSink {
  std::vector<std::string> stored;
  void store(const std::string& t) override { stored.push_back(t); }
};

// Detection traits: does T have a member function with this name?
template <typename T, typename = void>
struct HasRender : std::false_type {};
template <typename T>
struct HasRender<T, std::void_t<decltype(std::declval<const T&>().render(std::declval<const T&>()))>> : std::true_type {};
template <typename T, typename = void>
struct HasStore : std::false_type {};
template <typename T>
struct HasStore<T, std::void_t<decltype(std::declval<T&>().store(std::string()))>> : std::true_type {};

Invoice sample() {
  Invoice inv;
  inv.add({"pen", 150, 3});
  inv.add({"ink", 5, 1});
  return inv;
}
}  // namespace

TEST(Invoice, EmptyTotalIsZero) {
  Invoice inv;
  EXPECT_EQ(inv.totalCents(), 0LL);
}

TEST(Invoice, TotalSumsUnitTimesQuantity) {
  EXPECT_EQ(sample().totalCents(), 455LL);
}

TEST(Invoice, LargeTotalsDoNotOverflow) {
  Invoice inv;
  inv.add({"gold", 3000000000LL, 2});
  EXPECT_EQ(inv.totalCents(), 6000000000LL);
}

TEST(Srp, InvoiceOnlyHoldsData) {
  EXPECT_FALSE(HasRender<Invoice>::value);
  EXPECT_FALSE(HasStore<Invoice>::value);
}

TEST(Formatter, RendersLinesAndTotal) {
  InvoiceFormatter f;
  EXPECT_EQ(f.render(sample()), std::string("pen x3 = 4.50\nink x1 = 0.05\nTOTAL 4.55\n"));
}

TEST(Formatter, ZeroIsTwoDigits) {
  InvoiceFormatter f;
  Invoice inv;
  EXPECT_EQ(f.render(inv), std::string("TOTAL 0.00\n"));
}

TEST(Formatter, SingleDigitCentsArePadded) {
  InvoiceFormatter f;
  Invoice inv;
  inv.add({"a", 1205, 1});
  EXPECT_EQ(f.render(inv), std::string("a x1 = 12.05\nTOTAL 12.05\n"));
}

TEST(Archiver, StoresTheRenderedTextOnce) {
  Memory m;
  InvoiceArchiver a(m);
  a.archive(sample());
  ASSERT_EQ(m.stored.size(), static_cast<size_t>(1));
  EXPECT_EQ(m.stored[0], InvoiceFormatter().render(sample()));
}

TEST(Archiver, EachArchiveCallStoresOnce) {
  Memory m;
  InvoiceArchiver a(m);
  a.archive(sample());
  a.archive(Invoice());
  ASSERT_EQ(m.stored.size(), static_cast<size_t>(2));
  EXPECT_EQ(m.stored[1], std::string("TOTAL 0.00\n"));
}
