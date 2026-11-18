# Task scheduler (cron)

You are building the core of an in-process job scheduler, the kind that sits behind "send the report at 9", "expire this hold in 10 minutes" and "refresh the cache every minute". Callers register jobs to run at a time, and the scheduler runs them in the right order when time moves forward. To keep it testable, time is simulated: nothing reads a real clock, and a caller moves time forward with one call.

What you know so far:

- A job has an id, a time, a priority and a function to run.
- Jobs can be cancelled before they run.
- When several jobs are due, the more urgent one should win.
- Jobs run on the caller's thread, inside the call that moves time forward.

Your task: design and implement it behind the `sched::Scheduler` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: "what happens when two jobs are due at the same tick with the same priority?", "may a job schedule more jobs while it runs, and do they run in the same call?" and "what is 'now' inside a job?" are where first drafts go wrong. Expect a request for recurring jobs, and then a request about what a recurring job should do when time jumps over several of its occurrences at once, after you have finished.
