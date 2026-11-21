# Stack Overflow-lite

You are building the core of a small question-and-answer site: the part that decides who has asked what, who has voted how, and, above all, **how much reputation everybody has**. There is no web page and no database: the tests call one interface and everything is in memory.

What you know so far:

- Users sign up with a name. A new user has reputation 1.
- A user asks a question and any user can answer it.
- Other users vote a post up or down.
- The person who asked can accept one answer as the best.
- Votes and acceptances change the reputation of the people involved.
- You can ask for a user's reputation, a post's score and a question's answers, best first.

Your task: design and implement it behind the `qa::Site` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer before you write anything: "how many points is each thing worth?", "can I vote on my own post?", "what happens when I change my mind about a vote?", "what is the lowest reputation can go?" and "which error wins when several things are wrong?" are where first drafts go wrong. Expect two follow-up requests once you are done: a daily limit on what votes can earn, and letting authors delete their posts. Both are much easier if reputation is something you can recompute from what is true now, rather than a number you keep adjusting.
