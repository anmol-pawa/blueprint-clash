# LRU / LFU Cache

You are writing the in-memory cache that sits in front of a slow lookup: a profile service, a price table, a template renderer. It maps string keys to int values and holds at most a fixed number of entries. When it is full and a new key arrives, something has to go.

What you know so far:

- The capacity is fixed when the cache is created.
- Reading and writing both cost almost nothing, however many entries there are; the whole point is speed.
- The entry that goes is the **least recently used** one.

Your task: design and implement it behind the `cache::Cache` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: "what counts as a use?" is only the first of several things the brief leaves open.
