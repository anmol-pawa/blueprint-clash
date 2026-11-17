#pragma once
#include <algorithm>
#include <cstddef>
#include <vector>

#include "note_dispenser.h"

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
