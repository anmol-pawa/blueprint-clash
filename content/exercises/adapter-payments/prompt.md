Checkout talks to a `PaymentGateway` (see `api.h`), but the company's bank connection is the vendor's `LegacyBank`, which you cannot edit and which speaks another language: dollars as a `double`, a C-string currency, and integer result codes. Write in `solution.h` a `LegacyBankAdapter` so checkout can use the bank without changing:

- `explicit LegacyBankAdapter(LegacyBank& bank)` adapts the bank it is given. It **refers to** that bank (several adapters and the vendor's own diagnostics must see the same call count), it does not copy it.
- `charge(cents, currency)` is a `PaymentGateway`. It converts `cents` to dollars (`cents / 100.0`), passes the currency through, and calls `bank.submit` exactly once.
- Result codes: `0` is `Approved`; `91` (issuer unavailable) is `Unavailable`, which callers may retry; every other code is `Declined`.
- Requests that can never succeed are answered `Declined` **without calling the bank at all**: `cents <= 0` and an empty currency.
