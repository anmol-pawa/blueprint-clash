# Car rental

You are writing the booking core for a regional car-rental company. A customer reserves a kind of car for a stretch of time, collects a real car at the counter, and brings it back. The company must never promise a car it cannot hand over.

What you know so far:

- The fleet is split into categories (compact, SUV, van), each with a price per day. A category has several individual cars, each with a licence plate.
- A customer reserves a category and a time, not a particular car. The counter assigns a real car when the customer turns up.
- Customers change their minds, and some bring the car back early or late.
- The system must not read the time itself: the hour arrives through a `Clock` the caller supplies, so a test (or a replay) controls it.

Your task: design and implement it behind the `rental::Rentals` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "is a car that is booked for tomorrow free today?" is where most first drafts go wrong.
