#include "ledger_impl.h"

std::unique_ptr<split::Ledger> split::makeLedger() { return std::make_unique<LedgerImpl>(); }
std::unique_ptr<split::SplittingLedger> split::makeSplittingLedger() { return std::make_unique<LedgerImpl>(); }
std::unique_ptr<split::SimplifyingLedger> split::makeSimplifyingLedger() { return std::make_unique<LedgerImpl>(); }
