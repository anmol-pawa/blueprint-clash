# Job queue with retries, backoff and a dead-letter queue

You are building the core of an in-process background job queue, the kind behind "send the welcome email", "resize this upload" and "charge the card". Callers enqueue a job, a worker calls its handler, and when the handler fails the queue tries again later, waiting longer each time. A job that keeps failing must not retry for ever: after the last attempt it is parked in a dead-letter queue where a person can look at it. To keep it testable, time is simulated: nothing reads a real clock, and a caller moves time forward with one call.

What you know so far:

- A job has an id and a handler; the handler is called with the attempt number and says whether the work was done.
- A failed job is retried after a delay that grows with every failure.
- A job that runs out of attempts is not lost: it is kept as dead.
- A waiting job can be cancelled, and you can ask where any job is in its life.
- Handlers run on the caller's thread, inside the call that moves time forward.

Your task: design and implement it behind the `jobq::Queue` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: "how long is the wait after each failure, and measured from when?", "what happens to the job after the last attempt?", "may an id be used again?" and "may a handler enqueue more jobs while it runs?" are where first drafts go wrong. Expect a request for a retry policy per job, and then a request about failures that are not worth retrying and about sending dead jobs back, after you have finished.
