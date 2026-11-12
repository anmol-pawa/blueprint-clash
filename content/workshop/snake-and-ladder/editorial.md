# Editorial: Snake and Ladder

## Requirements
Functional: two or more players share a board of squares `1..N` and start on square 0. Each `takeTurn()` rolls an injected dice for the current player, moves the piece, applies a snake or ladder if the piece stopped on its start, and passes the turn. The first to land exactly on the last square wins. Hidden until asked: a roll past the end is not played (the piece stays and the turn still passes), nothing happens after the game is won (not even a roll), the links must be sane (no chains, no shared starts, none starting on the last square) and bad setups return `nullptr`. Non-goals: a UI, a random board generator, networking, persistence.

**Change Storm 1, house rules:** `Rules::bounceBack` makes an overshoot bounce off the last square, and a snake or ladder on the bounce square still applies. `Rules::sixRerolls` gives a six another roll, with the third six in a row forfeited. Both are revealable by asking whether the rules will stay this simple.

**Change Storm 2, resigning:** `resign(player)` removes a player. The rotation skips them, the turn passes if it was theirs (with a fresh run of sixes), and the last player in wins at once.

## Reference design
- `Board` owns the squares and the links: whether a link set is acceptable, where a stop leads (`endOf`) and what kind of jump it is. It knows nothing about players or dice.
- `OvershootPolicy` is a Strategy for the one decision that varies: where a roll past the end lands. `StayPolicy` and `BouncePolicy` are two small classes. The game asks for the landing square and never branches on which rule is on.
- `TurnOrder` owns the rotation, who has left, and the run of sixes. Every way a turn can pass (a normal roll, a forfeit, a resignation) goes through one private `passOn()`, which resets the run and moves to the next active player.
- `GameImpl` is the facade: roll, ask the policy for the landing square, let the board apply the link, record the win, ask the turn order what happens next. The dice is injected and owned.
- `game.cpp` validates the setup in one place and picks the policy; the three factory functions share it.

**Storm 1 in the reference:** one new class (`BouncePolicy`) and the bonus-roll logic inside `TurnOrder`, which already owned the rotation. `Board` and `GameImpl::move()` do not change. Because every landing goes through the same board lookup, a snake on the bounce square works with no extra code.

**Storm 2 in the reference:** one `leave()` method on `TurnOrder` and one `resign()` on `GameImpl`. Skipping is already the rotation's job, so a departed player is just another flag that `passOn()` consults. Nothing about movement, links or the policies changes.

## Alternatives
- **A `Player` class with a position and `move(n)`** is the first thing most candidates draw, and it is fine. The reference keeps positions in a vector because a player has no behaviour: the interesting rules (links, overshoot, turn order) live elsewhere, and a class with only a field and a setter is a struct in a costume. If players grow behaviour (a bot, a handicap) extract it then.
- **A `Dice` class created inside the game** with `rand()` makes every test flaky and every bug unreproducible. Injecting the dice is the single most important decision in this problem, and the one an interviewer is probing when they say "how do you test it?".
- **`Snake` and `Ladder` subclasses of a `Jump` base class** model a difference that is one comparison (`to > from`). The reference stores `from -> to` and derives the kind. Subclasses earn their place only if snakes and ladders get different behaviour (a snake that can be avoided with a shield, say).
- **An overshoot `enum` and an `if`** in `takeTurn()` is the right answer when there are two rules and no more are expected. The Strategy is cheap here and keeps `GameImpl::move()` unchanged by the storm; do not extend it to a registry of rules until a third one shows up.
- **A `std::function<int(int,int,int)>`** as the overshoot rule is lighter than an interface with two classes, and perfectly acceptable. A named class wins when the rule gets its own tests, state or documentation.
- **Following chains** (a ladder that ends on a snake) at build time with cycle detection is friendlier to board designers than refusing them. Refusing chains is easier to specify and test; either is defensible if stated.

## Trade-offs
Returning `nullptr` for a bad setup (and a `Turn` value for every move) avoids exceptions, which this toolchain does not provide, at the cost of an error that carries no reason; a `Result` type with a message would help a real caller. Keeping the turn order separate from the game costs one more file but lets three different events (a roll, a forfeit, a resignation) share one definition of "next". Putting the six-run in `TurnOrder` mixes a game rule into a rotation class; the alternative, a `TurnPolicy` interface, is worth it once there is a third rule.

The bounce limit (`boardSize >= 6`) exists only so that a bounce cannot land below square 1. A product might instead clamp the bounce; that would be a rule change, not a correctness fix.

## What breaks at 10x
At 10x the board (a 1000-square board) nothing changes: a link lookup is O(1) in a vector. At 10x the players (a hundred seats) the rotation's `passOn()` is O(players) in the worst case when most have resigned; a circular list or an index of active players makes it O(1), and is the first thing to change. At 10x the games (a server), the engine stays a pure state machine of a few integers, so work is outside it: one owner per game so two clients cannot roll for the same turn, a server-side dice that is seeded and logged, sequence numbers for idempotent retries, and the roll log (not snapshots) as the stored state, which also gives replays.

## Level signals
- **SDE2:** correct moves, links and exact finish; injects the dice or at least can explain why they should; validates link input; tests the endgame and the snake direction.
- **Senior:** asks about overshoot, chains and the dice before drawing anything; keeps the board, the rotation and the facade in separate small classes; identifies overshoot as the varying decision and the run of sixes as state; makes every path that passes the turn go through one method.
- **Staff:** names the next seams and why they are not built (a `TurnPolicy`, chain-following boards), explains how the roll log gives replay, fairness and idempotency, and discusses a trusted server-side dice unprompted.
