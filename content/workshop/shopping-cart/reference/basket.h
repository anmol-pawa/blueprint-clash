#pragma once
#include <map>
#include <string>

#include "api_storm2.h"

// A cart's contents: sku -> units. Plain data; the rules about it live in CartBook.
using Lines = std::map<std::string, int>;

// A cart priced line by line, before any coupon. Plain data; Pricer builds it.
struct Basket {
  std::map<std::string, cart::Money> lineTotals;
  cart::Money subtotal = 0;
};
