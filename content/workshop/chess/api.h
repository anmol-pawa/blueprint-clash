#pragma once
// Public API for the Chess problem. The hidden tests only use what is declared here.
// You implement chess::makeGame() and chess::makeGameFrom() (in any of your .cpp files); everything behind them is your design.
#include <memory>
#include <string>
#include <vector>

namespace chess {

enum class Color { White, Black };
enum class Kind { Pawn, Knight, Bishop, Rook, Queen, King };

struct Piece {
  Color color;
  Kind kind;
};

enum class Status {
  Ok,
  InvalidSquare,     // a square is not written as a lower-case file a..h followed by a rank 1..8
  Empty,             // there is no piece on the square (for move() and pieceAt())
  NotYourTurn,       // the piece on the square belongs to the side that is not to move
  IllegalMove,       // the piece cannot move there, or the move leaves the mover's own king attacked
  InvalidPromotion,  // a pawn reaches the last rank and the requested piece is a pawn or a king
  GameOver,          // the side to move is checkmated or stalemated
  NothingToUndo,     // reserved for a later interface; nothing here returns it
};

enum class Outcome {
  Ongoing,
  Checkmate,  // the side to move is in check and has no legal move: the other side has won
  Stalemate,  // the side to move is NOT in check and has no legal move: a draw
};

// A game of chess between two players who share one object. Squares are written "e4": a lower-case file and a rank.
//
// MOVEMENT. Every piece moves as in the standard game, with these simplifications for this exercise:
//   Pawn    one square forward onto an empty square; two squares forward from its start rank (rank 2 for White,
//           rank 7 for Black) when both squares in front of it are empty; one square diagonally forward onto a square
//           that holds an enemy piece. White moves up the ranks, Black down. A pawn that reaches the last rank is
//           promoted to the piece named by promoteTo (Queen, Rook, Bishop or Knight).
//   Knight  the eight L-shaped jumps; it may jump over pieces.
//   Bishop, Rook, Queen   any distance along its lines until the first piece: an enemy piece there may be captured,
//           a friendly piece blocks and cannot be captured.
//   King    one square in any direction.
// No piece captures a piece of its own colour. This basic game has NO castling and NO en passant: a king that tries to
// move two squares, or a pawn that tries to capture a square that is empty, is an IllegalMove.
//
// CHECK. A king is in check when an enemy piece attacks its square (a pawn attacks the two squares diagonally in front
// of it, not the square it pushes to). A move is legal only if the mover's own king is not attacked afterwards: so a pinned
// piece may move only along the line of the pin, a king may not step onto an attacked square, and while in check the
// move must capture the checker, block it, or move the king.
//
// move(from, to, promoteTo) CHECK ORDER: GameOver, InvalidSquare (either square), Empty, NotYourTurn, IllegalMove,
// InvalidPromotion. promoteTo is ignored unless the move is a promotion (a pawn reaching the last rank); for a promotion it
// must be Queen, Rook, Bishop or Knight, or the call is InvalidPromotion. A refused call changes nothing.
class Game {
 public:
  virtual ~Game() = default;

  virtual Status move(const std::string& from, const std::string& to, Kind promoteTo = Kind::Queen) = 0;

  // Ok and the piece, Empty for an empty square (out untouched), InvalidSquare for a bad name.
  virtual Status pieceAt(const std::string& square, Piece& out) const = 0;

  virtual Color turn() const = 0;      // the side to move
  virtual bool inCheck() const = 0;    // is the side to move in check?
  virtual Outcome outcome() const = 0;

  // The squares the piece on `from` may legally move to, sorted by name ("a3" < "a4" < "b1"), each once (a promotion
  // square appears once). Empty for an invalid square, an empty square or a piece of the side that is not to move.
  virtual std::vector<std::string> legalMoves(const std::string& from) const = 0;
};

// The standard starting position, White to move.
std::unique_ptr<Game> makeGame();

// A game from a position. `rows` has 8 strings of 8 characters, rank 8 first, file a first: 'K','Q','R','B','N','P' are
// White pieces, 'k','q','r','b','n','p' are Black pieces and '.' is an empty square. `toMove` is the side to move.
// Returns nullptr for a position that cannot exist: wrong shape or characters, not exactly one king of each colour, a pawn
// on rank 1 or 8, or the side that is NOT to move already in check. The outcome of a position that is already checkmate
// or stalemate is reported at once.
std::unique_ptr<Game> makeGameFrom(const std::vector<std::string>& rows, Color toMove);

}  // namespace chess
