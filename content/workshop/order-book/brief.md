# Order book: the matching engine of an exchange, one instrument

You are building the heart of a small exchange: no network, no screen, no money, only the book. Traders send **limit orders** (buy or sell, a price, a quantity). The book trades them against orders that are already waiting, and keeps whatever is left so that later orders can trade with it. The same few rules run every stock exchange, so every candidate is expected to know them cold.

What you know so far:

- A buy order wants to pay at most its limit; a sell order wants to receive at least its limit. Prices and quantities are whole numbers.
- Orders that cannot trade yet wait in the book, buys on one side and sells on the other.
- A new order trades with the waiting orders on the other side. It goes to the best price first, and among equal prices to whoever came first.
- A waiting order can be cancelled. Everything is single-threaded and deterministic, so every test can replay an exact sequence.

Your task: design and implement it behind the `book::Book` interface in `api.h` (`makeBook()` is yours to define). The hidden tests call only that interface. Ask the interviewer questions first: "at which price does a trade happen?", "what does an order that is only partly filled do?", "what is the best price on each side?", "can an id come back?" and "what does each call answer, and in which order does it check?" are where first drafts go wrong. Expect a change request for how long an order may wait (immediate-or-cancel, fill-or-kill) once the basics work, and then one for amending an order that is already resting.
