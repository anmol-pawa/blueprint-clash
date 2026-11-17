#pragma once
// Public API for the ATM problem. The hidden tests only use what is declared here.
// You implement atm::makeAtm() (in any of your .cpp files); everything behind it is your design.
// Nothing here throws: this code is compiled without exceptions.
#include <map>
#include <memory>
#include <string>

namespace atm {

// A collection of notes: denomination (the value of one note) -> how many. Counts of zero may be present or absent.
using Notes = std::map<int, int>;

// The most one transaction may ask for.
constexpr long long kMaxWithdrawal = 10000;

enum class Status {
  Ok,
  WrongState,         // the operation makes no sense right now (for example withdraw before the PIN was accepted)
  OutOfService,       // no card is inside and the machine holds no notes at all
  UnknownCard,        // the bank does not know this card; it is handed back at once
  CardBlocked,        // this machine has kept this card after three wrong PINs and will not take it again
  WrongPin,           // the PIN was wrong and the card stays in
  CardRetained,       // the third wrong PIN in a row: the machine keeps the card
  InvalidAmount,      // below 1 or above kMaxWithdrawal
  InsufficientFunds,  // the account does not hold the amount
  CannotDispense,     // the machine cannot pay this amount exactly with the notes it holds
  DailyLimitExceeded, // only the machine of Change Storm 2 gives this answer; makeAtm never does
};

enum class State {
  Idle,          // waiting for a card
  AwaitingPin,   // a card is in, the PIN has not been accepted
  Ready,         // the PIN was accepted: the customer may withdraw
  OutOfService,  // idle, and the machine holds no notes
};

// The customer's bank. The tests provide a fake; the machine never stores balances itself.
class Bank {
 public:
  virtual ~Bank() = default;
  virtual bool knowsCard(const std::string& card) const = 0;
  virtual bool pinMatches(const std::string& card, const std::string& pin) const = 0;
  virtual long long available(const std::string& card) const = 0;
  virtual void debit(const std::string& card, long long amount) = 0;
};

class Atm {
 public:
  virtual ~Atm() = default;

  // Only in State::Idle or State::OutOfService; every other state answers WrongState. Checks in order:
  //   1. the machine holds no notes at all   -> OutOfService
  //   2. the card was retained earlier       -> CardBlocked
  //   3. the bank does not know the card     -> UnknownCard
  // Otherwise the card goes in and the state becomes AwaitingPin. A refused card leaves the state as it was.
  virtual Status insertCard(const std::string& card) = 0;

  // Only in AwaitingPin (else WrongState). A matching PIN moves to Ready and clears that card's wrong-PIN count. A wrong PIN
  // adds one to the count of wrong PINs in a row for THAT CARD; the count survives ejecting and re-inserting the card.
  // The first two wrong PINs answer WrongPin and keep the state; the third answers CardRetained, the machine keeps the
  // card (it is never accepted again by this machine) and the state goes back to Idle (or OutOfService).
  virtual Status enterPin(const std::string& pin) = 0;

  // Only in Ready (else WrongState). Checks in order, the first failure decides and `out` is left empty:
  //   1. amount below 1 or above kMaxWithdrawal   -> InvalidAmount
  //   2. amount above bank.available(card)        -> InsufficientFunds
  //   3. the notes cannot make the amount exactly -> CannotDispense
  // On Ok the bank is debited exactly `amount` once, the notes are removed from the machine and returned in `out`
  // (denomination -> count, no zero entries), and the state stays Ready. A refused withdrawal changes nothing.
  // Notes are chosen greedily: the largest denomination first, as many of it as the stock allows without going over the
  // amount, then the next denomination, and so on. If something is left over, the answer is CannotDispense.
  virtual Status withdraw(long long amount, Notes& out) = 0;

  // In AwaitingPin or Ready: the card is handed back and the state becomes Idle (or OutOfService when the machine holds
  // no notes). In Idle or OutOfService: WrongState.
  virtual Status ejectCard() = 0;

  virtual State state() const = 0;

  // The notes currently in the machine (no zero entries).
  virtual Notes stock() const = 0;
};

// `stock` lists the denominations the machine knows and how many notes of each it starts with. Counts of zero still
// declare a denomination. The bank must outlive the machine.
std::unique_ptr<Atm> makeAtm(Bank& bank, const Notes& stock);

}  // namespace atm
