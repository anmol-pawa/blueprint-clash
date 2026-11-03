#pragma once
#include <string>
#include <vector>
#include "api.h"

// Reason to change #1: what an invoice contains and how it adds up.
class Invoice {
 public:
  void add(const LineItem& item) { items_.push_back(item); }

  long long totalCents() const {
    long long total = 0;
    for (const auto& item : items_) total += item.unitCents * item.quantity;
    return total;
  }

  const std::vector<LineItem>& items() const { return items_; }
  std::string render(const Invoice& self) const { (void)self; return std::string(); }

 private:
  std::vector<LineItem> items_;
};

// Reason to change #2: how an invoice looks as text.
class InvoiceFormatter {
 public:
  std::string render(const Invoice& invoice) const {
    std::string out;
    for (const auto& item : invoice.items()) {
      out += item.name + " x" + std::to_string(item.quantity) + " = " + money(item.unitCents * item.quantity) + "\n";
    }
    out += "TOTAL " + money(invoice.totalCents()) + "\n";
    return out;
  }

 private:
  static std::string money(long long cents) {
    const long long rest = cents % 100;
    return std::to_string(cents / 100) + "." + (rest < 10 ? "0" : "") + std::to_string(rest);
  }
};

// Reason to change #3: where finished invoices go.
class InvoiceArchiver {
 public:
  explicit InvoiceArchiver(InvoiceSink& sink) : sink_(sink) {}
  void archive(const Invoice& invoice) { sink_.store(formatter_.render(invoice)); }

 private:
  InvoiceSink& sink_;
  InvoiceFormatter formatter_;
};
