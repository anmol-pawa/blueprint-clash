# Chess: piece movement, check detection and checkmate

You are building the rules engine of a chess game: no screen, no AI, just the part that says whether a move is allowed and what the position is afterwards. Two players share one `Game` object. A caller names two squares ("e2", "e4"); the engine moves the piece or says why not. It must also answer "where can this piece go?", "is the side to move in check?" and "is the game over?".

What you know so far:

- Six kinds of piece, each with its own way of moving: pawns, knights, bishops, rooks, queens and kings.
- A piece may not land on a friend, sliders may not jump over pieces, and a pawn is special (it moves one way and captures another, and it becomes something else on the last rank).
- A move that leaves your own king attacked is not allowed, whatever the piece.
- The game ends when the side to move has no legal move.
- White moves first, and the sides alternate.

Your task: design and implement it behind the `chess::Game` interface in `api.h` (`makeGame()` and `makeGameFrom()` are yours to define). The hidden tests call only that interface. Ask the interviewer questions first: "what is a legal move, exactly?", "what does move() answer, and in which order does it check?", "what ends the game, and is a draw different from a loss?" and "which of the special rules are in?" are where first drafts go wrong. Expect a request for castling and en passant once the basics work, and then a request to take moves back.
