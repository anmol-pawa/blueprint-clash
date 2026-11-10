#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include <vector>

class Goods;
class Service;
class Voucher;

// TODO: ItemVisitor has one pure virtual visit() per concrete item. Each concrete accept() calls
// visitor.visit(*this). Basket visits in insertion order and ignores null items.
// TotalVisitor: goods quantity*unit + services hours*rate - vouchers.
class ItemVisitor {
 public:
  virtual ~ItemVisitor() = default;
  virtual void visit(const Goods&) = 0;
  virtual void visit(const Service&) = 0;
  virtual void visit(const Voucher&) = 0;
};

class Item {
 public:
  virtual ~Item() = default;
  virtual void accept(ItemVisitor& visitor) const = 0;
};

class Goods final : public Item {
 public:
  Goods(std::string name, int quantity, long long unitCents)
      : name_(std::move(name)), quantity_(quantity), unitCents_(unitCents) {}
  const std::string& name() const { return name_; }
  int quantity() const { return quantity_; }
  long long unitCents() const { return unitCents_; }
  void accept(ItemVisitor&) const override {}

 private:
  std::string name_;
  int quantity_;
  long long unitCents_;
};

class Service final : public Item {
 public:
  Service(std::string name, int hours, long long rateCents)
      : name_(std::move(name)), hours_(hours), rateCents_(rateCents) {}
  const std::string& name() const { return name_; }
  int hours() const { return hours_; }
  long long rateCents() const { return rateCents_; }
  void accept(ItemVisitor&) const override {}

 private:
  std::string name_;
  int hours_;
  long long rateCents_;
};

class Voucher final : public Item {
 public:
  Voucher(std::string name, long long cents) : name_(std::move(name)), cents_(cents) {}
  const std::string& name() const { return name_; }
  long long cents() const { return cents_; }
  void accept(ItemVisitor&) const override {}

 private:
  std::string name_;
  long long cents_;
};

class Basket {
 public:
  void add(std::unique_ptr<Item>) {}
  std::size_t size() const { return 0; }
  void accept(ItemVisitor&) const {}
};

class TotalVisitor final : public ItemVisitor {
 public:
  long long totalCents() const { return 0; }
  void visit(const Goods&) override {}
  void visit(const Service&) override {}
  void visit(const Voucher&) override {}
};
