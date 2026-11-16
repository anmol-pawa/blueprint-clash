# Event bus

You are writing the in-process message bus that lets the parts of one application talk without knowing each other: the checkout code publishes "order placed", and the email, analytics and inventory code each react to it.

What you know so far:

- Code can subscribe a handler to a topic, and publish an event on a topic.
- Publishing runs the handlers of that topic.
- Handlers belong to other teams and do whatever they like, including talking to the bus themselves.

Your task: design and implement it behind the `bus::EventBus` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "what may a handler do while it is being called?" is where most first drafts go wrong.
