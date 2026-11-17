#include "api_storm2.h"

#include <algorithm>
#include <cstddef>
#include <map>
#include <memory>
#include <set>
#include <string>
#include <utility>
#include <vector>

// The notes inside the machine. It knows nothing about customers, PINs or what a good payout is.
class CashBox {
 public:
  explicit CashBox(const atm::Notes& initial) {
    for (const auto& entry : initial) {
      if (entry.first > 0 && entry.second >= 0) notes_[entry.first] = entry.second;
    }
  }

  // Every declared denomination, zero counts included, so a dispenser can plan with them.
  const atm::Notes& declared() const { return notes_; }

  // Only denominations that still have notes, as the API reports them.
  atm::Notes inStock() const {
    atm::Notes present;
    for (const auto& entry : notes_) {
      if (entry.second > 0) present[entry.first] = entry.second;
    }
    return present;
  }

  bool empty() const {
    for (const auto& entry : notes_) {
      if (entry.second > 0) return false;
    }
    return true;
  }

  void remove(const atm::Notes& taken) {
    for (const auto& entry : taken) notes_[entry.first] -= entry.second;
  }

 private:
  atm::Notes notes_;
};

// Decides which notes pay an amount. `stock` lists every declared denomination with its count. Returns false when no
// payment is possible. On true, `out` holds the chosen notes (no zero entries) and they all exist in the stock.
class NoteDispenser {
 public:
  virtual ~NoteDispenser() = default;
  virtual bool plan(long long amount, const atm::Notes& stock, atm::Notes& out) const = 0;
};

// One link of the chain: it pays as much of the amount as it can with ITS denomination and hands the rest on.
class NoteHandler {
 public:
  NoteHandler(int denomination, std::unique_ptr<NoteHandler> next) : denomination_(denomination), next_(std::move(next)) {}

  bool handle(long long remaining, const atm::Notes& stock, atm::Notes& out) const {
    const auto found = stock.find(denomination_);
    const long long held = found == stock.end() ? 0 : found->second;
    const long long taken = std::min<long long>(held, remaining / denomination_);
    if (taken > 0) out[denomination_] = static_cast<int>(taken);
    remaining -= taken * denomination_;
    if (remaining == 0) return true;
    return next_ != nullptr && next_->handle(remaining, stock, out);
  }

 private:
  int denomination_;
  std::unique_ptr<NoteHandler> next_;
};

// The greedy rule as a chain of responsibility: the largest denomination goes first.
class ChainDispenser : public NoteDispenser {
 public:
  bool plan(long long amount, const atm::Notes& stock, atm::Notes& out) const override {
    std::unique_ptr<NoteHandler> head;
    for (const auto& entry : stock) head = std::make_unique<NoteHandler>(entry.first, std::move(head));
    out.clear();
    if (head == nullptr || !head->handle(amount, stock, out)) {
      out.clear();
      return false;
    }
    return true;
  }
};

// Change Storm 1: any exact combination will do, so search for one. The fewest notes win; among equals, more of the
// larger denominations win. A chain cannot do this, because a link never sees what the later links can pay.
class FewestNotesDispenser : public NoteDispenser {
 public:
  bool plan(long long amount, const atm::Notes& stock, atm::Notes& out) const override {
    std::vector<int> value;
    std::vector<long long> count;
    for (auto entry = stock.rbegin(); entry != stock.rend(); ++entry) {
      value.push_back(entry->first);
      count.push_back(entry->second);
    }
    const std::size_t kinds = value.size();
    const std::size_t target = static_cast<std::size_t>(amount);
    // fewest[i][r]: the fewest notes of denominations i.. that pay r exactly, or kImpossible.
    std::vector<std::vector<int>> fewest(kinds + 1, std::vector<int>(target + 1, kImpossible));
    fewest[kinds][0] = 0;
    for (std::size_t i = kinds; i-- > 0;) {
      for (std::size_t r = 0; r <= target; ++r) {
        const long long most = std::min<long long>(count[i], static_cast<long long>(r) / value[i]);
        for (long long take = 0; take <= most; ++take) {
          const int rest = fewest[i + 1][r - static_cast<std::size_t>(take * value[i])];
          if (rest != kImpossible) fewest[i][r] = std::min(fewest[i][r], rest + static_cast<int>(take));
        }
      }
    }
    out.clear();
    if (fewest[0][target] == kImpossible) return false;
    std::size_t remaining = target;
    for (std::size_t i = 0; i < kinds; ++i) {
      for (long long take = std::min<long long>(count[i], static_cast<long long>(remaining) / value[i]); take >= 0; --take) {
        const int rest = fewest[i + 1][remaining - static_cast<std::size_t>(take * value[i])];
        if (rest != kImpossible && rest + take == fewest[i][remaining]) {
          if (take > 0) out[value[i]] = static_cast<int>(take);
          remaining -= static_cast<std::size_t>(take * value[i]);
          break;
        }
      }
    }
    return true;
  }

 private:
  static constexpr int kImpossible = 1 << 30;
};

// Owns the PIN rules: wrong attempts are counted per card across visits, and a card that fails three times in a row is
// kept for good.
class PinGuard {
 public:
  enum class Verdict { Accepted, Rejected, Retained };

  bool isRetained(const std::string& card) const { return retained_.count(card) > 0; }

  Verdict check(const atm::Bank& bank, const std::string& card, const std::string& pin) {
    if (bank.pinMatches(card, pin)) {
      wrongInARow_.erase(card);
      return Verdict::Accepted;
    }
    if (++wrongInARow_[card] < kAttempts) return Verdict::Rejected;
    wrongInARow_.erase(card);
    retained_.insert(card);
    return Verdict::Retained;
  }

 private:
  static constexpr int kAttempts = 3;
  std::map<std::string, int> wrongInARow_;
  std::set<std::string> retained_;
};

// A rule about how much one card may take out. The payout asks `allows` before it moves anything and calls `record` only
// after a withdrawal succeeded.
class WithdrawalLimit {
 public:
  virtual ~WithdrawalLimit() = default;
  virtual bool allows(const std::string& card, long long amount) const = 0;
  virtual void record(const std::string& card, long long amount) = 0;
  virtual void newDay() = 0;
};

class NoLimit : public WithdrawalLimit {
 public:
  bool allows(const std::string&, long long) const override { return true; }
  void record(const std::string&, long long) override {}
  void newDay() override {}
};

// Change Storm 2: a total per card per day.
class DailyLimit : public WithdrawalLimit {
 public:
  explicit DailyLimit(long long limit) : limit_(limit) {}

  bool allows(const std::string& card, long long amount) const override {
    const auto found = today_.find(card);
    const long long used = found == today_.end() ? 0 : found->second;
    return used + amount <= limit_;
  }

  void record(const std::string& card, long long amount) override { today_[card] += amount; }

  void newDay() override { today_.clear(); }

 private:
  long long limit_;
  std::map<std::string, long long> today_;
};

// One withdrawal, all or nothing: every check runs before anything moves, and the bank is debited exactly once.
class Payout {
 public:
  Payout(atm::Bank& bank, CashBox& cash, std::unique_ptr<NoteDispenser> dispenser, std::unique_ptr<WithdrawalLimit> limit)
      : bank_(bank), cash_(cash), dispenser_(std::move(dispenser)), limit_(std::move(limit)) {}

  atm::Status pay(const std::string& card, long long amount, atm::Notes& out) {
    out.clear();
    if (amount < 1 || amount > atm::kMaxWithdrawal) return atm::Status::InvalidAmount;
    if (!limit_->allows(card, amount)) return atm::Status::DailyLimitExceeded;
    if (amount > bank_.available(card)) return atm::Status::InsufficientFunds;
    atm::Notes chosen;
    if (!dispenser_->plan(amount, cash_.declared(), chosen)) return atm::Status::CannotDispense;
    bank_.debit(card, amount);
    cash_.remove(chosen);
    limit_->record(card, amount);
    out = chosen;
    return atm::Status::Ok;
  }

  void newDay() { limit_->newDay(); }

 private:
  atm::Bank& bank_;
  CashBox& cash_;
  std::unique_ptr<NoteDispenser> dispenser_;
  std::unique_ptr<WithdrawalLimit> limit_;
};

// The parts a session uses: the card slot, the cash, the PIN rules and the payout. The states decide WHEN each part may
// be used; the machine only does the work.
class Machine {
 public:
  Machine(atm::Bank& bank, const atm::Notes& stock, std::unique_ptr<NoteDispenser> dispenser, std::unique_ptr<WithdrawalLimit> limit)
      : bank_(bank), cash_(stock), payout_(bank, cash_, std::move(dispenser), std::move(limit)) {}

  bool hasNotes() const { return !cash_.empty(); }

  atm::Notes stock() const { return cash_.inStock(); }

  // Takes the card into the slot when the machine is willing to; otherwise says why.
  atm::Status admit(const std::string& card) {
    if (pins_.isRetained(card)) return atm::Status::CardBlocked;
    if (!bank_.knowsCard(card)) return atm::Status::UnknownCard;
    card_ = card;
    return atm::Status::Ok;
  }

  PinGuard::Verdict verifyPin(const std::string& pin) { return pins_.check(bank_, card_, pin); }

  atm::Status pay(long long amount, atm::Notes& out) { return payout_.pay(card_, amount, out); }

  void release() { card_.clear(); }

  void newDay() { payout_.newDay(); }

 private:
  atm::Bank& bank_;
  CashBox cash_;
  PinGuard pins_;
  Payout payout_;
  std::string card_;
};

class AtmState;

// What a state decided: the answer for the caller and the state to move to (nullptr: stay where we are).
struct Step {
  atm::Status status;
  const AtmState* next;
};

// The State pattern: one object per state, no data of its own, so the objects can be shared. A state answers every
// operation; the ones it does not allow answer WrongState.
class AtmState {
 public:
  virtual ~AtmState() = default;
  virtual atm::State id() const = 0;
  virtual Step insertCard(Machine&, const std::string&) const { return Step{atm::Status::WrongState, nullptr}; }
  virtual Step enterPin(Machine&, const std::string&) const { return Step{atm::Status::WrongState, nullptr}; }
  virtual Step withdraw(Machine&, long long, atm::Notes&) const { return Step{atm::Status::WrongState, nullptr}; }
  virtual Step eject(Machine&) const { return Step{atm::Status::WrongState, nullptr}; }

  static const AtmState& idle();
  static const AtmState& awaitingPin();
  static const AtmState& ready();
  static const AtmState& outOfService();
};

namespace states {

class Idle : public AtmState {
 public:
  atm::State id() const override { return atm::State::Idle; }
  Step insertCard(Machine& machine, const std::string& card) const override {
    const atm::Status admitted = machine.admit(card);
    return Step{admitted, admitted == atm::Status::Ok ? &AtmState::awaitingPin() : nullptr};
  }
};

class AwaitingPin : public AtmState {
 public:
  atm::State id() const override { return atm::State::AwaitingPin; }
  Step enterPin(Machine& machine, const std::string& pin) const override {
    switch (machine.verifyPin(pin)) {
      case PinGuard::Verdict::Accepted:
        return Step{atm::Status::Ok, &AtmState::ready()};
      case PinGuard::Verdict::Rejected:
        return Step{atm::Status::WrongPin, nullptr};
      case PinGuard::Verdict::Retained:
        machine.release();
        return Step{atm::Status::CardRetained, &AtmState::idle()};
    }
    return Step{atm::Status::WrongState, nullptr};
  }
  Step eject(Machine& machine) const override {
    machine.release();
    return Step{atm::Status::Ok, &AtmState::idle()};
  }
};

class Ready : public AtmState {
 public:
  atm::State id() const override { return atm::State::Ready; }
  Step withdraw(Machine& machine, long long amount, atm::Notes& out) const override {
    return Step{machine.pay(amount, out), nullptr};
  }
  Step eject(Machine& machine) const override {
    machine.release();
    return Step{atm::Status::Ok, &AtmState::idle()};
  }
};

class OutOfService : public AtmState {
 public:
  atm::State id() const override { return atm::State::OutOfService; }
  Step insertCard(Machine&, const std::string&) const override { return Step{atm::Status::OutOfService, nullptr}; }
};

}  // namespace states

inline const AtmState& AtmState::idle() {
  static const states::Idle instance;
  return instance;
}
inline const AtmState& AtmState::awaitingPin() {
  static const states::AwaitingPin instance;
  return instance;
}
inline const AtmState& AtmState::ready() {
  static const states::Ready instance;
  return instance;
}
inline const AtmState& AtmState::outOfService() {
  static const states::OutOfService instance;
  return instance;
}

// The public face: forwards each operation to the current state and follows the state's decision about what comes next.
// It has no rule of its own about cards, PINs, notes or limits.
class AtmImpl : public atm::LimitedAtm {
 public:
  explicit AtmImpl(std::unique_ptr<Machine> machine) : machine_(std::move(machine)), state_(&resting()) {}

  atm::Status insertCard(const std::string& card) override { return apply(state_->insertCard(*machine_, card)); }
  atm::Status enterPin(const std::string& pin) override { return apply(state_->enterPin(*machine_, pin)); }
  atm::Status withdraw(long long amount, atm::Notes& out) override {
    out.clear();
    return apply(state_->withdraw(*machine_, amount, out));
  }
  atm::Status ejectCard() override { return apply(state_->eject(*machine_)); }
  atm::State state() const override { return state_->id(); }
  atm::Notes stock() const override { return machine_->stock(); }
  void endOfDay() override { machine_->newDay(); }

 private:
  // Waiting for a customer: Idle, unless there is nothing to give.
  const AtmState& resting() const { return machine_->hasNotes() ? AtmState::idle() : AtmState::outOfService(); }

  atm::Status apply(const Step& step) {
    if (step.next != nullptr) state_ = step.next == &AtmState::idle() ? &resting() : step.next;
    return step.status;
  }

  std::unique_ptr<Machine> machine_;
  const AtmState* state_;
};

namespace {
std::unique_ptr<AtmImpl> build(atm::Bank& bank, const atm::Notes& stock, std::unique_ptr<NoteDispenser> dispenser,
                               std::unique_ptr<WithdrawalLimit> limit) {
  return std::make_unique<AtmImpl>(std::make_unique<Machine>(bank, stock, std::move(dispenser), std::move(limit)));
}
}  // namespace

std::unique_ptr<atm::Atm> atm::makeAtm(Bank& bank, const Notes& stock) {
  return build(bank, stock, std::make_unique<ChainDispenser>(), std::make_unique<NoLimit>());
}

std::unique_ptr<atm::Atm> atm::makeFlexibleAtm(Bank& bank, const Notes& stock) {
  return build(bank, stock, std::make_unique<ChainDispenser>(), std::make_unique<NoLimit>());
}

std::unique_ptr<atm::LimitedAtm> atm::makeLimitedAtm(Bank& bank, const Notes& stock, long long dailyLimit) {
  return build(bank, stock, std::make_unique<ChainDispenser>(), std::make_unique<DailyLimit>(dailyLimit));
}
