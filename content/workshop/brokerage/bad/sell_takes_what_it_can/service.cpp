#include <deque>
#include <map>
#include <string>
#include <unordered_map>

#include "api_storm2.h"

// One purchase still (partly) held: how many shares remain and what those shares cost, commission included.
class Lot {
 public:
  Lot(long long shares, long long cost) : shares_(shares), cost_(cost) {}

  long long shares() const { return shares_; }
  long long cost() const { return cost_; }

  // Gives up `count` shares (at most shares()) and returns the cost that went with them. A part of a lot takes its share of
  // the cost rounded down; the last shares take whatever is left, so the cents always add up.
  long long take(long long count) {
    const long long given = count == shares_ ? cost_ : cost_ * count / shares_;
    shares_ -= count;
    cost_ -= given;
    return given;
  }

  void multiplyShares(int factor) { shares_ *= factor; }

 private:
  long long shares_;
  long long cost_;
};

// Everything one account holds of one symbol, as lots in the order they were bought.
class Position {
 public:
  void add(const Lot& lot) { lots_.push_back(lot); }

  long long shares() const {
    long long total = 0;
    for (const Lot& lot : lots_) total += lot.shares();
    return total;
  }

  long long cost() const {
    long long total = 0;
    for (const Lot& lot : lots_) total += lot.cost();
    return total;
  }

  // First in, first out. The caller has checked that `count` shares are held. Returns the cost of the shares sold.
  long long sellFifo(long long count) {
    long long cost = 0;
    while (count > 0) {
      Lot& oldest = lots_.front();
      const long long used = oldest.shares() < count ? oldest.shares() : count;
      cost += oldest.take(used);
      count -= used;
      if (oldest.shares() == 0) lots_.pop_front();
    }
    return cost;
  }

  void split(int factor) {
    for (Lot& lot : lots_) lot.multiplyShares(factor);
  }

  bool empty() const { return lots_.empty(); }

 private:
  std::deque<Lot> lots_;
};

// The latest price of every symbol that was ever quoted.
class QuoteBoard {
 public:
  void set(const std::string& symbol, int cents) { quotes_[symbol] = cents; }

  bool find(const std::string& symbol, int& cents) const {
    const auto it = quotes_.find(symbol);
    if (it == quotes_.end()) return false;
    cents = it->second;
    return true;
  }

 private:
  std::unordered_map<std::string, int> quotes_;
};

// What a trade costs in commission. The all-zero schedule charges nothing.
class Commission {
 public:
  explicit Commission(const broker::FeeSchedule& schedule) : schedule_(schedule) {}

  long long on(long long value) const {
    const long long percent = (value * schedule_.basisPoints + kBasisPointsPerWhole - 1) / kBasisPointsPerWhole;
    const long long fee = schedule_.flat + percent;
    return fee < schedule_.minimum ? schedule_.minimum : fee;
  }

 private:
  static constexpr long long kBasisPointsPerWhole = 10000;
  broker::FeeSchedule schedule_;
};

// The legal ranges, in one place.
struct Rules {
  static bool accountId(int id) { return id >= 1; }
  static bool symbol(const std::string& s) { return !s.empty(); }
  static bool cash(long long cents) { return cents >= 1 && cents <= broker::kMaxCash; }
  static bool quote(int cents) { return cents >= 1 && cents <= broker::kMaxQuote; }
  static bool shares(int count) { return count >= 1 && count <= broker::kMaxShares; }
  static bool splitFactor(int factor) { return factor >= kMinSplit && factor <= kMaxSplit; }

  static constexpr int kMinSplit = 2;
  static constexpr int kMaxSplit = 100;
};

// The cash an account holds. It never goes below zero because every debit is checked by the caller first.
class Purse {
 public:
  long long balance() const { return balance_; }
  void credit(long long cents) { balance_ += cents; }
  void debit(long long cents) { balance_ -= cents; }

 private:
  long long balance_ = 0;
};

// The running totals that are reported but never spent from.
class Totals {
 public:
  long long realized() const { return realized_; }
  long long fees() const { return fees_; }
  long long dividends() const { return dividends_; }
  void addRealized(long long cents) { realized_ += cents; }
  void addFee(long long cents) { fees_ += cents; }
  void addDividend(long long cents) { dividends_ += cents; }

 private:
  long long realized_ = 0;
  long long fees_ = 0;
  long long dividends_ = 0;
};

// The positions of one account, one per symbol that still has shares.
class Holdings {
 public:
  Position& open(const std::string& symbol) { return positions_[symbol]; }

  Position* find(const std::string& symbol) {
    const auto it = positions_.find(symbol);
    return it == positions_.end() ? nullptr : &it->second;
  }

  const Position* find(const std::string& symbol) const {
    const auto it = positions_.find(symbol);
    return it == positions_.end() ? nullptr : &it->second;
  }

  void closeIfEmpty(const std::string& symbol) {
    const auto it = positions_.find(symbol);
    if (it != positions_.end() && it->second.empty()) positions_.erase(it);
  }

  const std::map<std::string, Position>& all() const { return positions_; }

 private:
  std::map<std::string, Position> positions_;
};

class Account {
 public:
  Purse& purse() { return purse_; }
  const Purse& purse() const { return purse_; }
  Holdings& holdings() { return holdings_; }
  const Holdings& holdings() const { return holdings_; }
  Totals& totals() { return totals_; }
  const Totals& totals() const { return totals_; }

 private:
  Purse purse_;
  Holdings holdings_;
  Totals totals_;
};

class Accounts {
 public:
  bool open(int id) { return accounts_.emplace(id, Account()).second; }

  Account* find(int id) {
    const auto it = accounts_.find(id);
    return it == accounts_.end() ? nullptr : &it->second;
  }

  const Account* find(int id) const {
    const auto it = accounts_.find(id);
    return it == accounts_.end() ? nullptr : &it->second;
  }

  // The shared check order of every account call: a bad id first, then an id nobody opened.
  broker::Status lookup(int id, const Account*& account) const {
    if (id < 1) return broker::Status::InvalidInput;
    account = find(id);
    return account == nullptr ? broker::Status::UnknownAccount : broker::Status::Ok;
  }

  template <typename Fn>
  void forEach(Fn fn) {
    for (auto& entry : accounts_) fn(entry.second);
  }

 private:
  std::map<int, Account> accounts_;
};

// Market orders at the current quote: the one place that moves cash, lots and totals together.
class TradeDesk {
 public:
  TradeDesk(const QuoteBoard& quotes, const Commission& commission) : quotes_(quotes), commission_(commission) {}

  broker::Status buy(Account& account, const std::string& symbol, long long shares) const {
    int quote = 0;
    if (!quotes_.find(symbol, quote)) return broker::Status::NoQuote;
    const long long value = shares * quote;
    const long long fee = commission_.on(value);
    if (account.purse().balance() < value + fee) return broker::Status::InsufficientFunds;
    account.purse().debit(value + fee);
    account.totals().addFee(fee);
    account.holdings().open(symbol).add(Lot(shares, value + fee));
    return broker::Status::Ok;
  }

  broker::Status sell(Account& account, const std::string& symbol, long long shares) const {
    Position* position = account.holdings().find(symbol);
    int quote = 0;
    if (position != nullptr && position->shares() < shares) shares = position->shares();
    if (position == nullptr || !quotes_.find(symbol, quote)) {
      return broker::Status::InsufficientShares;
    }
    const long long value = shares * quote;
    const long long fee = commission_.on(value);
    if (fee > value) return broker::Status::InsufficientFunds;
    const long long cost = position->sellFifo(shares);
    account.holdings().closeIfEmpty(symbol);
    account.purse().credit(value - fee);
    account.totals().addFee(fee);
    account.totals().addRealized(value - fee - cost);
    return broker::Status::Ok;
  }

 private:
  const QuoteBoard& quotes_;
  const Commission& commission_;
};

// What an account is worth at today's quotes.
struct Valuation {
  static long long of(const Account& account, const QuoteBoard& quotes) {
    long long total = account.purse().balance();
    for (const auto& entry : account.holdings().all()) {
      int quote = 0;
      if (quotes.find(entry.first, quote)) total += entry.second.shares() * quote;
    }
    return total;
  }
};

// Splits and dividends touch every holder of a symbol and nothing else in the design.
class CorporateActions {
 public:
  explicit CorporateActions(Accounts& accounts) : accounts_(accounts) {}

  void split(const std::string& symbol, int factor) {
    accounts_.forEach([&](Account& account) {
      Position* position = account.holdings().find(symbol);
      if (position != nullptr) position->split(factor);
    });
  }

  void dividend(const std::string& symbol, int centsPerShare) {
    accounts_.forEach([&](Account& account) {
      const Position* position = account.holdings().find(symbol);
      if (position == nullptr) return;
      const long long paid = position->shares() * centsPerShare;
      account.purse().credit(paid);
      account.totals().addDividend(paid);
    });
  }

 private:
  Accounts& accounts_;
};

// The facade the interface sees: validate, look the account up, hand the work to the collaborator that owns it.
class BrokerageImpl : public broker::CorporateBrokerage {
 public:
  explicit BrokerageImpl(const broker::FeeSchedule& schedule)
      : commission_(schedule), desk_(quotes_, commission_), actions_(accounts_) {}

  broker::Status openAccount(int id) override {
    if (!Rules::accountId(id)) return broker::Status::InvalidInput;
    return accounts_.open(id) ? broker::Status::Ok : broker::Status::DuplicateAccount;
  }

  broker::Status deposit(int id, long long cents) override {
    if (!Rules::accountId(id) || !Rules::cash(cents)) return broker::Status::InvalidInput;
    Account* account = accounts_.find(id);
    if (account == nullptr) return broker::Status::UnknownAccount;
    account->purse().credit(cents);
    return broker::Status::Ok;
  }

  broker::Status withdraw(int id, long long cents) override {
    if (!Rules::accountId(id) || !Rules::cash(cents)) return broker::Status::InvalidInput;
    Account* account = accounts_.find(id);
    if (account == nullptr) return broker::Status::UnknownAccount;
    if (account->purse().balance() < cents) return broker::Status::InsufficientFunds;
    account->purse().debit(cents);
    return broker::Status::Ok;
  }

  broker::Status setQuote(const std::string& symbol, int cents) override {
    if (!Rules::symbol(symbol) || !Rules::quote(cents)) return broker::Status::InvalidInput;
    quotes_.set(symbol, cents);
    return broker::Status::Ok;
  }

  broker::Status buy(int id, const std::string& symbol, int shares) override {
    if (!Rules::accountId(id) || !Rules::symbol(symbol) || !Rules::shares(shares)) return broker::Status::InvalidInput;
    Account* account = accounts_.find(id);
    return account == nullptr ? broker::Status::UnknownAccount : desk_.buy(*account, symbol, shares);
  }

  broker::Status sell(int id, const std::string& symbol, int shares) override {
    if (!Rules::accountId(id) || !Rules::symbol(symbol) || !Rules::shares(shares)) return broker::Status::InvalidInput;
    Account* account = accounts_.find(id);
    return account == nullptr ? broker::Status::UnknownAccount : desk_.sell(*account, symbol, shares);
  }

  broker::Status statement(int id, broker::Statement& out) const override {
    const Account* account = nullptr;
    const broker::Status status = accounts_.lookup(id, account);
    if (status != broker::Status::Ok) return status;
    out.cash = account->purse().balance();
    out.realizedPnl = account->totals().realized();
    out.portfolioValue = Valuation::of(*account, quotes_);
    out.positionCount = static_cast<int>(account->holdings().all().size());
    return broker::Status::Ok;
  }

  broker::Status holding(int id, const std::string& symbol, broker::Holding& out) const override {
    const Account* account = nullptr;
    if (!Rules::symbol(symbol)) return broker::Status::InvalidInput;
    const broker::Status status = accounts_.lookup(id, account);
    if (status != broker::Status::Ok) return status;
    const Position* position = account->holdings().find(symbol);
    out.shares = position == nullptr ? 0 : position->shares();
    out.costBasis = position == nullptr ? 0 : position->cost();
    return broker::Status::Ok;
  }

  broker::Status feesPaid(int id, long long& out) const override {
    const Account* account = nullptr;
    const broker::Status status = accounts_.lookup(id, account);
    if (status == broker::Status::Ok) out = account->totals().fees();
    return status;
  }

  broker::Status split(const std::string& symbol, int factor, int newQuote) override {
    int old = 0;
    if (!Rules::symbol(symbol) || !Rules::splitFactor(factor) || !Rules::quote(newQuote)) return broker::Status::InvalidInput;
    if (!quotes_.find(symbol, old)) return broker::Status::NoQuote;
    actions_.split(symbol, factor);
    quotes_.set(symbol, newQuote);
    return broker::Status::Ok;
  }

  broker::Status dividend(const std::string& symbol, int centsPerShare) override {
    int old = 0;
    if (!Rules::symbol(symbol) || !Rules::quote(centsPerShare)) return broker::Status::InvalidInput;
    if (!quotes_.find(symbol, old)) return broker::Status::NoQuote;
    actions_.dividend(symbol, centsPerShare);
    return broker::Status::Ok;
  }

  broker::Status dividendsReceived(int id, long long& out) const override {
    const Account* account = nullptr;
    const broker::Status status = accounts_.lookup(id, account);
    if (status == broker::Status::Ok) out = account->totals().dividends();
    return status;
  }

 private:
  Accounts accounts_;
  QuoteBoard quotes_;
  Commission commission_;
  TradeDesk desk_;
  CorporateActions actions_;
};

std::unique_ptr<broker::Brokerage> broker::makeBrokerage() { return std::make_unique<BrokerageImpl>(FeeSchedule()); }
std::unique_ptr<broker::FeeBrokerage> broker::makeFeeBrokerage(const FeeSchedule& schedule) {
  return std::make_unique<BrokerageImpl>(schedule);
}
std::unique_ptr<broker::CorporateBrokerage> broker::makeCorporateBrokerage(const FeeSchedule& schedule) {
  return std::make_unique<BrokerageImpl>(schedule);
}
