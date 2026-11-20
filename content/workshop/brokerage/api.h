#pragma once
// Public API for the Stock Brokerage problem. The hidden tests only use what is declared here.
// You implement broker::makeBrokerage() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>

namespace broker {

enum class Status {
  Ok,
  InvalidInput,        // an id, symbol, amount, quote or share count outside the documented range
  DuplicateAccount,    // the account id is already open
  UnknownAccount,      // no such account
  NoQuote,             // the symbol has never been quoted, so there is no price to trade at
  InsufficientFunds,   // the cash is not enough
  InsufficientShares,  // the account holds fewer shares than it wants to sell
};

constexpr int kMaxQuote = 1000000;               // cents per share, 1..kMaxQuote
constexpr int kMaxShares = 1000000;              // per order, 1..kMaxShares
constexpr long long kMaxCash = 1000000000000LL;  // cents per deposit or withdrawal, 1..kMaxCash

// A retail brokerage: accounts that hold cash and shares, traded at the market quote. All money is whole CENTS in
// `long long` (a single order can be 10^6 shares x 10^6 cents). Single-threaded and deterministic.
//
// ACCOUNTS. openAccount(id): id 1 or more (InvalidInput), then DuplicateAccount; a new account has no cash and no shares.
// deposit/withdraw(id, cents): InvalidInput (id < 1 or cents outside 1..kMaxCash), then UnknownAccount; withdraw also answers
// InsufficientFunds when the cash is less than the amount (exactly the amount is fine). A refused call changes nothing.
//
// QUOTES. setQuote(symbol, cents) records the market price of a symbol: InvalidInput when the symbol is empty or the price
// is outside 1..kMaxQuote. Quotes are only ever replaced, never removed.
//
// TRADES, always a market order at the CURRENT quote. buy(id, symbol, shares) checks InvalidInput (id < 1, empty symbol, shares
// outside 1..kMaxShares), UnknownAccount, NoQuote, InsufficientFunds, in that order. It takes shares x quote from the cash
// and adds a LOT (shares, what they cost). sell(id, symbol, shares) checks InvalidInput, UnknownAccount, then
// InsufficientShares (an account that never held the symbol has 0 shares), and pays shares x quote into the cash. A sale
// uses up lots FIRST-IN FIRST-OUT: the oldest lot is consumed first, and a lot that is only partly consumed keeps the rest of
// its shares and the matching part of its cost. realizedPnl is the running total of (proceeds - cost of the shares sold).
// A refused call changes nothing.
//
// QUERIES (never change anything; the out-parameter is touched only on Ok). statement(id) answers InvalidInput (id < 1) then
// UnknownAccount; holding(id, symbol) answers InvalidInput (id < 1 or an empty symbol) then UnknownAccount.
// One account at a glance. portfolioValue = cash + every held symbol's shares x its CURRENT quote. positionCount = how many
// symbols the account holds shares of (a symbol sold down to zero is not counted).
struct Statement {
  long long cash = 0;
  long long realizedPnl = 0;
  long long portfolioValue = 0;
  int positionCount = 0;
};

// What an account holds of one symbol: the shares (0 when none) and the cost of exactly those shares still held (0 when none).
struct Holding {
  long long shares = 0;
  long long costBasis = 0;
};

class Brokerage {
 public:
  virtual ~Brokerage() = default;

  virtual Status openAccount(int id) = 0;
  virtual Status deposit(int id, long long cents) = 0;
  virtual Status withdraw(int id, long long cents) = 0;
  virtual Status setQuote(const std::string& symbol, int cents) = 0;
  virtual Status buy(int id, const std::string& symbol, int shares) = 0;
  virtual Status sell(int id, const std::string& symbol, int shares) = 0;

  virtual Status statement(int id, Statement& out) const = 0;
  virtual Status holding(int id, const std::string& symbol, Holding& out) const = 0;
};

std::unique_ptr<Brokerage> makeBrokerage();

}  // namespace broker
