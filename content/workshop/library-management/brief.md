# Library management

You are building the core of a small public library's lending system. Staff register **books** and **members**; members **borrow** and **return** books; staff and members can look up what is on the shelf.

What you know so far:

- A book has an id, a title and an author. The library may own several copies of the same book.
- A member has an id and a name.
- A member can borrow a book if a copy is on the shelf, and can give it back later.
- Anyone can search for books by author.

Your task: design and implement it behind the `lib::Library` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete.
