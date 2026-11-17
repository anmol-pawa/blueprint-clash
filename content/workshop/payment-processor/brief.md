# Payment processor with retries and idempotency keys

You are writing the payment core of a small marketplace. Checkout calls it to charge a card through a remote payment gateway. The network is unreliable, clients press the button twice, and mobile apps resend requests whose answers were lost. A customer must never be charged twice for one purchase, and must never be told "failed" for money that was taken.

What you know so far:

- Checkout sends a request to charge a card for an amount, with a key chosen by the caller.
- The gateway is a remote service. It sometimes answers "approved", sometimes "declined", and sometimes fails for reasons that have nothing to do with the card.
- The same request may arrive more than once.
- Approved payments are recorded and can be looked up.

Your task: design and implement it behind the `pay::Processor` interface in `api.h`. The gateway is supplied by the caller (the tests script it). The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "what exactly counts as the same request, and which answers do we remember?" is where most first drafts go wrong. Expect refunds and key expiry to be asked for after you have finished.
