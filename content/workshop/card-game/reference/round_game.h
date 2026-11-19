#pragma once
#include <cstddef>
#include <string>

#include "table_game.h"

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
