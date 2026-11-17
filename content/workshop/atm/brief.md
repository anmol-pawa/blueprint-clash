# ATM

A bank wants the software for a cash machine. A customer puts a card in, proves who they are with a PIN, asks for cash, takes the notes, and the card comes back. The machine holds a limited supply of notes in a few denominations, and the customer's money lives in the bank, not in the machine.

What you know so far:

- The machine is always in some state (waiting, waiting for the PIN, ready for a transaction, out of service) and an action that makes no sense in that state must be refused, not guessed at.
- Every withdrawal pays out real notes from a real stock. The bank is asked about the account; the machine never keeps balances of its own.
- A refused request must leave the machine, the account and the stock exactly as they were.

Your task: design and implement it behind the `atm::Atm` interface in `api.h`, creating it in `atm::makeAtm(bank, stock)`. The hidden tests supply a fake `atm::Bank` and call only that interface. Ask the interviewer questions first: "what exactly happens on the third wrong PIN, which notes do I hand out when there is a choice, and what if I cannot pay the exact amount?" is where most first drafts go wrong.
