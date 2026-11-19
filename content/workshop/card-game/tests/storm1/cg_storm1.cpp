#include <cstdint>
#include <initializer_list>
#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
#include "bp_test.h"

namespace {
using cards::Card;
using cards::Deck;
using cards::HouseRules;
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

// One player "A": A1, dealer1, A2, dealer2, then the rest.
Deck solo(int a1, int d1, int a2, int d2, std::initializer_list<int> rest = {}) {
  std::vector<int> ranks{a1, d1, a2, d2};
  ranks.insert(ranks.end(), rest.begin(), rest.end());
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

HouseRules soft17() {
  HouseRules r;
  r.dealerHitsSoft17 = true;
  return r;
}
HouseRules charlie() {
  HouseRules r;
  r.fiveCardCharlie = true;
  return r;
}

Result resultOf(const cards::Game& g, const std::string& who) {
  Result r = Result::Push;
  g.result(who, r);
  return r;
}
}  // namespace

TEST(HouseRules, NoRulesIsTheBasicGameAndBadSetupIsStillRefused) {
  EXPECT_TRUE(cards::makeBlackjackWith({}, cards::standardDeck(), HouseRules{}) == nullptr);
  EXPECT_TRUE(cards::makeBlackjackWith({"a", "a"}, cards::standardDeck(), soft17()) == nullptr);
  EXPECT_TRUE(cards::makeBlackjackWith({"a"}, stack({1, 2, 3}), charlie()) == nullptr);
  EXPECT_TRUE(cards::makeBlackjackWith({"a"}, stack({1, 2, 3, 4}), charlie()) != nullptr);
  // A soft 17 stands when no rule says otherwise.
  auto g = cards::makeBlackjackWith({"A"}, solo(10, 1, 9, 6, {5}), HouseRules{});
  ASSERT_TRUE(g != nullptr);
  IS(g->deal(), Ok);
  IS(g->stand("A"), Ok);
  EXPECT_EQ(show(g->dealerHand()), std::string("1 6"));
}

TEST(Soft17, TheDealerDrawsOnASoftSeventeenOnlyWhenTheHouseSaysSo) {
  {  // A + 6 is a soft 17 and draws; the 4 makes a soft 21, which stands
    auto g = cards::makeBlackjackWith({"A"}, solo(10, 1, 9, 6, {4, 5}), soft17());
    IS(g->deal(), Ok);
    IS(g->stand("A"), Ok);
    EXPECT_EQ(show(g->dealerHand()), std::string("1 6 4"));
    EXPECT_EQ(g->dealerTotal(), 21);
  }
  {  // hard 17 stands under the rule
    auto g = cards::makeBlackjackWith({"A"}, solo(10, 10, 9, 7, {4}), soft17());
    IS(g->deal(), Ok);
    IS(g->stand("A"), Ok);
    EXPECT_EQ(show(g->dealerHand()), std::string("10 7"));
  }
  {  // soft 18 stands under the rule
    auto g = cards::makeBlackjackWith({"A"}, solo(10, 1, 9, 7, {4}), soft17());
    IS(g->deal(), Ok);
    IS(g->stand("A"), Ok);
    EXPECT_EQ(show(g->dealerHand()), std::string("1 7"));
    EXPECT_EQ(g->dealerTotal(), 18);
  }
  {  // a total of 17 that needs no Ace as 11 is hard even though the hand has an Ace
    auto g = cards::makeBlackjackWith({"A"}, solo(10, 1, 9, 6, {10, 5}), soft17());
    IS(g->deal(), Ok);
    IS(g->stand("A"), Ok);
    EXPECT_EQ(show(g->dealerHand()), std::string("1 6 10"));  // 1 + 6 + 10 = 17 hard: the dealer stops
    EXPECT_EQ(g->dealerTotal(), 17);
  }
}

TEST(Soft17, TheRuleIsAppliedToTheNewTotalAfterEveryCard) {
  // The dealer holds A + 2 (soft 13), draws a 4 (soft 17) and, under the rule, draws again: a 5 makes a hard 12, then a 10 busts.
  auto g = cards::makeBlackjackWith({"A"}, solo(10, 1, 9, 2, {4, 5, 10, 3}), soft17());
  IS(g->deal(), Ok);
  IS(g->stand("A"), Ok);
  EXPECT_EQ(show(g->dealerHand()), std::string("1 2 4 5 10"));
  EXPECT_EQ(g->dealerTotal(), 22);
  EXPECT_TRUE(resultOf(*g, "A") == Result::Win);
  // Without the rule the same cards stop at the soft 17.
  auto basic = cards::makeBlackjackWith({"A"}, solo(10, 1, 9, 2, {4, 5, 10, 3}), HouseRules{});
  IS(basic->deal(), Ok);
  IS(basic->stand("A"), Ok);
  EXPECT_EQ(show(basic->dealerHand()), std::string("1 2 4"));
  EXPECT_TRUE(resultOf(*basic, "A") == Result::Win);  // 19 beats 17
}

TEST(Charlie, FiveCardsUnderTwentyOneEndTheTurnAndBeatTheDealer) {
  // A: 2 + 3, hits 2, 2, 3 (total 12 with five cards) and the turn ends; the dealer holds 10 + 10 = 20.
  auto g = cards::makeBlackjackWith({"A", "B"}, stack({2, 5, 10, 3, 6, 10, 2, 2, 3, 9}), charlie());
  IS(g->deal(), Ok);
  IS(g->hit("A"), Ok);
  IS(g->hit("A"), Ok);
  EXPECT_EQ(g->current(), std::string("A"));
  IS(g->hit("A"), Ok);  // the fifth card
  EXPECT_EQ(g->current(), std::string("B"));
  int total = 0;
  g->total("A", total);
  EXPECT_EQ(total, 12);
  IS(g->hit("A"), NotYourTurn);
  IS(g->stand("B"), Ok);
  EXPECT_TRUE(g->phase() == Phase::Finished);
  EXPECT_EQ(g->dealerTotal(), 20);
  EXPECT_TRUE(resultOf(*g, "A") == Result::Win);   // Charlie beats 20 although it is worth only 12
  EXPECT_TRUE(resultOf(*g, "B") == Result::Lose);  // B holds 5 + 6 = 11 against 20
}

TEST(Charlie, ItBeatsADealerTwentyOneAndABustButNotADealerNatural) {
  {  // dealer 21 in three cards
    auto g = cards::makeBlackjackWith({"A"}, solo(2, 5, 3, 6, {2, 2, 3, 10}), charlie());
    IS(g->deal(), Ok);
    IS(g->hit("A"), Ok);
    IS(g->hit("A"), Ok);
    IS(g->hit("A"), Ok);
    EXPECT_EQ(g->dealerTotal(), 21);
    EXPECT_EQ(g->dealerHand().size(), std::size_t(3));
    EXPECT_TRUE(resultOf(*g, "A") == Result::Win);
  }
  {  // dealer bust
    auto g = cards::makeBlackjackWith({"A"}, solo(2, 10, 3, 6, {2, 2, 3, 10}), charlie());
    IS(g->deal(), Ok);
    IS(g->hit("A"), Ok);
    IS(g->hit("A"), Ok);
    IS(g->hit("A"), Ok);
    EXPECT_EQ(g->dealerTotal(), 26);
    EXPECT_TRUE(resultOf(*g, "A") == Result::Win);
  }
  {  // dealer natural
    auto g = cards::makeBlackjackWith({"A"}, solo(2, 1, 3, 13, {2, 2, 3}), charlie());
    IS(g->deal(), Ok);
    IS(g->hit("A"), Ok);
    IS(g->hit("A"), Ok);
    IS(g->hit("A"), Ok);
    EXPECT_TRUE(resultOf(*g, "A") == Result::Lose);
  }
}

TEST(Charlie, ABustInFiveCardsStillLosesAndTheRuleOffMeansNothingSpecial) {
  {
    auto g = cards::makeBlackjackWith({"A"}, solo(5, 10, 5, 9, {3, 2, 10}), charlie());
    IS(g->deal(), Ok);
    IS(g->hit("A"), Ok);
    IS(g->hit("A"), Ok);
    IS(g->hit("A"), Ok);  // 5 5 3 2 10 = 25
    EXPECT_TRUE(g->phase() == Phase::Finished);
    EXPECT_TRUE(resultOf(*g, "A") == Result::Lose);
  }
  {  // Without the rule the player keeps deciding at five cards, and the same hand loses to 19.
    auto g = cards::makeBlackjackWith({"A"}, solo(2, 10, 3, 9, {2, 2, 3, 4}), HouseRules{});
    IS(g->deal(), Ok);
    IS(g->hit("A"), Ok);
    IS(g->hit("A"), Ok);
    IS(g->hit("A"), Ok);
    EXPECT_EQ(g->current(), std::string("A"));
    IS(g->hit("A"), Ok);
    IS(g->stand("A"), Ok);
    EXPECT_TRUE(resultOf(*g, "A") == Result::Lose);  // 2 3 2 2 3 4 = 16 against 19
  }
}

TEST(Charlie, TwentyOneInFiveCardsIsJustCharlieAndTheTwoRulesCombine) {
  HouseRules both;
  both.dealerHitsSoft17 = true;
  both.fiveCardCharlie = true;
  auto g = cards::makeBlackjackWith({"A"}, solo(1, 1, 2, 6, {3, 4, 1, 5}), both);
  IS(g->deal(), Ok);
  IS(g->hit("A"), Ok);
  IS(g->hit("A"), Ok);
  IS(g->hit("A"), Ok);  // A 2 3 4 A is a soft 21 in five cards: Charlie, and the turn ends
  EXPECT_TRUE(g->phase() == Phase::Finished);
  EXPECT_EQ(show(g->dealerHand()), std::string("1 6 5"));  // the soft 17 draws a 5 and becomes a hard 12; the deck is empty
  EXPECT_TRUE(resultOf(*g, "A") == Result::Win);
}

// A model of the two rules, written separately, compared with random games.
namespace model {
struct Value {
  int total;
  bool soft;
};
Value value(const std::vector<int>& ranks) {
  int sum = 0;
  bool ace = false;
  for (int r : ranks) {
    sum += r >= 11 ? 10 : r;
    ace = ace || r == 1;
  }
  if (ace && sum + 10 <= 21) return {sum + 10, true};
  return {sum, false};
}
Result settle(const std::vector<int>& p, const std::vector<int>& d, bool charlieRule) {
  const int pt = value(p).total, dt = value(d).total;
  const bool dn = d.size() == 2 && dt == 21;
  if (pt > 21) return Result::Lose;
  if (charlieRule && p.size() >= 5) return dn ? Result::Lose : Result::Win;
  const bool pn = p.size() == 2 && pt == 21;
  if (dt > 21) return Result::Win;
  if (pn && dn) return Result::Push;
  if (pn) return Result::Win;
  if (dn) return Result::Lose;
  return pt > dt ? Result::Win : (pt < dt ? Result::Lose : Result::Push);
}
}  // namespace model

TEST(HouseRules, RandomRoundsWithEveryRuleCombinationMatchAnIndependentModel) {
  std::uint32_t seed = 987654321;
  auto next = [&seed](int n) {
    seed = seed * 1664525u + 1013904223u;
    return static_cast<int>((seed >> 8) % static_cast<std::uint32_t>(n));
  };
  for (int game = 0; game < 500; ++game) {
    HouseRules rules;
    rules.dealerHitsSoft17 = next(2) == 1;
    rules.fiveCardCharlie = next(2) == 1;
    const int players = 1 + next(4);
    std::vector<std::string> names;
    for (int i = 0; i < players; ++i) names.push_back("p" + std::to_string(i));
    Deck deck;
    std::vector<int> ranks;
    const int size = 2 * (players + 1) + 10 + next(40);
    for (int i = 0; i < size; ++i) {
      // Small cards make five-card hands and soft totals common.
      ranks.push_back(next(3) == 0 ? 1 + next(13) : 1 + next(5));
      deck.push_back(Card{ranks.back(), static_cast<cards::Suit>(next(4))});
    }
    auto g = cards::makeBlackjackWith(names, deck, rules);
    ASSERT_TRUE(g != nullptr);
    ASSERT_TRUE(g->deal() == Status::Ok);
    std::size_t top = 0;
    std::vector<std::vector<int>> hands(players);
    std::vector<int> dealer;
    for (int round = 0; round < 2; ++round) {
      for (int i = 0; i < players; ++i) hands[i].push_back(ranks[top++]);
      dealer.push_back(ranks[top++]);
    }
    for (int i = 0; i < players; ++i) {
      const bool hitsAlot = next(2) == 1;
      while (model::value(hands[i]).total < 21 && !(rules.fiveCardCharlie && hands[i].size() >= 5)) {
        EXPECT_EQ(g->current(), names[i]);
        const bool wantsHit = model::value(hands[i]).total < (hitsAlot ? 19 : 14);
        if (!wantsHit || top == ranks.size()) {
          EXPECT_TRUE(g->stand(names[i]) == Status::Ok);
          break;
        }
        EXPECT_TRUE(g->hit(names[i]) == Status::Ok);
        hands[i].push_back(ranks[top++]);
      }
    }
    EXPECT_TRUE(g->phase() == Phase::Finished);
    for (;;) {
      const auto v = model::value(dealer);
      const bool draws = v.total < 17 || (rules.dealerHitsSoft17 && v.total == 17 && v.soft);
      if (!draws || top == ranks.size()) break;
      dealer.push_back(ranks[top++]);
    }
    EXPECT_EQ(g->dealerTotal(), model::value(dealer).total);
    EXPECT_EQ(g->dealerHand().size(), dealer.size());
    for (int i = 0; i < players; ++i) {
      EXPECT_TRUE(resultOf(*g, names[i]) == model::settle(hands[i], dealer, rules.fiveCardCharlie));
    }
  }
}
