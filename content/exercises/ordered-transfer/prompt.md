Two threads run `transfer(a, b, 10)` and `transfer(b, a, 10)` at the same moment. If each locks its *source* account first, thread 1 holds `a` and waits for `b` while thread 2 holds `b` and waits for `a`: a deadlock. Write `transfer` in `solution.h` so that cannot happen.

`bool transfer(Account& from, Account& to, long long amount)` moves `amount` from one account to the other, atomically with respect to other transfers, and returns whether it did.

- Fail (return `false`, change nothing, hold nothing) when `amount <= 0`, when `from` and `to` are the **same** account (locking one non-recursive lock twice is itself a deadlock), or when `from` has less than `amount`.
- Otherwise both balances change while **both** locks are held, and both are released when the function returns.
- **Deadlock avoidance by lock ordering:** every thread must acquire the two locks in the same global order, here **ascending `id`**, whichever direction the money moves. The tests record the order in which locks are taken and check this directly. (`std::scoped_lock(first.lock, second.lock)` with the arguments already in id order is fine; so is two `lock_guard`s in id order.)

Think about it while you write: why does a *consistent* order remove the cycle that deadlock needs? What would you do if accounts had no id? (Editorial: address order, or a hierarchy level.)
