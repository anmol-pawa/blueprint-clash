#pragma once
#include <cstddef>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "hand.h"
#include "shoe.h"

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
