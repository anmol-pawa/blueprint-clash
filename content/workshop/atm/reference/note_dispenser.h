#pragma once
#include <algorithm>
#include <memory>
#include <vector>

#include "api_storm2.h"

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
