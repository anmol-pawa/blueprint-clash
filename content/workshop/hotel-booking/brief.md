# Hotel booking

You are writing the reservation core for a small hotel chain's website. A guest picks a room type and the dates of their stay, and the hotel must never promise a room it does not have.

What you know so far:

- A hotel has several room types, each with a number of identical rooms and a price per night.
- A guest books a type, not a particular room, for a stay from a check-in day to a check-out day.
- Guests change their minds, so a booking can be cancelled.
- The system must not read the date itself: today arrives through a `Clock` the caller supplies, so a test (or a replay) controls it.

Your task: design and implement it behind the `hotel::Hotel` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "does the check-out day count as a night?" is where most first drafts go wrong.
