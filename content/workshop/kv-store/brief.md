# Key-value store

You are writing the small in-memory store a service uses for sessions, feature flags and short-lived locks. Callers `set` and `get` string values by key, and some keys should disappear on their own after a while.

What you know so far:

- Keys and values are strings.
- A key can be given a time to live. After that it must behave as if it was never there.
- The store must not read the system clock itself: time arrives through a `Clock` the caller supplies, so a test (or a replay) controls it.

Your task: design and implement it behind the `kv::Store` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "what does expiry mean exactly?" is where most first drafts go wrong.
