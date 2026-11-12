# Rate limiter library

You are writing the small library an API gateway calls before it does any real work: "may this caller go ahead right now?" Each caller is identified by a string key (a user id, an API token, an IP address), and a caller that asks too often must be told no, and ideally told when to come back.

What you know so far:

- Limits are per key. One noisy caller must not slow down anyone else.
- A caller may send a short burst, but the long-run rate must be bounded.
- The library must not read the system clock itself: time arrives through a `Clock` the caller supplies, so a test (or a replay of production traffic) controls it.

Your task: design and implement it behind the `rl::RateLimiter` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "what exactly does a refused request cost the caller?" and "how does the bucket refill?" are where first drafts go wrong.
