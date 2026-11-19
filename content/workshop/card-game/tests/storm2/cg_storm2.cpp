#include <cstdint>
#include <initializer_list>
#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
#include "bp_test.h"

namespace {
using cards::Card;
using cards::Deck;
using cards::Phase;
using cards::Result;
using cards::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

Deck stack(std::initializer_list<int> ranks) {
  Deck deck;
  int i = 0;
  for (int rank : ranks) deck.push_back(Card{rank, static_cast<cards::Suit>(i++ % 4)});
  return deck;
}

std::string show(const std::vector<Card>& held) {
  std::string out;
  for (const auto& c : held) out += (out.empty() ? "" : " ") + std::to_string(c.rank);
  return out;
}

std::string handOf(const cards::Game& g, const std::string& who) {
  std::vector<Card> h;
  g.hand(who, h);
  return show(h);
}
int totalOf(const cards::Game& g, const std::string& who) {
  int t = -1;
  g.total(who, t);
  return t;
}
Result resultOf(const cards::Game& g, const std::string& who) {
  Result r = Result::Push;
  g.result(who, r);
  return r;
}
}  // namespace

TEST(Showdown, SetupNeedsThreeCardsForEverySeat) {
  EXPECT_TRUE(cards::makeShowdown({}, cards::standardDeck()) == nullptr);
  EXPECT_TRUE(cards::makeShowdown({"a", "a"}, cards::standardDeck()) == nullptr);
  EXPECT_TRUE(cards::makeShowdown({"a", "b", "c", "d", "e", "f", "g"}, cards::standardDeck()) == nullptr);
  EXPECT_TRUE(cards::makeShowdown({"a"}, stack({1, 2, 3, 4, 5})) == nullptr);
  EXPECT_TRUE(cards::makeShowdown({"a"}, stack({1, 2, 3, 4, 5, 6})) != nullptr);
  EXPECT_TRUE(cards::makeShowdown({"a", "b"}, stack({1, 2, 3, 4, 5, 6, 7, 8})) == nullptr);
  EXPECT_TRUE(cards::makeShowdown({"a", "b"}, stack({1, 2, 3, 4, 5, 6, 7, 8, 9})) != nullptr);
  // The blackjack table needs less, and is unchanged.
  EXPECT_TRUE(cards::makeBlackjack({"a", "b"}, stack({1, 2, 3, 4, 5, 6})) != nullptr);
}

TEST(Showdown, TheDealGoesRoundThreeTimesAndTheRoundIsOverAtOnce) {
  auto g = cards::makeShowdown({"A", "B"}, stack({1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11}));
  ASSERT_TRUE(g != nullptr);
  EXPECT_TRUE(g->phase() == Phase::Waiting);
  Result r = Result::Win;
  IS(g->result("A", r), WrongPhase);
  IS(g->deal(), Ok);
  EXPECT_EQ(handOf(*g, "A"), std::string("1 4 7"));
  EXPECT_EQ(handOf(*g, "B"), std::string("2 5 8"));
  EXPECT_EQ(show(g->dealerHand()), std::string("3 6 9"));
  EXPECT_TRUE(g->phase() == Phase::Finished);
  EXPECT_EQ(g->current(), std::string(""));
  IS(g->deal(), WrongPhase);
  IS(g->result("A", r), Ok);
  IS(g->result("B", r), Ok);
  IS(g->result("nobody", r), UnknownPlayer);
}

TEST(Showdown, NobodyDecidesAnything) {
  auto g = cards::makeShowdown({"A"}, stack({1, 2, 3, 4, 5, 6}));
  IS(g->hit("A"), WrongPhase);
  IS(g->stand("A"), WrongPhase);
  IS(g->deal(), Ok);
  IS(g->hit("A"), WrongPhase);
  IS(g->stand("A"), WrongPhase);
  IS(g->hit("nobody"), UnknownPlayer);
  IS(g->stand("nobody"), UnknownPlayer);
  EXPECT_EQ(g->dealerHand().size(), std::size_t(3));
}

TEST(Showdown, ACardIsWorthItsPointsAndTheHandIsTheSumModuloTen) {
  // A holds 1 + 9 + 13 (K) = 10 -> 0; B holds 7 + 8 + 10 = 25 -> 5; C holds 11 + 12 + 5 = 5 -> 5; the dealer 2 + 3 + 4 = 9.
  auto g = cards::makeShowdown({"A", "B", "C"}, stack({1, 7, 11, 2, 9, 8, 12, 3, 13, 10, 5, 4}));
  IS(g->deal(), Ok);
  EXPECT_EQ(totalOf(*g, "A"), 0);
  EXPECT_EQ(totalOf(*g, "B"), 5);
  EXPECT_EQ(totalOf(*g, "C"), 5);
  EXPECT_EQ(g->dealerTotal(), 9);
  EXPECT_EQ(totalOf(*g, "nobody"), -1);
}

TEST(Showdown, AnAceIsOneNotElevenAndTenIsZero) {
  // Hands: A: 1 1 1 = 3. B: 10 10 10 = 0. C: 9 9 9 = 27 -> 7. Dealer: 1 + 10 + 11 = 1.
  auto g = cards::makeShowdown({"A", "B", "C"}, stack({1, 10, 9, 1, 1, 10, 9, 10, 1, 10, 9, 11}));
  IS(g->deal(), Ok);
  EXPECT_EQ(totalOf(*g, "A"), 3);
  EXPECT_EQ(totalOf(*g, "B"), 0);
  EXPECT_EQ(totalOf(*g, "C"), 7);
  EXPECT_EQ(g->dealerTotal(), 1);
}

TEST(Showdown, TheHigherValueWinsTheLowerLosesAndEqualValuesPush) {
  // Dealer 5 + 5 + 5 = 15 -> 5.
  auto g = cards::makeShowdown({"hi", "lo", "same"}, stack({9, 1, 2, 5, 9, 1, 2, 5, 9, 1, 1, 5}));
  IS(g->deal(), Ok);
  EXPECT_EQ(totalOf(*g, "hi"), 7);   // 9 + 9 + 9 = 27
  EXPECT_EQ(totalOf(*g, "lo"), 3);   // 1 + 1 + 1
  EXPECT_EQ(totalOf(*g, "same"), 5);  // 2 + 2 + 1
  EXPECT_EQ(g->dealerTotal(), 5);
  EXPECT_TRUE(resultOf(*g, "hi") == Result::Win);
  EXPECT_TRUE(resultOf(*g, "lo") == Result::Lose);
  EXPECT_TRUE(resultOf(*g, "same") == Result::Push);
}

TEST(Showdown, EqualValuesPushWhateverTheCards) {
  auto g = cards::makeShowdown({"A"}, stack({4, 13, 3, 12, 3, 11}));  // 4 + 3 + 3 = 10 -> 0, dealer 0
  IS(g->deal(), Ok);
  EXPECT_EQ(totalOf(*g, "A"), 0);
  EXPECT_EQ(g->dealerTotal(), 0);
  EXPECT_TRUE(resultOf(*g, "A") == Result::Push);
}

TEST(Showdown, BlackjackStillPlaysTheSameAfterAddingAGame) {
  auto g = cards::makeBlackjack({"A"}, stack({10, 10, 9, 7, 5}));
  IS(g->deal(), Ok);
  EXPECT_TRUE(g->phase() == Phase::PlayerTurns);
  IS(g->stand("A"), Ok);
  EXPECT_EQ(g->dealerTotal(), 17);
  EXPECT_TRUE(resultOf(*g, "A") == Result::Win);
}

TEST(Showdown, RandomTablesMatchAnIndependentModel) {
  std::uint32_t seed = 55512345;
  auto next = [&seed](int n) {
    seed = seed * 1664525u + 1013904223u;
    return static_cast<int>((seed >> 8) % static_cast<std::uint32_t>(n));
  };
  for (int game = 0; game < 300; ++game) {
    const int players = 1 + next(6);
    std::vector<std::string> names;
    for (int i = 0; i < players; ++i) names.push_back("p" + std::to_string(i));
    std::vector<int> ranks;
    Deck deck;
    const int size = 3 * (players + 1) + next(10);
    for (int i = 0; i < size; ++i) {
      ranks.push_back(1 + next(13));
      deck.push_back(Card{ranks.back(), static_cast<cards::Suit>(next(4))});
    }
    auto g = cards::makeShowdown(names, deck);
    ASSERT_TRUE(g != nullptr);
    ASSERT_TRUE(g->deal() == Status::Ok);
    std::vector<int> sums(players + 1, 0);  // the last entry is the dealer
    std::size_t top = 0;
    for (int round = 0; round < 3; ++round) {
      for (int seat = 0; seat <= players; ++seat) {
        const int rank = ranks[top++];
        sums[seat] += rank >= 10 ? 0 : rank;
      }
    }
    EXPECT_EQ(g->dealerTotal(), sums[players] % 10);
    for (int i = 0; i < players; ++i) {
      EXPECT_EQ(totalOf(*g, names[i]), sums[i] % 10);
      const int mine = sums[i] % 10, theirs = sums[players] % 10;
      const Result expected = mine > theirs ? Result::Win : (mine < theirs ? Result::Lose : Result::Push);
      EXPECT_TRUE(resultOf(*g, names[i]) == expected);
    }
    EXPECT_TRUE(g->phase() == Phase::Finished);
  }
}
