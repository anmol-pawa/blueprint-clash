# Logger Framework

You are writing the **logging library** that other teams will call from their code. A caller reports a message with a level and a category, and the library writes it to wherever it was configured to write.

What you know so far:

- There are four levels, from `Debug` (least severe) to `Error` (most severe).
- The library can write to **several destinations at once** (a console, a file, a network forwarder). The destinations are supplied by the callers as objects.
- Each record becomes **one line of text** with a time, a level, a category and the message.
- The time comes from a `Clock` that is **handed in**, so the tests can script it.

Your task: design and implement it behind the `logx::Logger` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and what operators want from a logger tends to grow.
