#pragma once
// Change Storm 1: castling and en passant.
#include "api.h"

namespace chess {

// makeFullGame() and makeFullGameFrom() have the same interface and the same rules as makeGame() and makeGameFrom(), plus two
// special moves. Everything else (check order, legality, outcome) is unchanged, and legalMoves() lists the new moves.
//
// CASTLING. A king that has never moved, and a rook of its colour that has never moved and has not been captured, may
// castle: the king moves two squares towards the rook (e1 to g1 or c1, e8 to g8 or c8) and the rook jumps to the square the
// king crossed (f1 or d1, f8 or d8). It is a king move: move("e1", "g1"). Conditions: every square between the king and
// the rook is empty (b1 must be empty for the long side); the king is not in check; the square the king crosses and the
// square it lands on are not attacked. The rook's start square and the squares next to it may be attacked, and the
// b-file square needs only to be empty. The right is lost for good when the king moves (also by castling), when a rook moves
// from its corner, and when a rook is captured on its corner. In makeFullGameFrom() a king on its home square (e1 or e8) counts as
// never moved, and a rook of its colour in a corner (a1, h1, a8, h8) counts as never moved.
//
// EN PASSANT. Right after a pawn advances two squares, an enemy pawn standing beside the square where it landed (on the
// same rank, one file away) may capture it as if it had advanced only one square: the capturing pawn moves diagonally to the
// square the other pawn crossed, and the passed pawn is removed. The chance exists for the very next move only. As for every
// move, the capture is illegal if it leaves the mover's king attacked (including the case where it clears a rank
// between the king and an enemy rook).
std::unique_ptr<Game> makeFullGame();
std::unique_ptr<Game> makeFullGameFrom(const std::vector<std::string>& rows, Color toMove);

}  // namespace chess
