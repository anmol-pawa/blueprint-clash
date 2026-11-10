#pragma once
#include <string>

// A request travelling through the chain. Amounts are in cents.
struct Expense {
  std::string employee;
  long long cents;
};
