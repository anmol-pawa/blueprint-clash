# Editorial: A card game framework with Template Method rounds, house rules and a second game

## Requirements
Functional: a `Game` for one to six players against a dealer, played from a stacked deck: `deal`, `hit`, `stand`, and the queries `phase`, `current`, `hand`, `total`, `result`, `dealerHand`, `dealerTotal`. Twenty-One first, then house rules (dealer hits soft 17, five-card Charlie), then a second game (Showdown) on the same interface.

Hidden in the brief and revealed by good questions: who may sit and what a bad table is (`nullptr`, including a deck too small for the first deal); that the deck is the caller's, drawn from the front, and the deal goes round the table one card at a time ending with the dealer; the value of a hand (Ace 1 or 11 for the best total up to 21, faces 10, a bust shown as the hard sum); that a hand worth 21 has no decision, so a natural passes the turn at once; the check order of `hit` and `stand` (UnknownPlayer, WrongPhase, NotYourTurn, then DeckEmpty) and that a refused call changes nothing; the dealer's rule (draws below 17, stands on every 17, stands on an empty deck, plays only after the last player); the order in which a result is decided (player bust, dealer bust, naturals, dealer natural, totals); and that results exist only when the round is Finished.

**Change Storm 1, house rules:** the dealer also draws on a soft 17, and a five-card Charlie ends the turn and beats everything but a dealer natural. Both must be switchable independently and with neither on the game must be exactly the basic one. **Change Storm 2, a different game:** Showdown deals three cards each, has no decisions, scores the sum of card points modulo ten and compares with the dealer. The real test is what has to change in code that already works.

## Reference design
The reference has four layers that change for different reasons.

- **`Table`, `Seat`, `Hand`, `Shoe`, `Progress`:** plain state with no rules. A `Hand` is the cards in the order dealt, a `Shoe` hands out the caller's deck from the top, a `Seat` is a name, a hand and a result, `Table` is the seats, the dealer and the shoe, and `Progress` is the phase and whose turn it is. No game rule appears in any of them, so a second game reuses all of them.
- **`Scorer` (Strategy):** what a hand is worth. `BlackjackScorer` returns the best total and whether an Ace is counted high (needed for the soft 17 rule); `ModTenScorer` sums points modulo ten. The skeleton never reads a rank.
- **`TableGame` (the read side):** the queries, written once over `Table`, `Progress` and a `Scorer`, so every game answers `hand`, `total`, `result` and `current` the same way.
- **`RoundGame` (Template Method):** `deal`, `hit` and `stand` are `final` and fix the order of a round. `deal` goes round the table, `hit` and `stand` check the call in the documented order, then both pass the turn on through one private `moveOn()` that skips seats without a decision and, when none is left, runs `finishRound()` (the dealer draws, the phase becomes Finished, every seat is settled). A game fills in four hooks: `openingCards`, `canAct`, `dealerDraws`, `settle`.
- **`Blackjack` and `Showdown`:** each is the four hooks and a scorer. House rules are a small `HouseRules` value that two of Blackjack's hooks read (`canAct` for Charlie, `dealerDraws` for soft 17), so the two storm-1 rules are one condition each and no branch of the skeleton was edited. Showdown's `canAct` and `dealerDraws` return false, which is all it takes to have no decisions; the skeleton's loop simply finds nobody to ask.

`validSetup` refuses a table before any object exists, so the constructors never see bad input. Settlement is a short chain of early returns in one function (`Blackjack::settle`), with the rules in the order the interface promises.

## Alternatives
- **One `Game` class with a `switch` on a game type:** the shortest first draft, and the one the storms punish: every new game or rule edits the same functions, and the skeleton's checks get copied into each branch.
- **Template Method versus Strategy for the rules:** a `Rules` object passed to a single `Game` class gives the same flexibility with composition, no inheritance and a smaller blast radius when the hooks grow. Template Method is the better fit when the sequence is the shared part and the variants are small; Strategy is better when the variants are many and independent. A senior answer names both and says why.
- **State pattern for the phases:** `Waiting`, `PlayerTurns` and `Finished` as State objects, each with its own `hit` and `stand`, removes the phase checks from the skeleton. It is worth it when the phases have many different behaviours (poker); for three phases and two calls a `Progress` value and a status check are simpler.
- **Dealing with a `Deck` that shuffles itself:** hides a source of randomness in the game and makes every test either seeded or statistical. A stacked deck handed in is the Dependency Injection answer.
- **Result as a value type with amounts:** carrying a payout (1:1, 3:2 for a natural) in the result is realistic, but it is a wallet's job; the interface keeps Win, Lose and Push.

## Trade-offs
- **Inheritance buys a fixed sequence at the price of fixed shape.** Showdown fits because it has the same shape with an empty decision step. Poker would not, and a design that says so is better than one that pretends the skeleton is universal.
- **House rules as data versus subclasses.** Two flags, each read in one hook, are cheaper than two more classes; a third and fourth flag that interact would change the answer. The deciding factor is whether the flags are read in one place.
- **`final` on the skeleton.** It protects the order of a round from a subclass, and costs the freedom to override it. Games that need a different order should not subclass this skeleton.
- **Queries in a base class.** One read side for all games is less code and cannot drift, but it makes the interface wide (11 methods); splitting a read-only view from the commands is the next refactor if it grows.
- **A bool for "can still decide".** It is enough for hit and stand; doubling, splitting and surrendering want a set of allowed actions instead.
- **Status codes versus exceptions.** The judge builds without exceptions, and the callers here are expected to meet refusals in normal use, so statuses with a documented check order are the better contract.

## What breaks at 10x
- **More players and many tables:** a table is a few hundred bytes, so tens of thousands fit in one process. Share the card supply as an immutable vector with a cursor per table instead of copying a deck for each table, and give each table one lock (or one owner thread).
- **Many decks (a shoe of eight packs):** the interface already allows repeats; a `Shoe` that draws by cursor is O(1) per card. A cut card (reshuffle at 75%) becomes a small policy of the shoe, not of the game.
- **More decisions per hand (double, split, surrender, insurance):** `canAct` becomes `allowedActions`, a seat owns several hands and the turn becomes a (seat, hand) pair; only `Seat`, `Progress` and the skeleton's loop change, and each of them has one reason to.
- **Many games from many teams:** freeze the interface and its check order, ship a conformance suite and a reference model in the style of the tests here, and keep the set of hooks open to growth.
- **Replays and audits:** the deck plus the ordered list of calls reproduces a table exactly; log both and a production dispute becomes a unit test.

## Level signals
- **SDE II:** a working Blackjack with correct Ace handling, a bust, a dealer rule and results; classes for Card, Deck, Hand, Player and Game; clear status answers. Passes the base tests, with the round loop probably inside the game class.
- **Senior:** the round skeleton separate from the rules (Template Method or Strategy, named and justified), scoring behind its own interface, state (table, progress) separate from rules, a stacked deck handed in, house rules without editing existing branches, and a second game that costs one class. Explains when inheritance is the wrong tool.
- **Staff:** sees the shape limit of the skeleton before being asked, proposes allowed-action sets and per-seat multiple hands, keeps the interface's check order as a published contract with a conformance suite and a model for property tests, and talks about replay, sharding of tables and what to freeze for other teams.
