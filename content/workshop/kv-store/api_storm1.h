#pragma once
// Change Storm 1 adds nested transactions. Everything from api.h still holds.
#include "api.h"

namespace kv {

// begin() opens a transaction; transactions nest. Every write (set, setWithTtl, erase) belongs to the innermost
// open transaction, and reads always see the latest writes, committed or not.
//   rollback()  undoes every write of the innermost transaction and closes it: values, expiries and the presence
//               of keys all return to what they were at its begin(). Time is not rolled back: a key whose expiry
//               passes while the transaction was open is simply expired afterwards, as it would have been anyway.
//   commit()    closes the innermost transaction and keeps its writes. They now belong to the transaction around it,
//               so rolling that one back undoes them too. Only committing the outermost transaction makes them final.
// commit() and rollback() return false, and change nothing, when no transaction is open.
class TransactionalStore : public Store {
 public:
  virtual void begin() = 0;
  virtual bool commit() = 0;
  virtual bool rollback() = 0;
  // How many transactions are open.
  virtual int depth() const = 0;
};

// Returns nullptr when the clock is null.
std::unique_ptr<TransactionalStore> makeTransactionalStore(std::shared_ptr<Clock> clock);

}  // namespace kv
