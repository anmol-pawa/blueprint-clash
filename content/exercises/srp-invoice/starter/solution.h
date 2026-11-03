#pragma once
#include <string>
#include <vector>
#include "api.h"

// TODO: one class per reason to change. Invoice holds data and its total only.
class Invoice {
 public:
  void add(const LineItem& item) { items_.push_back(item); }
  long long totalCents() const { return 0; }
  const std::vector<LineItem>& items() const { return items_; }

 private:
  std::vector<LineItem> items_;
};

class InvoiceFormatter {
 public:
  std::string render(const Invoice&) const { return ""; }
};

class InvoiceArchiver {
 public:
  explicit InvoiceArchiver(InvoiceSink& sink) { (void)sink; }
  void archive(const Invoice&) {}
};
