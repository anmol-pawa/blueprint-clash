# Notification service

A shop needs to tell customers things: your order shipped, your code is ready, your card was declined. Today every team writes its own email call and its own retry loop. You are writing the one library they will share.

What you know so far:

- A message is a piece of text with blanks (a template) filled in for one person.
- It goes out over a channel: email, SMS, push. Channels are provided by other teams and sometimes fail.
- A failed delivery should not simply be lost.

Your task: design and implement it behind the `notif::NotificationService` interface in `api.h`. The hidden tests bring their own fake channels and call only that interface. Ask the interviewer questions first: "which failures are worth retrying, how long do we wait, and what exactly does the caller get back?" is where most first drafts go wrong.
