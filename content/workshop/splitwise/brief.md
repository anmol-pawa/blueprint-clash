# Expense sharing

Friends share a flat, a trip, a dinner. One person pays the bill and everyone else owes them a part. Nobody wants to keep a spreadsheet, and nobody wants to argue about who owes whom after three weekends of this. You are writing the small library that keeps the books for a group.

What you know so far:

- A group has members. Money is always a whole number of cents.
- Someone pays for something and it is shared between some of the members.
- Later, people pay each other back.
- At any time the group wants to know where it stands: what each person is owed, and who owes whom.

Your task: design and implement it behind the `split::Ledger` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: "what happens to the odd cent when 10.00 is shared between three people, and who counts as owing whom when two people each paid for something?" is where most first drafts go wrong.
