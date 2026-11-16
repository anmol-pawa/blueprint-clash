# Rate limiter library

Your team's services all need to protect themselves from clients that send too many requests. You are writing the small in-process library they will share: given a client id, say yes or no, and when to come back.

What you know so far:

- Clients are identified by a string (an API key, a user id, an IP address).
- The answer is a yes or no, and for a no, how long the caller should wait.
- The library must not read the system clock itself: time arrives through a `Clock` the caller supplies, so a test (or a replay of an incident) controls it.

Your task: design and implement it behind the `rl::RateLimiter` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: "limit what, exactly, and what happens at the edges?" is where most first drafts go wrong.
