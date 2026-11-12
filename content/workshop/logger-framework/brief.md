# Logger framework

You are writing the **logging library** that an application links against. Code calls the logger to record what happened ("user signed in", "disk almost full"), and the logger decides where those messages go: the console, a file, a monitoring service.

What you know so far:

- Messages have a **level** (debug, info, warn, error). The logger can be told to ignore the quiet ones.
- A logger sends messages to one or more **sinks** (destinations). Each sink only wants messages above a level of its own.
- Every message carries the **time** it was logged. The clock is **handed in**, so the tests can script time.

Your task: design and implement it behind the `logx::Logger` interface in `api.h`. The hidden tests call only that interface and their own sinks. Ask the interviewer questions first: the brief is deliberately incomplete, and the library will not stay this simple.
