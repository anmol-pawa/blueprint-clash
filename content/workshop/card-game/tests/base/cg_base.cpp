#include <algorithm>
#include <cstdint>
#include <initializer_list>
#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
using cards::Card;
using cards::Deck;
using cards::Phase;
using cards::Result;
using cards::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

// A stacked deck from ranks (suits rotate; the rules never look at them).
Deck stack(std::initializer_list<int> ranks) {
  Deck deck;
  int i = 0;
  for (int rank : ranks) deck.push_back(Card{rank, static_cast<cards::Suit>(i++ % 4)});
  return deck;
}

std::string show(const std::vector<Card>& cardsHeld) {
  std::string out;
  for (const auto& c : cardsHeld) out += (out.empty() ? "" : " ") + std::to_string(c.rank);
  return out;
}

struct Table {
  std::unique_ptr<cards::Game> game;
  Table(const std::vector<std::string>& names, const Deck& deck) : game(cards::makeBlackjack(names, deck)) {}

  std::string hand(const std::string& who) const {
    std::vector<Card> h;
    game->hand(who, h);
    return show(h);
  }
  int total(const std::string& who) const {
    int t = -1;
    game->total(who, t);
    return t;
  }
  std::string dealer() const { return show(game->dealerHand()); }
  Result result(const std::string& who) const {
    Result r = Result::Push;
    game->result(who, r);
    return r;
  }
};

// Deck layouts for one player "A": A1, dealer1, A2, dealer2, then the rest.
Deck solo(int a1, int d1, int a2, int d2, std::initializer_list<int> rest = {}) {
  std::vector<int> ranks{a1, d1, a2, d2};
  ranks.insert(ranks.end(), rest.begin(), rest.end());
  Deck deck;
  int i = 0;
  for (int rank : ranks) deck.push_back(Card{rank, static_cast<cards::Suit>(i++ % 4)});
  return deck;
}
}  // namespace

TEST(Setup, RefusesBadPlayersAndDecksThatCannotBeDealt) {
  const Deck big = cards::standardDeck();
  EXPECT_TRUE(cards::makeBlackjack({}, big) == nullptr);
  EXPECT_TRUE(cards::makeBlackjack({"a", "b", "c", "d", "e", "f", "g"}, big) == nullptr);
  EXPECT_TRUE(cards::makeBlackjack({"a", "b", "c", "d", "e", "f"}, big) != nullptr);
  EXPECT_TRUE(cards::makeBlackjack({"a", "a"}, big) == nullptr);
  EXPECT_TRUE(cards::makeBlackjack({""}, big) == nullptr);
  EXPECT_TRUE(cards::makeBlackjack({std::string(17, 'x')}, big) == nullptr);
  EXPECT_TRUE(cards::makeBlackjack({std::string(16, 'x')}, big) != nullptr);
  EXPECT_TRUE(cards::makeBlackjack({"a"}, stack({2, 3, 4})) == nullptr);
  EXPECT_TRUE(cards::makeBlackjack({"a"}, stack({2, 3, 4, 5})) != nullptr);
  EXPECT_TRUE(cards::makeBlackjack({"a", "b"}, stack({2, 3, 4, 5, 6})) == nullptr);
  EXPECT_TRUE(cards::makeBlackjack({"a", "b"}, stack({2, 3, 4, 5, 6, 7})) != nullptr);
  EXPECT_TRUE(cards::makeBlackjack({"a", "b", "c", "d", "e", "f"}, Deck(13, Card{2, cards::Suit::Clubs})) == nullptr);
  EXPECT_TRUE(cards::makeBlackjack({"a", "b", "c", "d", "e", "f"}, Deck(14, Card{2, cards::Suit::Clubs})) != nullptr);
}

TEST(Setup, AFreshGameIsWaitingWithNothingDealt) {
  Table t({"A", "B"}, cards::standardDeck());
  EXPECT_TRUE(t.game->phase() == Phase::Waiting);
  EXPECT_EQ(t.game->current(), std::string(""));
  EXPECT_EQ(t.hand("A"), std::string(""));
  EXPECT_EQ(t.total("A"), 0);
  EXPECT_EQ(t.dealer(), std::string(""));
  EXPECT_EQ(t.game->dealerTotal(), 0);
  Result r = Result::Win;
  IS(t.game->result("A", r), WrongPhase);
  EXPECT_TRUE(r == Result::Win);
  IS(t.game->hit("A"), WrongPhase);
  IS(t.game->stand("A"), WrongPhase);
  IS(t.game->hit("nobody"), UnknownPlayer);
  IS(t.game->stand("nobody"), UnknownPlayer);
  std::vector<Card> h;
  int total = 99;
  IS(t.game->hand("nobody", h), UnknownPlayer);
  IS(t.game->total("nobody", total), UnknownPlayer);
  IS(t.game->result("nobody", r), UnknownPlayer);
  EXPECT_EQ(total, 99);
}

TEST(Deal, GoesRoundTheTableOneCardAtATimeAndEndsWithTheDealer) {
  Table t({"A", "B"}, stack({2, 3, 4, 5, 6, 7, 8, 9}));
  IS(t.game->deal(), Ok);
  EXPECT_EQ(t.hand("A"), std::string("2 5"));
  EXPECT_EQ(t.hand("B"), std::string("3 6"));
  EXPECT_EQ(t.dealer(), std::string("4 7"));
  EXPECT_TRUE(t.game->phase() == Phase::PlayerTurns);
  EXPECT_EQ(t.game->current(), std::string("A"));
  // The next card in the deck is what a hit draws.
  IS(t.game->hit("A"), Ok);
  EXPECT_EQ(t.hand("A"), std::string("2 5 8"));
  IS(t.game->stand("A"), Ok);
  IS(t.game->hit("B"), Ok);
  EXPECT_EQ(t.hand("B"), std::string("3 6 9"));
}

TEST(Deal, HappensOnceAndARefusedDealChangesNothing) {
  Table t({"A"}, solo(2, 3, 4, 5, {6, 7}));
  IS(t.game->deal(), Ok);
  IS(t.game->deal(), WrongPhase);
  EXPECT_EQ(t.hand("A"), std::string("2 4"));
  EXPECT_EQ(t.dealer(), std::string("3 5"));
  IS(t.game->stand("A"), Ok);
  EXPECT_TRUE(t.game->phase() == Phase::Finished);
  IS(t.game->deal(), WrongPhase);
}

TEST(Value, AnAceIsElevenUntilThatWouldPassTwentyOne) {
  Table t({"A"}, solo(1, 9, 6, 7, {10, 5, 2}));
  IS(t.game->deal(), Ok);
  EXPECT_EQ(t.total("A"), 17);  // soft 17
  IS(t.game->hit("A"), Ok);
  EXPECT_EQ(t.total("A"), 17);  // A + 6 + 10: the Ace drops to 1
  IS(t.game->hit("A"), Ok);
  EXPECT_EQ(t.total("A"), 22);  // a bust is the sum with every Ace as 1
}

TEST(Value, FacesAreTenAndTwoAcesMakeTwelve) {
  {
    Table t({"A"}, solo(11, 2, 12, 3, {5}));
    IS(t.game->deal(), Ok);
    EXPECT_EQ(t.total("A"), 20);
  }
  {
    Table t({"A"}, solo(13, 2, 10, 3, {5}));
    IS(t.game->deal(), Ok);
    EXPECT_EQ(t.total("A"), 20);
  }
  {
    Table t({"A"}, solo(1, 2, 1, 3, {5, 9, 9}));
    IS(t.game->deal(), Ok);
    EXPECT_EQ(t.total("A"), 12);
    IS(t.game->hit("A"), Ok);
    EXPECT_EQ(t.total("A"), 17);  // A, A, 5: one Ace is 11, the other is 1
  }
  {
    Table t({"A"}, solo(1, 9, 1, 8, {1, 1, 9, 9}));
    IS(t.game->deal(), Ok);
    IS(t.game->hit("A"), Ok);
    IS(t.game->hit("A"), Ok);
    EXPECT_EQ(t.total("A"), 14);  // four Aces: 11 + 1 + 1 + 1
  }
}

TEST(Turns, SeatsActInOrderAndRefusalsFollowTheDocumentedOrder) {
  Table t({"A", "B"}, stack({2, 3, 4, 5, 6, 7, 8, 9}));
  IS(t.game->hit("A"), WrongPhase);
  IS(t.game->hit("zed"), UnknownPlayer);
  IS(t.game->deal(), Ok);
  IS(t.game->hit("zed"), UnknownPlayer);
  IS(t.game->hit("B"), NotYourTurn);
  IS(t.game->stand("B"), NotYourTurn);
  EXPECT_EQ(t.hand("B"), std::string("3 6"));
  EXPECT_EQ(t.game->current(), std::string("A"));
  IS(t.game->stand("A"), Ok);
  EXPECT_EQ(t.game->current(), std::string("B"));
  IS(t.game->hit("A"), NotYourTurn);
  IS(t.game->stand("B"), Ok);
  EXPECT_EQ(t.game->current(), std::string(""));
  EXPECT_TRUE(t.game->phase() == Phase::Finished);
  IS(t.game->hit("A"), WrongPhase);
  IS(t.game->stand("B"), WrongPhase);
  IS(t.game->stand("zed"), UnknownPlayer);
}

TEST(Turns, ANaturalHasNoDecisionAndTwentyOneEndsATurnAtOnce) {
  // A: A+K (natural), B: 5+6. Dealer 9+7. B hits a 10 for 21.
  Table t({"A", "B"}, stack({1, 5, 9, 13, 6, 7, 10, 2, 3}));
  IS(t.game->deal(), Ok);
  EXPECT_EQ(t.hand("A"), std::string("1 13"));
  EXPECT_EQ(t.game->current(), std::string("B"));
  IS(t.game->hit("A"), NotYourTurn);
  IS(t.game->hit("B"), Ok);
  EXPECT_EQ(t.total("B"), 21);
  EXPECT_EQ(t.game->current(), std::string(""));
  EXPECT_TRUE(t.game->phase() == Phase::Finished);
  EXPECT_EQ(t.dealer(), std::string("9 7 2"));  // 16 draws a 2 and stands on 18
}

TEST(Turns, HittingPastTwentyOneBustsAndPassesTheTurn) {
  Table t({"A", "B"}, stack({10, 2, 9, 3, 6, 4, 7, 5, 8}));
  IS(t.game->deal(), Ok);  // A holds 10 and 3, B 2 and 6, the dealer 9 and 4; the deck continues 7, 5, 8
  EXPECT_EQ(t.hand("A"), std::string("10 3"));
  IS(t.game->hit("A"), Ok);  // 7 -> 20
  EXPECT_EQ(t.total("A"), 20);
  IS(t.game->hit("A"), Ok);  // 5 -> 25 bust
  EXPECT_EQ(t.total("A"), 25);
  EXPECT_EQ(t.game->current(), std::string("B"));
  IS(t.game->hit("A"), NotYourTurn);
}

TEST(Turns, AHitWithAnEmptyDeckIsRefusedAndTheTurnStays) {
  Table t({"A"}, solo(5, 10, 6, 7));
  IS(t.game->deal(), Ok);
  IS(t.game->hit("A"), DeckEmpty);
  EXPECT_EQ(t.hand("A"), std::string("5 6"));
  EXPECT_EQ(t.game->current(), std::string("A"));
  IS(t.game->stand("A"), Ok);
  EXPECT_TRUE(t.game->phase() == Phase::Finished);
}

TEST(Dealer, DrawsBelowSeventeenAndStandsOnEverySeventeen) {
  {  // hard 17
    Table t({"A"}, solo(10, 10, 9, 7, {5}));
    IS(t.game->deal(), Ok);
    IS(t.game->stand("A"), Ok);
    EXPECT_EQ(t.dealer(), std::string("10 7"));
  }
  {  // soft 17 stands in the basic game
    Table t({"A"}, solo(10, 1, 9, 6, {5}));
    IS(t.game->deal(), Ok);
    IS(t.game->stand("A"), Ok);
    EXPECT_EQ(t.dealer(), std::string("1 6"));
    EXPECT_EQ(t.game->dealerTotal(), 17);
  }
  {  // 16 draws once
    Table t({"A"}, solo(10, 10, 9, 6, {2, 5}));
    IS(t.game->deal(), Ok);
    IS(t.game->stand("A"), Ok);
    EXPECT_EQ(t.dealer(), std::string("10 6 2"));
    EXPECT_EQ(t.game->dealerTotal(), 18);
  }
}

TEST(Dealer, KeepsDrawingAfterTheLastPlayerAndNotBefore) {
  Table t({"A", "B"}, stack({10, 9, 2, 8, 3, 4, 4, 5, 6}));
  IS(t.game->deal(), Ok);
  EXPECT_EQ(t.dealer(), std::string("2 4"));  // the dealer does not move while players decide
  IS(t.game->stand("A"), Ok);
  EXPECT_EQ(t.dealer(), std::string("2 4"));
  IS(t.game->stand("B"), Ok);
  EXPECT_EQ(t.dealer(), std::string("2 4 4 5 6"));  // 6, 10, 15, 21: five cards, every draw below 17 until the last
  EXPECT_EQ(t.game->dealerTotal(), 21);
}

TEST(Dealer, StandsWhenTheDeckRunsOut) {
  Table t({"A"}, solo(10, 10, 9, 6));
  IS(t.game->deal(), Ok);
  IS(t.game->stand("A"), Ok);
  EXPECT_TRUE(t.game->phase() == Phase::Finished);
  EXPECT_EQ(t.game->dealerTotal(), 16);
  EXPECT_TRUE(t.result("A") == Result::Win);  // 19 beats 16
}

TEST(Settle, ABustLosesEvenIfTheDealerBustsToo) {
  Table t({"A"}, solo(10, 10, 6, 6, {10, 10}));
  IS(t.game->deal(), Ok);
  IS(t.game->hit("A"), Ok);  // 26
  EXPECT_TRUE(t.game->phase() == Phase::Finished);
  EXPECT_EQ(t.game->dealerTotal(), 26);
  EXPECT_TRUE(t.result("A") == Result::Lose);
}

TEST(Settle, ADealerBustPaysEveryPlayerStillIn) {
  Table t({"A", "B", "C"}, stack({10, 9, 2, 8, 10, 3, 9, 8, 10, 10}));
  IS(t.game->deal(), Ok);
  // A holds 20, B 12, C 11; the dealer holds 16 and draws a 10 for 26
  IS(t.game->stand("A"), Ok);
  IS(t.game->stand("B"), Ok);
  IS(t.game->stand("C"), Ok);
  EXPECT_TRUE(t.game->phase() == Phase::Finished);
  EXPECT_TRUE(t.game->dealerTotal() > 21);
  EXPECT_TRUE(t.result("A") == Result::Win);
  EXPECT_TRUE(t.result("B") == Result::Win);
  EXPECT_TRUE(t.result("C") == Result::Win);
}

TEST(Settle, HigherTotalWinsLowerLosesAndEqualPushes) {
  Table t({"A", "B", "C"}, stack({10, 10, 10, 10, 10, 9, 8, 9, 9, 9}));
  IS(t.game->deal(), Ok);
  EXPECT_EQ(t.dealer(), std::string("10 9"));  // 19
  IS(t.game->stand("A"), Ok);
  IS(t.game->stand("B"), Ok);
  IS(t.game->stand("C"), Ok);
  EXPECT_EQ(t.total("A"), 20);
  EXPECT_EQ(t.total("B"), 19);
  EXPECT_EQ(t.total("C"), 18);
  EXPECT_TRUE(t.result("A") == Result::Win);
  EXPECT_TRUE(t.result("B") == Result::Push);
  EXPECT_TRUE(t.result("C") == Result::Lose);
}

TEST(Settle, ANaturalBeatsEveryOtherTwentyOneAndTiesANatural) {
  {  // player natural, dealer 21 with three cards
    Table t({"A"}, solo(1, 5, 13, 6, {10}));
    IS(t.game->deal(), Ok);
    EXPECT_TRUE(t.game->phase() == Phase::Finished);
    EXPECT_EQ(t.dealer(), std::string("5 6 10"));
    EXPECT_TRUE(t.result("A") == Result::Win);
  }
  {  // player 21 in three cards, dealer natural
    Table t({"A"}, solo(5, 1, 6, 12, {10}));
    IS(t.game->deal(), Ok);
    IS(t.game->hit("A"), Ok);
    EXPECT_EQ(t.total("A"), 21);
    EXPECT_TRUE(t.game->phase() == Phase::Finished);
    EXPECT_TRUE(t.result("A") == Result::Lose);
  }
  {  // both natural
    Table t({"A"}, solo(1, 1, 11, 13));
    IS(t.game->deal(), Ok);
    EXPECT_TRUE(t.result("A") == Result::Push);
  }
  {  // both 21 without a natural
    Table t({"A"}, solo(5, 5, 6, 6, {10, 10}));
    IS(t.game->deal(), Ok);
    IS(t.game->hit("A"), Ok);
    EXPECT_TRUE(t.result("A") == Result::Push);
  }
  {  // player 20 against a dealer natural
    Table t({"A"}, solo(10, 1, 10, 13));
    IS(t.game->deal(), Ok);
    IS(t.game->stand("A"), Ok);
    EXPECT_TRUE(t.result("A") == Result::Lose);
  }
}

TEST(Settle, ResultsAppearOnlyWhenTheRoundIsFinished) {
  Table t({"A", "B"}, stack({10, 9, 2, 8, 3, 4, 4, 5, 6, 7}));
  IS(t.game->deal(), Ok);
  Result r = Result::Win;
  IS(t.game->result("A", r), WrongPhase);
  IS(t.game->stand("A"), Ok);
  IS(t.game->result("A", r), WrongPhase);
  IS(t.game->stand("B"), Ok);
  IS(t.game->result("A", r), Ok);
  IS(t.game->result("B", r), Ok);
  IS(t.game->result("nobody", r), UnknownPlayer);
}

// A model: plain, procedural Twenty-One written separately from any design, to be compared with games played at random.
namespace model {
int total(const std::vector<int>& ranks) {
  int sum = 0;
  bool ace = false;
  for (int r : ranks) {
    sum += r >= 11 ? 10 : r;
    ace = ace || r == 1;
  }
  return (ace && sum + 10 <= 21) ? sum + 10 : sum;
}
Result settle(const std::vector<int>& p, const std::vector<int>& d) {
  const int pt = total(p), dt = total(d);
  const bool pn = p.size() == 2 && pt == 21, dn = d.size() == 2 && dt == 21;
  if (pt > 21) return Result::Lose;
  if (dt > 21) return Result::Win;
  if (pn && dn) return Result::Push;
  if (pn) return Result::Win;
  if (dn) return Result::Lose;
  return pt > dt ? Result::Win : (pt < dt ? Result::Lose : Result::Push);
}
}  // namespace model

TEST(Model, RandomRoundsMatchAnIndependentImplementation) {
  std::uint32_t seed = 20240611;
  auto next = [&seed](int n) {
    seed = seed * 1664525u + 1013904223u;
    return static_cast<int>((seed >> 8) % static_cast<std::uint32_t>(n));
  };
  for (int game = 0; game < 400; ++game) {
    const int players = 1 + next(6);
    std::vector<std::string> names;
    for (int i = 0; i < players; ++i) names.push_back("p" + std::to_string(i));
    Deck deck;
    std::vector<int> ranks;
    const int size = 2 * (players + 1) + next(30);
    for (int i = 0; i < size; ++i) {
      ranks.push_back(1 + next(13));
      deck.push_back(Card{ranks.back(), static_cast<cards::Suit>(next(4))});
    }
    auto g = cards::makeBlackjack(names, deck);
    ASSERT_TRUE(g != nullptr);
    ASSERT_TRUE(g->deal() == Status::Ok);
    // model state
    std::size_t top = 0;
    std::vector<std::vector<int>> hands(players);
    std::vector<int> dealer;
    for (int round = 0; round < 2; ++round) {
      for (int i = 0; i < players; ++i) hands[i].push_back(ranks[top++]);
      dealer.push_back(ranks[top++]);
    }
    for (int i = 0; i < players; ++i) {
      const int style = next(3);  // 0 stands at once, 1 hits below 15, 2 hits below 19
      while (model::total(hands[i]) < 21) {
        const int t = model::total(hands[i]);
        const bool wantsHit = style == 1 ? t < 15 : (style == 2 ? t < 19 : false);
        EXPECT_EQ(g->current(), names[i]);
        if (!wantsHit) {
          EXPECT_TRUE(g->stand(names[i]) == Status::Ok);
          break;
        }
        if (top == ranks.size()) {
          EXPECT_TRUE(g->hit(names[i]) == Status::DeckEmpty);
          EXPECT_TRUE(g->stand(names[i]) == Status::Ok);
          break;
        }
        EXPECT_TRUE(g->hit(names[i]) == Status::Ok);
        hands[i].push_back(ranks[top++]);
      }
    }
    EXPECT_TRUE(g->phase() == Phase::Finished);
    while (model::total(dealer) < 17 && top < ranks.size()) dealer.push_back(ranks[top++]);
    EXPECT_EQ(g->dealerTotal(), model::total(dealer));
    EXPECT_EQ(show(g->dealerHand()), [&] { std::string s; for (int r : dealer) s += (s.empty() ? "" : " ") + std::to_string(r); return s; }());
    for (int i = 0; i < players; ++i) {
      int t = 0;
      g->total(names[i], t);
      EXPECT_EQ(t, model::total(hands[i]));
      Result r = Result::Push;
      EXPECT_TRUE(g->result(names[i], r) == Status::Ok);
      EXPECT_TRUE(r == model::settle(hands[i], dealer));
    }
  }
}
