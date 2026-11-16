# Event bus

Several parts of one program need to react to things that happen elsewhere in it: an order is placed, a file finishes uploading, a setting changes. You are writing the small in-process library they will share, so that the part that announces an event does not have to know who is listening.

What you know so far:

- Listeners register interest in a topic and get back something they can later use to stop listening.
- Announcing an event hands it to everyone listening to that topic.
- Everything runs on the caller's thread: when the announcement returns, the listeners have run.

Your task: design and implement it behind the `evb::EventBus` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: "what exactly may a listener do while it is being called?" is where most first drafts go wrong.
