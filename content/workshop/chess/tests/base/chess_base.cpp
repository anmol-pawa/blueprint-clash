#include <algorithm>
#include <memory>
#include <string>
#include <vector>

#include "api.h"
#include "bp_test.h"

namespace {
using chess::Color;
using chess::Kind;
using chess::Outcome;
using chess::Piece;
using chess::Status;

#define IS(call, expected) EXPECT_TRUE((call) == Status::expected)

// "r3k2r/8/8/..." (a FEN placement) to the eight rows makeGameFrom() takes.
std::vector<std::string> rowsOf(const std::string& placement) {
  std::vector<std::string> rows(1);
  for (char c : placement) {
    if (c == '/') rows.emplace_back();
    else if (c >= '1' && c <= '8') rows.back() += std::string(static_cast<std::size_t>(c - '0'), '.');
    else rows.back() += c;
  }
  return rows;
}

std::unique_ptr<chess::Game> position(const std::string& placement, Color toMove = Color::White) {
  return chess::makeGameFrom(rowsOf(placement), toMove);
}

std::string join(const std::vector<std::string>& names) {
  std::string out;
  for (const auto& n : names) out += (out.empty() ? "" : " ") + n;
  return out;
}

std::string movesOf(const chess::Game& g, const std::string& from) { return join(g.legalMoves(from)); }

// "e2e4" or "e7e8n": plays one move, the optional fifth letter names the promotion piece.
Status play(chess::Game& g, const std::string& text) {
  Kind promote = Kind::Queen;
  if (text.size() == 5) promote = text[4] == 'n' ? Kind::Knight : text[4] == 'b' ? Kind::Bishop : text[4] == 'r' ? Kind::Rook : Kind::Queen;
  return g.move(text.substr(0, 2), text.substr(2, 2), promote);
}

bool playAll(chess::Game& g, const std::string& line) {
  std::size_t start = 0;
  while (start < line.size()) {
    std::size_t end = line.find(' ', start);
    if (end == std::string::npos) end = line.size();
    if (play(g, line.substr(start, end - start)) != Status::Ok) return false;
    start = end + 1;
  }
  return true;
}

// The piece on a square as one letter (upper case White), '.' when empty.
char letter(const chess::Game& g, const std::string& square) {
  Piece p{Color::White, Kind::Pawn};
  if (g.pieceAt(square, p) != Status::Ok) return '.';
  static const std::string kinds = "PNBRQK";
  const char c = kinds[static_cast<std::size_t>(p.kind)];
  return p.color == Color::White ? c : static_cast<char>(c - 'A' + 'a');
}

std::string placementOf(const chess::Game& g) {
  std::string out;
  for (int rank = 8; rank >= 1; --rank) {
    for (char file = 'a'; file <= 'h'; ++file) out += letter(g, std::string{file, static_cast<char>('0' + rank)});
    if (rank > 1) out += '/';
  }
  return out;
}

// The number of moves of the side to move, a promotion counted as the four moves it is.
long long countMoves(const chess::Game& g) {
  long long total = 0;
  for (char file = 'a'; file <= 'h'; ++file) {
    for (char rank = '1'; rank <= '8'; ++rank) {
      const std::string from{file, rank};
      const char c = letter(g, from);
      const bool pawn = c == 'P' || c == 'p';
      for (const auto& to : g.legalMoves(from)) total += (pawn && (to[1] == '8' || to[1] == '1')) ? 4 : 1;
    }
  }
  return total;
}

// Counts the positions `depth` moves ahead. The basic game has no hidden state, so a position is rebuilt from what
// the board shows.
long long perft(const chess::Game& g, int depth) {
  if (depth == 1) return countMoves(g);
  long long total = 0;
  const std::string placement = placementOf(g);
  for (char file = 'a'; file <= 'h'; ++file) {
    for (char rank = '1'; rank <= '8'; ++rank) {
      const std::string from{file, rank};
      const char c = letter(g, from);
      for (const auto& to : g.legalMoves(from)) {
        const bool promotion = (c == 'P' || c == 'p') && (to[1] == '8' || to[1] == '1');
        for (Kind k : {Kind::Queen, Kind::Rook, Kind::Bishop, Kind::Knight}) {
          auto next = position(placement, g.turn());
          if (!next || next->move(from, to, k) != Status::Ok) return -1000000;
          total += perft(*next, depth - 1);
          if (!promotion) break;
        }
      }
    }
  }
  return total;
}
}  // namespace

TEST(Setup, TheStartingPositionAndAnswersAboutSquares) {
  auto g = chess::makeGame();
  EXPECT_EQ(placementOf(*g), std::string("rnbqkbnr/pppppppp/......../......../......../......../PPPPPPPP/RNBQKBNR"));
  EXPECT_TRUE(g->turn() == Color::White);
  EXPECT_FALSE(g->inCheck());
  EXPECT_TRUE(g->outcome() == Outcome::Ongoing);
  Piece p{Color::Black, Kind::Pawn};
  IS(g->pieceAt("d1", p), Ok);
  EXPECT_TRUE(p.color == Color::White && p.kind == Kind::Queen);
  IS(g->pieceAt("e4", p), Empty);
  EXPECT_TRUE(p.color == Color::White && p.kind == Kind::Queen);  // untouched on a refusal
  for (const char* bad : {"", "e", "e44", "i1", "a0", "a9", "E4", "4e", "e 4"}) IS(g->pieceAt(bad, p), InvalidSquare);
}

TEST(Setup, MakeGameFromRefusesPositionsThatCannotExist) {
  EXPECT_TRUE(position("4k3/8/8/8/8/8/8/4K3") != nullptr);
  EXPECT_TRUE(position("8/8/8/8/8/8/8/4K3") == nullptr);            // no black king
  EXPECT_TRUE(position("4k3/8/8/8/8/8/8/8") == nullptr);            // no white king
  EXPECT_TRUE(position("4k2k/8/8/8/8/8/8/4K3") == nullptr);         // two black kings
  EXPECT_TRUE(position("4k3/8/8/8/8/8/8/3KK3") == nullptr);         // two white kings
  EXPECT_TRUE(position("P3k3/8/8/8/8/8/8/4K3") == nullptr);         // a pawn on the last rank
  EXPECT_TRUE(position("4k3/8/8/8/8/8/8/p3K3") == nullptr);         // a pawn on the first rank
  EXPECT_TRUE(position("4k3/8/8/8/8/8/8/4K2x") == nullptr);         // an unknown piece
  EXPECT_TRUE(position("4k3/8/8/8/8/8/8/4K") == nullptr);           // a short row
  EXPECT_TRUE(position("4k3/8/8/8/8/8/4K3") == nullptr);            // seven rows
  EXPECT_TRUE(position("4k3/8/8/8/4R3/8/8/4K3", Color::White) == nullptr);  // Black is in check and White is to move
  EXPECT_TRUE(position("4k3/8/8/8/4R3/8/8/4K3", Color::Black) != nullptr);  // the same position with Black to move
  EXPECT_TRUE(position("8/8/8/3kK3/8/8/8/8") == nullptr);           // adjacent kings attack each other
}

TEST(Pieces, TheKnightJumpsOverPiecesAndNeverCapturesItsOwn) {
  auto g = position("4k3/8/8/8/3N4/2PP4/2PPP3/4K3");
  EXPECT_EQ(movesOf(*g, "d4"), std::string("b3 b5 c6 e6 f3 f5"));
  auto start = chess::makeGame();
  EXPECT_EQ(movesOf(*start, "b1"), std::string("a3 c3"));
  EXPECT_EQ(movesOf(*start, "g1"), std::string("f3 h3"));
  auto corner = position("4k3/8/8/8/8/8/1p6/N3K3");
  EXPECT_EQ(movesOf(*corner, "a1"), std::string("b3 c2"));
}

TEST(Pieces, BishopRookAndQueenSlideUntilBlockedAndCaptureTheFirstEnemy) {
  auto g = position("4k3/8/2p5/8/4B3/8/2P5/R3K3");
  EXPECT_EQ(movesOf(*g, "e4"), std::string("c6 d3 d5 f3 f5 g2 g6 h1 h7"));
  EXPECT_EQ(movesOf(*g, "a1"), std::string("a2 a3 a4 a5 a6 a7 a8 b1 c1 d1"));
  auto q = position("4k3/8/8/3q4/8/8/3P4/4K3", Color::Black);
  EXPECT_EQ(movesOf(*q, "d5"), std::string("a2 a5 a8 b3 b5 b7 c4 c5 c6 d2 d3 d4 d6 d7 d8 e4 e5 e6 f3 f5 f7 g2 g5 g8 h1 h5"));
  auto start = chess::makeGame();
  EXPECT_EQ(movesOf(*start, "a1"), std::string(""));
  EXPECT_EQ(movesOf(*start, "c1"), std::string(""));
  EXPECT_EQ(movesOf(*start, "d1"), std::string(""));
}

TEST(Pieces, TheKingStepsOneSquareAndNotOntoASquareTheEnemyAttacks) {
  auto g = position("4k3/8/8/8/8/8/8/4K3");
  EXPECT_EQ(movesOf(*g, "e1"), std::string("d1 d2 e2 f1 f2"));
  auto rook = position("7k/8/8/8/8/8/r7/4K3");
  EXPECT_EQ(movesOf(*rook, "e1"), std::string("d1 f1"));
  auto kings = position("8/8/8/8/8/4k3/8/4K3");
  EXPECT_EQ(movesOf(*kings, "e1"), std::string("d1 f1"));  // the enemy king guards d2, e2 and f2
}

TEST(Pawns, PushOneOrTwoFromTheStartRankOnlyThroughEmptySquares) {
  auto start = chess::makeGame();
  EXPECT_EQ(movesOf(*start, "e2"), std::string("e3 e4"));
  EXPECT_EQ(movesOf(*position("4k3/8/8/8/8/4p3/4P3/4K3"), "e2"), std::string(""));
  EXPECT_EQ(movesOf(*position("4k3/8/8/8/4p3/8/4P3/4K3"), "e2"), std::string("e3"));
  EXPECT_EQ(movesOf(*position("4k3/8/8/8/8/4P3/8/4K3"), "e3"), std::string("e4"));
}

TEST(Pawns, CaptureDiagonallyForwardOnlyNeverStraightAndNeverAFriend) {
  EXPECT_EQ(movesOf(*position("4k3/8/8/3p1p2/4P3/8/8/4K3"), "e4"), std::string("d5 e5 f5"));
  EXPECT_EQ(movesOf(*position("4k3/8/8/4p3/4P3/8/8/4K3"), "e4"), std::string(""));
  EXPECT_EQ(movesOf(*position("4k3/8/8/3P4/4P3/8/8/4K3"), "e4"), std::string("e5"));
  auto g = position("4k3/8/8/8/4P3/8/8/4K3");
  IS(g->move("e4", "d5"), IllegalMove);  // a diagonal onto an empty square is not a capture
}

TEST(Pawns, BlackMovesDownTheBoard) {
  auto g = chess::makeGame();
  IS(g->move("e2", "e4"), Ok);
  EXPECT_EQ(movesOf(*g, "e7"), std::string("e5 e6"));
  EXPECT_EQ(movesOf(*position("4k3/8/8/8/3p4/2P1P3/8/4K3", Color::Black), "d4"), std::string("c3 d3 e3"));
  auto back = position("4k3/4p3/8/8/8/8/8/4K3", Color::Black);
  IS(back->move("e7", "e8"), IllegalMove);
}

TEST(Pawns, ReachingTheLastRankPromotesToTheChosenPieceOrAQueen) {
  const std::string setup = "7k/4P3/8/8/8/8/8/K7";
  auto plain = position(setup);
  EXPECT_EQ(movesOf(*plain, "e7"), std::string("e8"));
  IS(plain->move("e7", "e8"), Ok);
  EXPECT_EQ(letter(*plain, "e8"), 'Q');
  EXPECT_EQ(letter(*plain, "e7"), '.');
  const std::vector<std::pair<Kind, char>> choices = {{Kind::Rook, 'R'}, {Kind::Bishop, 'B'}, {Kind::Knight, 'N'}, {Kind::Queen, 'Q'}};
  for (const auto& choice : choices) {
    auto g = position(setup);
    IS(g->move("e7", "e8", choice.first), Ok);
    EXPECT_EQ(letter(*g, "e8"), choice.second);
  }
  auto capture = position("3r3k/4P3/8/8/8/8/8/K7");
  EXPECT_EQ(movesOf(*capture, "e7"), std::string("d8 e8"));
  IS(capture->move("e7", "d8", Kind::Bishop), Ok);
  EXPECT_EQ(placementOf(*capture), std::string("...B...k/......../......../......../......../......../......../K......."));
  auto black = position("7k/8/8/8/8/8/3p4/K7", Color::Black);
  IS(black->move("d2", "d1", Kind::Knight), Ok);
  EXPECT_EQ(letter(*black, "d1"), 'n');
}

TEST(Pawns, ABadPromotionPieceIsRefusedOnlyWhenThereIsAPromotion) {
  auto g = position("7k/4P3/8/8/8/8/8/K7");
  const std::string before = placementOf(*g);
  IS(g->move("e7", "e8", Kind::King), InvalidPromotion);
  IS(g->move("e7", "e8", Kind::Pawn), InvalidPromotion);
  IS(g->move("e7", "e6"), IllegalMove);  // a bad destination is refused as illegal, whatever the piece
  EXPECT_EQ(placementOf(*g), before);
  EXPECT_TRUE(g->turn() == Color::White);
  auto start = chess::makeGame();
  IS(start->move("e2", "e4", Kind::King), Ok);  // not a promotion: the piece is ignored
  IS(start->move("e7", "e5", Kind::Pawn), Ok);
}

TEST(Moves, TheCheckOrderOfTheMoveCall) {
  auto g = chess::makeGame();
  IS(g->move("z1", "a1"), InvalidSquare);
  IS(g->move("e5", "z9"), InvalidSquare);  // a bad square comes before an empty one
  IS(g->move("e4", "e5"), Empty);
  IS(g->move("e7", "e1"), NotYourTurn);    // not your turn comes before illegal
  IS(g->move("e2", "e5"), IllegalMove);
  IS(g->move("a1", "a2"), IllegalMove);    // the rook is blocked by its own pawn
  IS(g->move("e2", "e4", Kind::Queen), Ok);
  IS(g->move("e2", "e3"), Empty);
  IS(g->move("d2", "d4"), NotYourTurn);
}

TEST(Moves, TurnsAlternateAndRefusedMovesChangeNothing) {
  auto g = chess::makeGame();
  EXPECT_TRUE(g->turn() == Color::White);
  IS(g->move("g1", "f3"), Ok);
  EXPECT_TRUE(g->turn() == Color::Black);
  const std::string before = placementOf(*g);
  IS(g->move("f3", "e5"), NotYourTurn);
  IS(g->move("d7", "d3"), IllegalMove);
  IS(g->move("q1", "q2"), InvalidSquare);
  EXPECT_EQ(placementOf(*g), before);
  EXPECT_TRUE(g->turn() == Color::Black);
  IS(g->move("g8", "f6"), Ok);
  EXPECT_TRUE(g->turn() == Color::White);
  EXPECT_EQ(movesOf(*g, "a7"), std::string(""));  // the other side's piece has no moves to list
  EXPECT_EQ(movesOf(*g, "e4"), std::string(""));  // an empty square has none
  EXPECT_EQ(movesOf(*g, "z9"), std::string(""));
}

TEST(Moves, TheBasicGameHasNoCastlingAndNoEnPassant) {
  auto g = position("r3k2r/8/8/8/8/8/8/R3K2R");
  EXPECT_EQ(movesOf(*g, "e1"), std::string("d1 d2 e2 f1 f2"));
  IS(g->move("e1", "g1"), IllegalMove);
  IS(g->move("e1", "c1"), IllegalMove);
  auto line = chess::makeGame();
  EXPECT_TRUE(playAll(*line, "e2e4 a7a6 e4e5 d7d5"));
  EXPECT_EQ(movesOf(*line, "e5"), std::string("e6"));
  IS(line->move("e5", "d6"), IllegalMove);
}

TEST(Check, InCheckIsReportedForEachKindOfAttackerAndNotWhenBlocked) {
  const std::vector<std::string> checks = {
      "4k3/8/8/8/8/8/8/4R1K1",  // rook down the file
      "4k3/8/8/8/B7/8/8/6K1",   // bishop along a diagonal
      "4k3/8/5N2/8/8/8/8/6K1",  // knight
      "4k3/3P4/8/8/8/8/8/6K1",  // pawn
      "4k3/8/8/7Q/8/8/8/6K1",   // queen along a diagonal
  };
  for (const auto& placement : checks) {
    auto g = position(placement, Color::Black);
    ASSERT_TRUE(g != nullptr);
    EXPECT_TRUE(g->inCheck());
  }
  EXPECT_FALSE(position("4k3/4p3/8/8/8/8/8/4R1K1", Color::Black)->inCheck());  // a pawn blocks the rook
  auto white = position("4r1k1/8/8/8/8/8/8/4K3");
  EXPECT_TRUE(white->inCheck());
  EXPECT_TRUE(white->outcome() == Outcome::Ongoing);
}

TEST(Check, APawnAttacksDiagonallyNotTheSquareItPushesTo) {
  auto g = position("4k3/4P3/8/8/8/8/8/6K1", Color::Black);
  EXPECT_FALSE(g->inCheck());
  EXPECT_EQ(movesOf(*g, "e8"), std::string("d7 e7 f7"));  // d8 and f8 are attacked by the pawn
}

TEST(Check, AMoveThatLeavesYourKingAttackedIsIllegal) {
  auto pinnedBishop = position("k3r3/8/8/8/8/8/4B3/4K3");
  EXPECT_EQ(movesOf(*pinnedBishop, "e2"), std::string(""));
  IS(pinnedBishop->move("e2", "d3"), IllegalMove);
  auto pinnedRook = position("k3r3/8/8/8/8/8/4R3/4K3");
  EXPECT_EQ(movesOf(*pinnedRook, "e2"), std::string("e3 e4 e5 e6 e7 e8"));  // along the pin, capturing the pinner
  auto pinnedKnight = position("k3r3/8/8/8/8/8/4N3/4K3");
  EXPECT_EQ(movesOf(*pinnedKnight, "e2"), std::string(""));  // a pinned knight cannot move at all
}

TEST(Check, WhileInCheckTheMoveMustBlockCaptureOrRun) {
  auto g = position("4r2k/8/8/8/8/8/3B4/R3K3");
  EXPECT_TRUE(g->inCheck());
  EXPECT_EQ(movesOf(*g, "e1"), std::string("d1 f1 f2"));
  EXPECT_EQ(movesOf(*g, "d2"), std::string("e3"));
  EXPECT_EQ(movesOf(*g, "a1"), std::string(""));
  IS(g->move("a1", "a2"), IllegalMove);
  IS(g->move("d2", "e3"), Ok);
  EXPECT_FALSE(g->inCheck());
}

TEST(Check, InDoubleCheckOnlyTheKingCanMove) {
  auto g = position("4r2k/8/8/8/Qb6/8/8/4K3");
  EXPECT_TRUE(g->inCheck());
  EXPECT_EQ(movesOf(*g, "a4"), std::string(""));  // the queen could take either checker, but not both
  EXPECT_EQ(movesOf(*g, "e1"), std::string("d1 f1 f2"));
}

TEST(Check, AKingCannotRetreatAlongTheLineOfTheCheckingSlider) {
  auto g = position("7k/8/8/8/8/8/8/r3K3");
  EXPECT_TRUE(g->inCheck());
  EXPECT_EQ(movesOf(*g, "e1"), std::string("d2 e2 f2"));  // f1 is still on the rook's line once the king has left e1
}

TEST(Outcome, FoolsMateIsCheckmateAndNothingMoreCanBePlayed) {
  auto g = chess::makeGame();
  EXPECT_TRUE(playAll(*g, "f2f3 e7e5 g2g4 d8h4"));
  EXPECT_TRUE(g->inCheck());
  EXPECT_TRUE(g->outcome() == Outcome::Checkmate);
  EXPECT_EQ(movesOf(*g, "e1"), std::string(""));
  EXPECT_EQ(movesOf(*g, "g1"), std::string(""));
  IS(g->move("e2", "e3"), GameOver);
  IS(g->move("z1", "z2"), GameOver);  // GameOver is checked first
}

TEST(Outcome, CheckIsNotMateWhenThereIsAnAnswer) {
  auto g = chess::makeGame();
  EXPECT_TRUE(playAll(*g, "e2e4 f7f6 d1h5"));
  EXPECT_TRUE(g->inCheck());
  EXPECT_TRUE(g->outcome() == Outcome::Ongoing);
  EXPECT_EQ(movesOf(*g, "g7"), std::string("g6"));
  EXPECT_EQ(movesOf(*g, "e8"), std::string(""));
  IS(g->move("g7", "g6"), Ok);
  EXPECT_FALSE(g->inCheck());
}

TEST(Outcome, StalemateIsADrawNotACheckmate) {
  auto g = position("7k/5Q2/6K1/8/8/8/8/8", Color::Black);
  EXPECT_FALSE(g->inCheck());
  EXPECT_TRUE(g->outcome() == Outcome::Stalemate);
  EXPECT_EQ(movesOf(*g, "h8"), std::string(""));
  IS(g->move("h8", "g8"), GameOver);
}

TEST(Outcome, BackRankAndSmotheredMatesAreRecognised) {
  auto back = position("6k1/5ppp/8/8/8/8/8/R3K3");
  IS(back->move("a1", "a8"), Ok);
  EXPECT_TRUE(back->outcome() == Outcome::Checkmate);
  auto smothered = position("6rk/6pp/8/6N1/8/8/8/K7");
  IS(smothered->move("g5", "f7"), Ok);
  EXPECT_TRUE(smothered->inCheck());
  EXPECT_TRUE(smothered->outcome() == Outcome::Checkmate);
  auto over = position("R5k1/5ppp/8/8/8/8/8/4K3", Color::Black);
  EXPECT_TRUE(over != nullptr);
  EXPECT_TRUE(over->outcome() == Outcome::Checkmate);
  IS(over->move("g8", "h8"), GameOver);
}

TEST(Perft, EveryLegalMoveIsFoundFromTheStartingPositionToDepthFour) {
  auto g = chess::makeGame();
  EXPECT_EQ(countMoves(*g), 20LL);
  EXPECT_EQ(perft(*g, 2), 400LL);
  EXPECT_EQ(perft(*g, 3), 8902LL);
  EXPECT_EQ(perft(*g, 4), 197281LL);
}

TEST(Perft, PinsAndChecksInARookEndgameAndTheBasicRulesOnABusyMiddlegame) {
  auto endgame = position("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8");
  EXPECT_EQ(perft(*endgame, 1), 14LL);
  EXPECT_EQ(perft(*endgame, 2), 191LL);
  // 48 moves with castling, 46 without it.
  auto busy = position("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R");
  EXPECT_EQ(perft(*busy, 1), 46LL);
}
