#pragma once
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "scorer.h"
#include "table.h"

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
