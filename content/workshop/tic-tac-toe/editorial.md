# Editorial: Tic-tac-toe to Connect-N

## Requirements
Functional: two players alternate marks on a grid; the game reports whose turn it is, the outcome (in progress, won, drawn), the winner and the contents of every cell. Hidden until asked: all rows, columns and both diagonals count, two in a row does not, a full board with no line is a draw but a last move that completes a line is a win, an illegal move changes nothing and the turn does not pass, and after the end every move returns `GameOver` (which beats the other refusals). Non-goals: a UI, a computer opponent, networking, persistence.

**Change Storm 1, Connect-N:** the board is any `rows x cols`, the winning length is any `winLength` that fits on the longer side, and a run of `winLength` or more counts (including a run formed by joining two shorter ones). It is revealable by asking whether the board or the rules will always be 3x3.

**Change Storm 2, undo:** `undo()` takes back the last successful move, gives the turn back, and reopens a game that had ended. Refused moves are not recorded. It is revealable by the same question: product wants to take moves back.

## Reference design
- `Board` owns the grid: size, cell contents, bounds and the one index formula. It knows nothing about turns or winning.
- `LineWinRule` answers one question: does the mark just placed complete a line of `length` or more? It counts outwards from the last move along the four line directions, so only lines through that cell are examined.
- `Players` knows whose turn it is and can advance and rewind. Marks are a string in play order, so a third player is data, not code.
- `GameConfig` holds the size and the winning length and is the only place that says which combinations are valid.
- `MoveHistory` keeps the successful moves in order.
- `GameImpl` implements the public interface. `play()` validates first (game over, bounds, occupied), then mutates (place, record, judge, advance). It delegates each question to the object that owns the answer; the class stays under the Senior Review method limit because the grid, the rule, the turns and the history are separate classes.

**Storm 1 in the reference:** `Board` and `LineWinRule` were already parameterised by size and length because the base game constructs them from a `GameConfig{3, 3, 3}`. The storm adds the `GameConfig` validation, two factory functions and three read-only accessors. No rule is written against the number three, so no existing class changes. The honest cost: that parameterisation was a small up-front choice the base problem did not demand, and a candidate who hard-coded 3 pays for it here (see Alternatives).

**Storm 2 in the reference:** one new class, `MoveHistory`, and one method on `GameImpl`. The undo is a mirror of `play()`: clear the cell, rewind the turn, reopen the game. It works because the game ends on the first win or draw, so the last move is always the one that ended it and taking it back always reopens the game.

## Alternatives
- **Hard-coded 3x3** (`char board[3][3]`, a table of the eight winning triples) is what most first attempts look like, and it is the right answer to the base brief in ten minutes. The storm turns it into a rewrite of the board, the win check and the draw check. Say so, and say what you would do when you hear the first hint that the size may change: make the size a constructor argument, not an abstraction.
- **Scan the whole board after every move** is simpler to explain and perfectly fine at 3x3 or 7x6. It costs O(cells x winLength) per move; checking only the lines through the last move is a small amount of extra code for a large saving on big boards.
- **An interface `WinRule` with `LineWinRule` as the first implementation** is a reasonable seam if a second win condition is likely (for example "most captures", or misere rules where making the line loses). With one implementation and no sign of a second it is speculation, so the reference keeps a concrete class and the follow-ups discuss when to extract the interface.
- **A `Player` class hierarchy** (`XPlayer`, `OPlayer`) models a difference that is only data (a mark); a `char` and a turn order are enough. Real player behaviour (human or bot) belongs outside the engine.
- **Board as `vector<vector<char>>`** works and reads naturally; a flat vector with one index function (as in the reference) has better locality and one place to get the stride right. The `swapped_stride` bad design shows how the flat version goes wrong when the formula is repeated inline.
- **Undo by snapshot** (copy the board per move, Memento) is simpler when a move can change many cells. For one-cell moves, the move list is smaller and trivial to reverse. Commands with `undo()` pay off once moves have side effects.

## Trade-offs
Returning a status instead of throwing keeps every outcome visible and works without exceptions, at the price that a caller can ignore it. Keeping the grid, the rule, the turn order and the history in four small classes costs four files for a game that fits in 60 lines; the benefit shows only when something changes, which is what the storms measure. For a one-off script the single class is the better engineering; for a code base that will grow variants (Connect Four with gravity, Gomoku, Reversi) the split is cheap insurance.

The `winLength <= max(rows, cols)` validation is deliberately permissive about shape: a 1x5 board with winLength 5 is a legal, silly game. Rejecting it would be a product decision, not a correctness one.

## What breaks at 10x
At 10x the board (a 30x30 grid with winLength 10) the per-move cost is still O(winLength) because only lines through the last move are scanned; scanning the whole board would be 900 x 10 reads per move. At 10x the games (a server), the engine stays a pure state machine, so the work is outside it: serialise the moves of one game through a single owner, give each move a sequence number so retries are idempotent, and persist the move list rather than the board. At 10x the rule variety (Connect Four gravity, Gomoku overlines, Reversi flips) the first thing to extract is a placement rule (where may a mark go) and the second a win rule.

## Level signals
- **SDE2:** correct rules for all lines, draw versus last-move win, refusals that do not pass the turn, and tests for them. Reasonable class split; may hard-code 3 and pay for it in the storm.
- **Senior:** asks "will the board stay 3x3?" before coding, parameterises size and length without over-building, scans only the lines through the last move, validates before mutating, and makes undo a mirror of play.
- **Staff:** separates the pure rules engine from the service around it, names the next two seams (placement rule, win rule) and why they are not built yet, and discusses a bot, replay and idempotent retries unprompted.
