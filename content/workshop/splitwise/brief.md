# Splitwise: shared expenses

A group of friends shares a flat, a trip, a dinner. One person pays the bill and everyone else owes them a part of it. Nobody wants to keep a spreadsheet of who owes whom. You are writing the small library behind an expense-sharing app.

What you know so far:

- A group is a set of named people. An expense says who paid, how much, and who shared it.
- Money is never a floating-point number: every amount is a whole number of cents.
- At any moment the app must be able to say what each person owes, or is owed, and settle debts when somebody pays somebody back.

Your task: design and implement it behind the `split::Ledger` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: "what happens to the cents that do not divide, who counts as a participant, and what does 'owes' mean when two people have paid for each other?" is where most first drafts go wrong.
