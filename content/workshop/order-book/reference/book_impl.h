#pragma once
#include <vector>

#include "time_in_force.h"

// The facade the interface sees: validate, record the id, let the matcher trade, rest what is left. It owns no rule itself.
class BookImpl : public book::AmendBook {
 public:
  BookImpl() : matcher_(sides_, index_) {}

  book::Status submit(int id, book::Side side, int price, int quantity, std::vector<book::Fill>& fills) override {
    return submitWith(id, side, price, quantity, book::TimeInForce::Gtc, fills);
  }

  book::Status submitWith(int id, book::Side side, int price, int quantity, book::TimeInForce tif,
                          std::vector<book::Fill>& fills) override {
    if (!OrderRules::valid(id, price, quantity)) return book::Status::InvalidOrder;
    if (ledger_.seen(id)) return book::Status::DuplicateId;
    ledger_.record(id);
    Order order(id, side, price, quantity);
    fills.clear();
    enter(order, Dispositions::of(tif), fills);
    return book::Status::Ok;
  }

  book::Status cancel(int id) override {
    const RestingIndex::Handle* handle = index_.find(id);
    if (handle == nullptr) return book::Status::UnknownOrder;
    sides_.own(handle->side).remove(handle->price, handle->position);
    index_.forget(id);
    return book::Status::Ok;
  }

  book::Status amend(int id, int newPrice, int newQuantity, std::vector<book::Fill>& fills) override {
    if (!OrderRules::validTerms(newPrice, newQuantity)) return book::Status::InvalidOrder;
    const RestingIndex::Handle* handle = index_.find(id);
    if (handle == nullptr) return book::Status::UnknownOrder;
    fills.clear();
    if (handle->price == newPrice && newQuantity <= handle->position->remaining()) {
      handle->position->resize(newQuantity);  // same price, not larger: the place in the queue is kept
      return book::Status::Ok;
    }
    const book::Side side = handle->side;
    cancel(id);
    Order order(id, side, newPrice, newQuantity);
    enter(order, Dispositions::of(book::TimeInForce::Gtc), fills);
    return book::Status::Ok;
  }

  book::Status remaining(int id, int& out) const override {
    const RestingIndex::Handle* handle = index_.find(id);
    if (handle == nullptr) return book::Status::UnknownOrder;
    out = handle->position->remaining();
    return book::Status::Ok;
  }

  bool bestBid(int& price, int& quantity) const override { return sides_.own(book::Side::Buy).best(price, quantity); }
  bool bestAsk(int& price, int& quantity) const override { return sides_.own(book::Side::Sell).best(price, quantity); }
  int depthAt(book::Side side, int price) const override { return sides_.own(side).depthAt(price); }
  int restingCount() const override { return index_.count(); }

 private:
  // The one path an arriving order takes, whether it is new or comes back from an amend.
  void enter(Order& order, const Disposition& how, std::vector<book::Fill>& fills) {
    if (!how.mayTrade(matcher_, order)) return;
    matcher_.match(order, fills);
    if (order.done() || !how.restsRemainder()) return;
    const HalfBook::Position position = sides_.own(order.side()).add(order);
    index_.add(order.id(), RestingIndex::Handle{order.side(), order.price(), position});
  }

  Sides sides_;
  RestingIndex index_;
  IdLedger ledger_;
  Matcher matcher_;
};
