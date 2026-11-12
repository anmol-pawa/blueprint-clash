# Cache

You are writing the in-memory cache a service puts in front of a slow database. Callers `put` and `get` values by key; the cache keeps a fixed number of entries and, when it is full, must decide what to throw away.

What you know so far:

- Keys and values are strings. The capacity is fixed when the cache is created.
- Reads should usually be fast, so a recently used entry should survive longer than one nobody has asked for.
- Operations people will want numbers: how often did we find what we were looking for?

Your task: design and implement it behind the `cachex::Cache` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "which entry goes?" is exactly the question an interviewer expects to change under you.
