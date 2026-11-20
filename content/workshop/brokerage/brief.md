# Stock brokerage: accounts, trades, lots and profit

You are building the core of a small retail brokerage: no screen, no network, no exchange. Customers have **accounts** that hold cash. The market publishes a **quote** (a price per share) for each symbol. A customer **buys** and **sells** shares at the current quote, and the brokerage must always be able to say what the account holds, what it cost, how much profit has been locked in, and what the whole account is worth today.

What you know so far:

- Money is whole cents, and one order can be a million shares at a million cents each. Think about which type holds that.
- A buy takes cash and gives shares. A sell takes shares and gives cash. Neither can leave an account with negative cash or negative shares.
- The same symbol bought on different days at different prices is not one lump: when some of it is sold, the profit depends on WHICH shares were sold.
- Every call answers a status, and a call that is refused must not change anything.
- Everything is single-threaded and deterministic, so every test can replay an exact sequence.

Your task: design and implement it behind the `broker::Brokerage` interface in `api.h` (`makeBrokerage()` is yours to define). The hidden tests call only that interface. Ask the interviewer questions first: "which shares does a sale use up?", "what is profit, exactly, and when is it realized?", "in which order does each call check its arguments?", "what happens to a symbol that was never quoted?" and "what is a legal amount?" are where first drafts go wrong. Expect a change request for commissions once the basics work, and then one for splits and dividends.
