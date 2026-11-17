# Movie ticket booking

You are writing the booking core for a cinema chain's website. A customer picks seats for a show, has a few minutes to pay, and either completes the booking or loses the seats back to everyone else.

What you know so far:

- A show has a hall laid out as rows and numbered seats.
- Two people must never end up with the same seat.
- Choosing seats and paying are two steps, so a chosen seat must stay reserved for a while without being sold.
- The system must not read the system clock itself: time arrives through a `Clock` the caller supplies, so a test (or a replay) controls it.

Your task: design and implement it behind the `tix::Booking` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "what exactly happens at the moment a hold runs out?" is where most first drafts go wrong.
