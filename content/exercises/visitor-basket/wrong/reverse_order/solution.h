#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include <vector>

class Goods;
class Service;
class Voucher;

// One overload per concrete item. Adding a fourth item kind adds a pure virtual here, so every
// visitor refuses to compile until it handles the newcomer.
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
  void accept(ItemVisitor& visitor) const override { visitor.visit(*this); }

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
  void accept(ItemVisitor& visitor) const override { visitor.visit(*this); }

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
  void accept(ItemVisitor& visitor) const override { visitor.visit(*this); }

 private:
  std::string name_;
  long long cents_;
};

class Basket {
 public:
  void add(std::unique_ptr<Item> item) {
    if (item) {
      items_.push_back(std::move(item));
    }
  }

  std::size_t size() const { return items_.size(); }

  void accept(ItemVisitor& visitor) const {
    for (auto it = items_.rbegin(); it != items_.rend(); ++it) {
      (*it)->accept(visitor);
    }
  }

 private:
  std::vector<std::unique_ptr<Item>> items_;
};

// One operation over the family, written without touching any item class.
class TotalVisitor final : public ItemVisitor {
 public:
  long long totalCents() const { return total_; }

  void visit(const Goods& g) override { total_ += g.quantity() * g.unitCents(); }
  void visit(const Service& s) override { total_ += s.hours() * s.rateCents(); }
  void visit(const Voucher& v) override { total_ -= v.cents(); }

 private:
  long long total_ = 0;
};
