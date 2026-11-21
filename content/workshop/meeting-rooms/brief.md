# Meeting room scheduler

You are building the booking core of an office's meeting-room system: the part that answers "is the Atlas room free from 2pm to 3pm?" and "put this meeting in that room". There is no calendar UI and no clock: times are whole minutes counted from a fixed zero, so every test is exact.

What you know so far:

- An office has rooms, each with a name and a number of seats.
- A meeting has an id, a room, a start, an end and a head count.
- A room cannot be in two meetings at once.
- A meeting can be cancelled, and its room is then free again.
- Someone should be able to ask what a room's day looks like.

Your task: design and implement it behind the `rooms::Scheduler` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: "do two meetings, one ending at 10:00 and one starting at 10:00, clash?", "what if the group is bigger than the room?" and "which error wins when several things are wrong?" are where first drafts go wrong. Expect two follow-up requests once you are done: letting the system choose the room for a group, and meetings that repeat.
