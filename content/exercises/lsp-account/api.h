#pragma once

// The contract every Account must honour (callers rely on it, so subtypes must not break it):
//   deposit(x):  ignored when x <= 0, otherwise balance() grows by exactly x.
//   withdraw(x): when it returns true, balance() fell by exactly x;
//                when it returns false, balance() is unchanged.
//   A subtype may accept MORE withdrawals than the base promises, never fewer.
//   Base promise: withdraw(x) succeeds whenever 0 < x <= balance().
class Account {
 public:
  virtual ~Account() = default;
  virtual void deposit(long long cents) = 0;
  virtual bool withdraw(long long cents) = 0;
  virtual long long balance() const = 0;
};
