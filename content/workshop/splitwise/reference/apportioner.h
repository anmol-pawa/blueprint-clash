#pragma once
#include <algorithm>
#include <cstddef>
#include <numeric>
#include <vector>

// Divides whole cents in proportion to weights without losing or inventing a cent.
class Apportioner {
 public:
  // `weights` are all >= 0 and add up to more than 0. Every part is rounded down first; the cents that are left go one each
  // to the largest rounded-away fractions, and a tie goes to the earlier position.
  std::vector<long long> divide(long long total, const std::vector<long long>& weights) const {
    const long long weightSum = std::accumulate(weights.begin(), weights.end(), 0LL);
    std::vector<long long> parts(weights.size());
    std::vector<long long> lost(weights.size());
    long long given = 0;
    for (std::size_t i = 0; i < weights.size(); ++i) {
      parts[i] = total * weights[i] / weightSum;
      lost[i] = total * weights[i] % weightSum;
      given += parts[i];
    }
    std::vector<std::size_t> order(weights.size());
    std::iota(order.begin(), order.end(), std::size_t{0});
    std::stable_sort(order.begin(), order.end(), [&lost](std::size_t a, std::size_t b) { return lost[a] > lost[b]; });
    for (long long k = 0; k < total - given; ++k) ++parts[order[static_cast<std::size_t>(k)]];
    return parts;
  }
};
