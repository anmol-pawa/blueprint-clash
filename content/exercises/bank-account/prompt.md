A `BankAccount` holds money in whole cents, and its balance must **never go negative**. Write the class in `solution.h` so the type itself enforces that rule: callers cannot break it, however they use the public interface.

- `explicit BankAccount(long long openingCents = 0)`: a negative opening balance is clamped to zero.
- `bool deposit(long long cents)`: accepts only positive amounts.
- `bool withdraw(long long cents)`: accepts only positive amounts that do not exceed the balance.
- `long long balance() const`.

A refused call returns `false` and changes nothing.
