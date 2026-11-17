#include "atm_impl.h"
#include "fewest_notes_dispenser.h"

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
  return build(bank, stock, std::make_unique<FewestNotesDispenser>(), std::make_unique<NoLimit>());
}

std::unique_ptr<atm::LimitedAtm> atm::makeLimitedAtm(Bank& bank, const Notes& stock, long long dailyLimit) {
  return build(bank, stock, std::make_unique<ChainDispenser>(), std::make_unique<DailyLimit>(dailyLimit));
}
