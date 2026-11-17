# Movie ticket booking

You are writing the seat-selling core of a cinema app. Two people must never end up with the same seat, and a customer who is still typing in card details should not lose the seats they picked.

What you know so far:

- A show has rows of seats. Customers pick seats, pay, and get tickets.
- Picking seats and paying are two separate steps, and the second can take minutes.
- Many customers want the same popular seats at the same time.
- The service must not read the system clock itself: time arrives through a `Clock` the caller supplies, so a test (or a replay) controls it.

Your task: design and implement it behind the `booking::BookingService` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "what happens to seats nobody paid for?" and "what does a late confirm do?" are where most first drafts go wrong.
