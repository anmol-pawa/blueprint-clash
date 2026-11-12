# Snake and Ladder

You are writing the engine of a **snake and ladder** board game. Two or more players share a numbered board. On their turn a player rolls a die and moves that many squares forward. Landing on the foot of a ladder carries you up; landing on a snake's head slides you down. The first to reach the last square wins.

What you know so far:

- The board has squares numbered `1..N`, and everyone starts off the board on square 0.
- The dice is **handed in**, so the tests can script every roll.
- Players take turns in order, and the game reports who is on which square, whose turn it is and who won.

Your task: design and implement it behind the `snl::Game` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and the rules may not stay this simple.
