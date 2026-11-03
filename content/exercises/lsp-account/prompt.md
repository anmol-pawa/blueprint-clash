Code that works with an `Account` (see the contract in `api.h`) must keep working when it is handed *any* kind of account. Write three types in `solution.h` that honour that contract:

- `SavingsAccount(long long openingCents)`: the plain account. `withdraw(x)` succeeds exactly when `0 < x <= balance()`. A failed withdrawal changes nothing (no fees).
- `CheckingAccount(long long openingCents, long long overdraftCents)`: may go below zero down to `-overdraftCents`. `withdraw(x)` succeeds when `0 < x` and `x <= balance() + overdraftCents`. This accepts *more* than the base promises, which is allowed.
- `FixedDeposit(long long principalCents)`: money locked until it matures. It cannot honour the Account contract (a withdrawal that is always refused breaks "succeeds whenever 0 < x <= balance()"), so it must **not** derive from `Account`. Give it `long long principal() const`, `bool matured() const`, `void mature()` (marks it matured) and `long long redeem(Account& into)`: if matured, deposit the principal into `into`, set the principal to 0 and return the amount moved; if not matured, do nothing and return 0.

Tests run the same generic code over the accounts and check `FixedDeposit` is not an `Account`.
