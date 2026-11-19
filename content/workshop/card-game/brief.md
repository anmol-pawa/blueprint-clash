# Card game framework: one round of Twenty-One, then other games on the same table

You are building the engine of a small card-game table: no screen, no network, only the rules. A `Game` object seats one to six players against a dealer, deals from a deck the caller has already put in order, lets each player decide in turn, lets the dealer play, and reports a result for every player. The first game is Twenty-One (Blackjack); the owner already says other games will follow, so the table, the deal and the turn loop must not belong to Blackjack.

What you know so far:

- A card has a rank (Ace to King) and a suit. A deck is an ordered list; the card at the front is the top.
- Players sit in a fixed order, then the dealer. Cards go round the table one at a time.
- Each player in turn may take a card (`hit`) or stop (`stand`). A hand worth more than 21 is a bust.
- The dealer plays by a fixed rule after the last player, and then every player wins, loses or pushes against the dealer.
- Everything is face up and the deck order is chosen by the caller, so every round can be replayed exactly.

Your task: design and implement it behind the `cards::Game` interface in `api.h` (`makeBlackjack()` is yours to define). The hidden tests call only that interface. Ask the interviewer questions first: "what is a hand worth, exactly, and what does an Ace count as?", "what does each call answer, and in which order does it check?", "what does the dealer do, and when?" and "what decides a tie, a natural or a double bust?" are where first drafts go wrong. Expect a request for house rules once the basics work, and then a request for a second game that is not Blackjack at all.
