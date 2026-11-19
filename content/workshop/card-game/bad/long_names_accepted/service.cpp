#include <cstddef>
#include <memory>
#include <optional>
#include <set>
#include <string>
#include <utility>
#include <vector>
#include "api_storm2.h"



// The cards one seat holds, in the order they were dealt.
class Hand {
 public:
  void add(const cards::Card& card) { cards_.push_back(card); }
  const std::vector<cards::Card>& cards() const { return cards_; }
  std::size_t size() const { return cards_.size(); }

 private:
  std::vector<cards::Card> cards_;
};



// The cards still to be drawn, top first. The caller chose the order; the shoe only hands the cards out.
class Shoe {
 public:
  explicit Shoe(cards::Deck deck) : deck_(std::move(deck)) {}

  bool empty() const { return next_ >= deck_.size(); }
  // Precondition: !empty().
  cards::Card draw() { return deck_[next_++]; }

 private:
  cards::Deck deck_;
  std::size_t next_ = 0;
};


constexpr int kBlackjackTarget = 21;
constexpr int kAceBonus = 10;  // an Ace counts 1, or 11 when that does not pass the target
constexpr int kFacePoints = 10;
constexpr int kModTen = 10;

struct Score {
  int total;
  bool soft;  // an Ace is counted as 11
};

// What a hand is worth (Strategy): every game scores its own way, and the round skeleton never looks at a card.
class Scorer {
 public:
  virtual ~Scorer() = default;
  virtual Score score(const Hand& hand) const = 0;
};

class BlackjackScorer : public Scorer {
 public:
  Score score(const Hand& hand) const override {
    int sum = 0;
    bool hasAce = false;
    for (const auto& card : hand.cards()) {
      sum += card.rank >= cards::kJack ? kFacePoints : card.rank;
      hasAce = hasAce || card.rank == cards::kAce;
    }
    if (hasAce && sum + kAceBonus <= kBlackjackTarget) return Score{sum + kAceBonus, true};
    return Score{sum, false};
  }
};

// Ace 1, 2..9 their rank, ten and the faces 0, summed modulo ten.
class ModTenScorer : public Scorer {
 public:
  Score score(const Hand& hand) const override {
    int sum = 0;
    for (const auto& card : hand.cards()) sum += card.rank >= kModTen ? 0 : card.rank;
    return Score{sum % kModTen, false};
  }
};



// One player's place at the table.
class Seat {
 public:
  explicit Seat(std::string name) : name_(std::move(name)) {}

  const std::string& name() const { return name_; }
  Hand& hand() { return hand_; }
  const Hand& hand() const { return hand_; }
  void settle(cards::Result result) { result_ = result; }
  std::optional<cards::Result> result() const { return result_; }

 private:
  std::string name_;
  Hand hand_;
  std::optional<cards::Result> result_;
};

// Who sits where, the dealer's hand and the cards left. It knows nothing about any game's rules.
class Table {
 public:
  Table(const std::vector<std::string>& names, cards::Deck deck) : shoe_(std::move(deck)) {
    for (const auto& name : names) seats_.emplace_back(name);
  }

  std::size_t seatCount() const { return seats_.size(); }
  Seat& seat(std::size_t index) { return seats_[index]; }
  const Seat& seat(std::size_t index) const { return seats_[index]; }
  // The seat with that name, or -1.
  int indexOf(const std::string& name) const {
    for (std::size_t i = 0; i < seats_.size(); ++i) {
      if (seats_[i].name() == name) return static_cast<int>(i);
    }
    return -1;
  }
  Hand& dealer() { return dealer_; }
  const Hand& dealer() const { return dealer_; }
  Shoe& shoe() { return shoe_; }

 private:
  std::vector<Seat> seats_;
  Hand dealer_;
  Shoe shoe_;
};

// Where the round is: the phase and whose turn it is.
class Progress {
 public:
  cards::Phase phase() const { return phase_; }
  std::size_t turn() const { return turn_; }
  void beginTurns() { phase_ = cards::Phase::PlayerTurns; turn_ = 0; }
  void nextTurn() { ++turn_; }
  void finish() { phase_ = cards::Phase::Finished; }

 private:
  cards::Phase phase_ = cards::Phase::Waiting;
  std::size_t turn_ = 0;
};



// The read side of every game: the same questions are answered the same way whichever rules are being played.
class TableGame : public cards::Game {
 public:
  cards::Phase phase() const override { return progress_.phase(); }

  std::string current() const override {
    if (progress_.phase() != cards::Phase::PlayerTurns) return "";
    return table_.seat(progress_.turn()).name();
  }

  cards::Status hand(const std::string& player, std::vector<cards::Card>& out) const override {
    const int index = table_.indexOf(player);
    if (index < 0) return cards::Status::UnknownPlayer;
    out = table_.seat(static_cast<std::size_t>(index)).hand().cards();
    return cards::Status::Ok;
  }

  cards::Status total(const std::string& player, int& out) const override {
    const int index = table_.indexOf(player);
    if (index < 0) return cards::Status::UnknownPlayer;
    out = scoreOf(table_.seat(static_cast<std::size_t>(index)).hand()).total;
    return cards::Status::Ok;
  }

  cards::Status result(const std::string& player, cards::Result& out) const override {
    const int index = table_.indexOf(player);
    if (index < 0) return cards::Status::UnknownPlayer;
    const auto settled = table_.seat(static_cast<std::size_t>(index)).result();
    if (!settled.has_value()) return cards::Status::WrongPhase;
    out = *settled;
    return cards::Status::Ok;
  }

  std::vector<cards::Card> dealerHand() const override { return table_.dealer().cards(); }
  int dealerTotal() const override { return scoreOf(table_.dealer()).total; }

 protected:
  TableGame(const std::vector<std::string>& names, cards::Deck deck, std::unique_ptr<Scorer> scorer)
      : table_(names, std::move(deck)), scorer_(std::move(scorer)) {}

  Table& table() { return table_; }
  Progress& progress() { return progress_; }
  Score scoreOf(const Hand& hand) const { return scorer_->score(hand); }

 private:
  Table table_;
  Progress progress_;
  std::unique_ptr<Scorer> scorer_;
};



// The skeleton of a round (Template Method). deal(), hit() and stand() fix the order of the steps: deal round the table, let
// each seat decide while it can, let the dealer play, settle every seat. A game is a subclass that fills in four hooks.
class RoundGame : public TableGame {
 public:
  ~RoundGame() override = default;

  cards::Status deal() final {
    if (progress().phase() != cards::Phase::Waiting) return cards::Status::WrongPhase;
    for (std::size_t round = 0; round < openingCards(); ++round) {
      for (std::size_t i = 0; i < table().seatCount(); ++i) table().seat(i).hand().add(table().shoe().draw());
      table().dealer().add(table().shoe().draw());
    }
    progress().beginTurns();
    moveOn();
    return cards::Status::Ok;
  }

  cards::Status hit(const std::string& player) final {
    const cards::Status status = turnStatus(player);
    if (status != cards::Status::Ok) return status;
    if (table().shoe().empty()) return cards::Status::DeckEmpty;
    Hand& hand = table().seat(progress().turn()).hand();
    hand.add(table().shoe().draw());
    if (!canAct(hand)) {
      progress().nextTurn();
      moveOn();
    }
    return cards::Status::Ok;
  }

  cards::Status stand(const std::string& player) final {
    const cards::Status status = turnStatus(player);
    if (status != cards::Status::Ok) return status;
    progress().nextTurn();
    moveOn();
    return cards::Status::Ok;
  }

 protected:
  RoundGame(const std::vector<std::string>& names, cards::Deck deck, std::unique_ptr<Scorer> scorer)
      : TableGame(names, std::move(deck), std::move(scorer)) {}

  // The hooks: what makes one game different from another.
  virtual std::size_t openingCards() const = 0;                 // cards each seat and the dealer get in the deal
  virtual bool canAct(const Hand& hand) const = 0;              // may this hand still take a decision?
  virtual bool dealerDraws(const Hand& hand) const = 0;         // does the dealer take another card?
  virtual cards::Result settle(const Hand& player, const Hand& dealer) const = 0;

 private:
  cards::Status turnStatus(const std::string& player) {
    const int index = table().indexOf(player);
    if (index < 0) return cards::Status::UnknownPlayer;
    if (progress().phase() != cards::Phase::PlayerTurns) return cards::Status::WrongPhase;
    if (static_cast<std::size_t>(index) != progress().turn()) return cards::Status::NotYourTurn;
    return cards::Status::Ok;
  }

  // Skips the seats that have no decision; when none is left the round is over for the players.
  void moveOn() {
    while (progress().turn() < table().seatCount() && !canAct(table().seat(progress().turn()).hand())) progress().nextTurn();
    if (progress().turn() == table().seatCount()) finishRound();
  }

  void finishRound() {
    while (dealerDraws(table().dealer()) && !table().shoe().empty()) table().dealer().add(table().shoe().draw());
    progress().finish();
    for (std::size_t i = 0; i < table().seatCount(); ++i) {
      Seat& seat = table().seat(i);
      seat.settle(settle(seat.hand(), table().dealer()));
    }
  }
};



constexpr std::size_t kBlackjackOpening = 2;
constexpr std::size_t kCharlieCards = 5;
constexpr int kDealerStandsOn = 17;

// Twenty-One: two cards each, players decide, the dealer draws to 17. House rules are data, not subclasses.
class Blackjack : public RoundGame {
 public:
  Blackjack(const std::vector<std::string>& names, cards::Deck deck, const cards::HouseRules& rules)
      : RoundGame(names, std::move(deck), std::make_unique<BlackjackScorer>()), rules_(rules) {}

 protected:
  std::size_t openingCards() const override { return kBlackjackOpening; }

  bool canAct(const Hand& hand) const override {
    if (rules_.fiveCardCharlie && hand.size() >= kCharlieCards) return false;
    return scoreOf(hand).total < kBlackjackTarget;
  }

  bool dealerDraws(const Hand& hand) const override {
    const Score score = scoreOf(hand);
    if (score.total < kDealerStandsOn) return true;
    return rules_.dealerHitsSoft17 && score.total == kDealerStandsOn && score.soft;
  }

  cards::Result settle(const Hand& player, const Hand& dealer) const override {
    const int mine = scoreOf(player).total;
    const int theirs = scoreOf(dealer).total;
    const bool dealerNatural = isNatural(dealer);
    if (mine > kBlackjackTarget) return cards::Result::Lose;
    if (isCharlie(player)) return dealerNatural ? cards::Result::Lose : cards::Result::Win;
    if (theirs > kBlackjackTarget) return cards::Result::Win;
    if (isNatural(player)) return dealerNatural ? cards::Result::Push : cards::Result::Win;
    if (dealerNatural) return cards::Result::Lose;
    if (mine == theirs) return cards::Result::Push;
    return mine > theirs ? cards::Result::Win : cards::Result::Lose;
  }

 private:
  bool isNatural(const Hand& hand) const {
    return hand.size() == kBlackjackOpening && scoreOf(hand).total == kBlackjackTarget;
  }
  bool isCharlie(const Hand& hand) const {
    return rules_.fiveCardCharlie && hand.size() >= kCharlieCards && scoreOf(hand).total <= kBlackjackTarget;
  }

  cards::HouseRules rules_;
};



constexpr std::size_t kShowdownOpening = 3;

// Three cards each, nobody decides, the higher value (modulo ten) wins. Only the four hooks differ from Blackjack.
class Showdown : public RoundGame {
 public:
  Showdown(const std::vector<std::string>& names, cards::Deck deck)
      : RoundGame(names, std::move(deck), std::make_unique<ModTenScorer>()) {}

 protected:
  std::size_t openingCards() const override { return kShowdownOpening; }
  bool canAct(const Hand&) const override { return false; }
  bool dealerDraws(const Hand&) const override { return false; }

  cards::Result settle(const Hand& player, const Hand& dealer) const override {
    const int mine = scoreOf(player).total;
    const int theirs = scoreOf(dealer).total;
    if (mine == theirs) return cards::Result::Push;
    return mine > theirs ? cards::Result::Win : cards::Result::Lose;
  }
};



constexpr std::size_t kMaxPlayers = 6;
constexpr std::size_t kMaxNameLength = 32;

// Decides whether a table can be seated at all, before any game object exists.
class TableValidator {
 public:
  // May these players sit, and is the deck big enough for the first deal of a game that deals `opening` cards each?
  static bool valid(const std::vector<std::string>& players, const cards::Deck& deck, std::size_t opening) {
    if (players.empty() || players.size() > kMaxPlayers) return false;
    std::set<std::string> seen;
    for (const auto& name : players) {
      if (name.empty() || name.size() > kMaxNameLength) return false;
      if (!seen.insert(name).second) return false;
    }
    return deck.size() >= opening * (players.size() + 1);
  }
};


std::unique_ptr<cards::Game> cards::makeBlackjackWith(const std::vector<std::string>& players, const Deck& deck,
                                                       const HouseRules& rules) {
  if (!TableValidator::valid(players, deck, kBlackjackOpening)) return nullptr;
  return std::make_unique<Blackjack>(players, deck, rules);
}

std::unique_ptr<cards::Game> cards::makeBlackjack(const std::vector<std::string>& players, const Deck& deck) {
  return makeBlackjackWith(players, deck, HouseRules{});
}

std::unique_ptr<cards::Game> cards::makeShowdown(const std::vector<std::string>& players, const Deck& deck) {
  if (!TableValidator::valid(players, deck, kShowdownOpening)) return nullptr;
  return std::make_unique<Showdown>(players, deck);
}
