#include "sheet_impl.h"

std::unique_ptr<sheet::Sheet> sheet::makeSheet() { return std::make_unique<SheetImpl>(false); }

std::unique_ptr<sheet::Sheet> sheet::makeFunctionSheet() { return std::make_unique<SheetImpl>(true); }

std::unique_ptr<sheet::WatchedSheet> sheet::makeWatchedSheet() { return std::make_unique<SheetImpl>(true); }
