# Logger Framework

You are writing the logging library an application will call from everywhere. Code calls `log(level, category, message)`; the logger turns that into a line of text and hands it to one or more **sinks**: a console, a file, an alerting channel. Different destinations want different amounts of detail.

What you know so far:

- There are four levels: Debug, Info, Warn and Error, from least to most severe.
- A logger can have several sinks, and each sink decides for itself which levels it wants.
- The logger as a whole can also be turned up or down, for example to silence Debug in production.

Your task: design and implement it behind the `logx::Logger` interface in `api.h`. The hidden tests call only that interface, with sinks that record what they receive. Ask the interviewer questions first: the brief is deliberately incomplete, and a logging library is a classic place for requirements to grow.
