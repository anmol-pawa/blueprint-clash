#pragma once
#include <map>
#include <memory>
#include <string>
#include <utility>

#include "lifetime.h"
#include "request.h"

// Remembers the final answer to every request by its idempotency key, for payments and refunds alike. A key is one
// namespace: the shape of the request it was first used for decides whether a later call is a replay or a conflict.
class KeyBook {
 public:
  struct Verdict {
    enum class Kind { Fresh, Replay, Conflict };
    Kind kind = Kind::Fresh;
    Answer answer;
  };

  explicit KeyBook(std::unique_ptr<Lifetime> lifetime) : lifetime_(std::move(lifetime)) {}

  Verdict check(const std::string& key, const RequestShape& shape) const {
    const auto it = records_.find(key);
    if (it == records_.end() || lifetime_->expired(it->second.stamp)) return Verdict{};
    if (!(it->second.shape == shape)) return Verdict{Verdict::Kind::Conflict, Answer{}};
    return Verdict{Verdict::Kind::Replay, it->second.answer};
  }

  void remember(const std::string& key, const RequestShape& shape, const Answer& answer) {
    records_[key] = Record{shape, answer, lifetime_->stamp()};
  }

 private:
  struct Record {
    RequestShape shape;
    Answer answer;
    long long stamp = 0;
  };

  std::unique_ptr<Lifetime> lifetime_;
  std::map<std::string, Record> records_;
};
