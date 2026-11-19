#include <algorithm>
#include <memory>
#include <string>
#include <vector>

#include "api_storm1.h"
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
  return chess::makeFullGameFrom(rowsOf(placement), toMove);
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


struct Step {
  std::string from;
  std::string to;
  Kind promote;
};

// A full game has hidden state (castling rights, the en passant chance), so a position is rebuilt by replaying its moves.
std::unique_ptr<chess::Game> replay(const std::string& placement, Color toMove, const std::vector<Step>& path) {
  auto g = position(placement, toMove);
  for (const Step& s : path) {
    if (!g || g->move(s.from, s.to, s.promote) != Status::Ok) return nullptr;
  }
  return g;
}

long long perft(const std::string& placement, Color toMove, std::vector<Step>& path, int depth) {
  auto g = replay(placement, toMove, path);
  if (!g) return -1000000;
  if (depth == 1) return countMoves(*g);
  long long total = 0;
  for (char file = 'a'; file <= 'h'; ++file) {
    for (char rank = '1'; rank <= '8'; ++rank) {
      const std::string from{file, rank};
      const char c = letter(*g, from);
      for (const auto& to : g->legalMoves(from)) {
        const bool promotion = (c == 'P' || c == 'p') && (to[1] == '8' || to[1] == '1');
        for (Kind k : {Kind::Queen, Kind::Rook, Kind::Bishop, Kind::Knight}) {
          path.push_back(Step{from, to, k});
          total += perft(placement, toMove, path, depth - 1);
          path.pop_back();
          if (!promotion) break;
        }
      }
    }
  }
  return total;
}

long long perft(const std::string& placement, int depth, Color toMove = Color::White) {
  std::vector<Step> path;
  return perft(placement, toMove, path, depth);
}
}  // namespace

const char* const kBothSides = "r3k2r/8/8/8/8/8/8/R3K2R";
const char* const kKiwipete = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R";
const char* const kPositionFour = "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1";

TEST(Castling, TheKingHopsTwoSquaresAndTheRookJumpsOverIt) {
  auto g = position(kBothSides);
  EXPECT_EQ(movesOf(*g, "e1"), std::string("c1 d1 d2 e2 f1 f2 g1"));
  IS(g->move("e1", "g1"), Ok);
  EXPECT_EQ(placementOf(*g), std::string("r...k..r/......../......../......../......../......../......../R....RK."));
  EXPECT_EQ(movesOf(*g, "e8"), std::string("c8 d7 d8 e7"));
  IS(g->move("e8", "c8"), Ok);
  EXPECT_EQ(placementOf(*g), std::string("..kr...r/......../......../......../......../......../......../R....RK."));
  auto longSide = position(kBothSides);
  IS(longSide->move("e1", "c1"), Ok);
  EXPECT_EQ(placementOf(*longSide), std::string("r...k..r/......../......../......../......../......../......../..KR...R"));
  auto black = position("r3k2r/8/8/8/8/8/8/4K3", Color::Black);
  IS(black->move("e8", "g8"), Ok);
  EXPECT_EQ(placementOf(*black), std::string("r....rk./......../......../......../......../......../......../....K..."));
}

TEST(Castling, EverySquareBetweenTheKingAndTheRookMustBeEmpty) {
  auto both = position("r3k2r/8/8/8/8/8/8/RN2K1NR");
  EXPECT_EQ(movesOf(*both, "e1"), std::string("d1 d2 e2 f1 f2"));
  auto enemyKnight = position("4k3/8/8/8/8/8/8/Rn2K2R");  // an enemy piece on b1 blocks too, though it attacks d2 and c3
  EXPECT_EQ(movesOf(*enemyKnight, "e1"), std::string("d1 e2 f1 f2 g1"));
}

TEST(Castling, NeverOutOfCheck) {
  auto g = position("6k1/8/8/8/8/8/4r3/R3K2R");
  EXPECT_TRUE(g->inCheck());
  EXPECT_EQ(movesOf(*g, "e1"), std::string("d1 e2 f1"));
  IS(g->move("e1", "g1"), IllegalMove);
}

TEST(Castling, NeverThroughAnAttackedSquare) {
  auto shortSide = position("2k2r2/8/8/8/8/8/8/R3K2R");  // f1 is attacked: the short castle crosses it
  EXPECT_EQ(movesOf(*shortSide, "e1"), std::string("c1 d1 d2 e2"));
  auto longSide = position("1k1r4/8/8/8/8/8/8/R3K2R");   // d1 is attacked: the long castle crosses it
  EXPECT_EQ(movesOf(*longSide, "e1"), std::string("e2 f1 f2 g1"));
}

TEST(Castling, NeverIntoCheck) {
  auto g = position("2k3r1/8/8/8/8/8/8/R3K2R");
  EXPECT_EQ(movesOf(*g, "e1"), std::string("c1 d1 d2 e2 f1 f2"));
  IS(g->move("e1", "g1"), IllegalMove);
}

TEST(Castling, TheRookAndTheSquareBesideItMayBeAttacked) {
  auto b1 = position("1r1k4/8/8/8/8/8/8/R3K2R");  // b1 is attacked, and only has to be empty
  EXPECT_EQ(movesOf(*b1, "e1"), std::string("c1 d1 d2 e2 f1 f2 g1"));
  auto corner = position("r5k1/8/8/8/8/8/8/R3K2R");  // the rook on a1 is attacked
  EXPECT_EQ(movesOf(*corner, "e1"), std::string("c1 d1 d2 e2 f1 f2 g1"));
  IS(corner->move("e1", "c1"), Ok);
  EXPECT_EQ(letter(*corner, "d1"), 'R');
}

TEST(Castling, TheRightIsLostWhenTheKingOrARookMovesEvenIfItComesBack) {
  auto rook = position(kBothSides);
  EXPECT_TRUE(playAll(*rook, "h1g1 a8b8 g1h1 b8a8"));
  EXPECT_EQ(movesOf(*rook, "e1"), std::string("c1 d1 d2 e2 f1 f2"));  // the long side is still allowed
  auto king = position(kBothSides);
  EXPECT_TRUE(playAll(*king, "e1e2 a8b8 e2e1 b8a8"));
  EXPECT_EQ(movesOf(*king, "e1"), std::string("d1 d2 e2 f1 f2"));
  IS(king->move("e1", "g1"), IllegalMove);
}

TEST(Castling, TheRightIsLostWhenTheRookIsCapturedOnItsCorner) {
  auto g = position("4k3/pb6/8/8/8/7R/P7/4K2R");
  EXPECT_TRUE(playAll(*g, "a2a3 b7h1 h3h1 a7a6"));  // the white rook that stands on h1 now is not the one that never moved
  EXPECT_EQ(letter(*g, "h1"), 'R');
  EXPECT_EQ(movesOf(*g, "e1"), std::string("d1 d2 e2 f1 f2"));
  IS(g->move("e1", "g1"), IllegalMove);
}

TEST(Castling, TheRightsAtSetupComeFromTheHomeSquares) {
  auto one = position("4k3/8/8/8/8/8/8/R3K3");
  EXPECT_EQ(movesOf(*one, "e1"), std::string("c1 d1 d2 e2 f1 f2"));
  auto offHome = position("4k3/8/8/8/8/8/8/R2K3R");  // the king is on d1: it counts as having moved
  EXPECT_EQ(movesOf(*offHome, "d1"), std::string("c1 c2 d2 e1 e2"));
  auto enemyRook = position("3rk3/8/8/8/8/8/8/R3K3", Color::Black);
  EXPECT_EQ(movesOf(*enemyRook, "e8"), std::string("d7 e7 f7 f8"));  // a rook of the other colour is not a castling partner
}

TEST(EnPassant, CaptureOnTheNextMoveRemovesThePassedPawn) {
  auto g = chess::makeFullGame();
  EXPECT_TRUE(playAll(*g, "e2e4 a7a6 e4e5 d7d5"));
  EXPECT_EQ(movesOf(*g, "e5"), std::string("d6 e6"));
  IS(g->move("e5", "d6"), Ok);
  EXPECT_EQ(letter(*g, "d6"), 'P');
  EXPECT_EQ(letter(*g, "d5"), '.');  // the pawn that was passed is gone, not the square the capturer landed on
  EXPECT_EQ(letter(*g, "e5"), '.');
  auto black = chess::makeFullGame();
  EXPECT_TRUE(playAll(*black, "a2a3 e7e5 a3a4 e5e4 d2d4"));
  EXPECT_EQ(movesOf(*black, "e4"), std::string("d3 e3"));
  IS(black->move("e4", "d3"), Ok);
  EXPECT_EQ(letter(*black, "d3"), 'p');
  EXPECT_EQ(letter(*black, "d4"), '.');
}

TEST(EnPassant, OnlyOnTheVeryNextMove) {
  auto g = chess::makeFullGame();
  EXPECT_TRUE(playAll(*g, "e2e4 a7a6 e4e5 d7d5 h2h3 a6a5"));
  EXPECT_EQ(movesOf(*g, "e5"), std::string("e6"));
  IS(g->move("e5", "d6"), IllegalMove);
}

TEST(EnPassant, NeedsATwoSquareAdvanceNotTwoSingleSteps) {
  auto g = chess::makeFullGame();
  EXPECT_TRUE(playAll(*g, "e2e4 a7a6 e4e5 d7d6 a2a3 d6d5"));
  EXPECT_EQ(movesOf(*g, "e5"), std::string("e6"));
}

TEST(EnPassant, OnlyAPawnBesideTheLandingSquareMayCapture) {
  auto far = position("4k3/2p5/8/8/4P3/8/8/4K3", Color::Black);
  IS(far->move("c7", "c5"), Ok);
  EXPECT_EQ(movesOf(*far, "e4"), std::string("e5"));
  auto behind = position("4k3/4p3/8/8/3P4/8/8/4K3", Color::Black);
  IS(behind->move("e7", "e5"), Ok);
  EXPECT_EQ(movesOf(*behind, "d4"), std::string("d5 e5"));  // e5 is an ordinary capture; e6 is not reachable from d4
}

TEST(EnPassant, OnlyAPawnMayCaptureEnPassant) {
  auto g = position("7k/3p4/8/4R3/8/8/8/4K3", Color::Black);
  IS(g->move("d7", "d5"), Ok);
  EXPECT_EQ(movesOf(*g, "e5"), std::string("d5 e2 e3 e4 e6 e7 e8 f5 g5 h5"));  // a rook beside the pawn does not get d6
  IS(g->move("e5", "d6"), IllegalMove);
}

TEST(EnPassant, TheCaptureMayNotExposeTheKingAlongTheRank) {
  auto g = position("7k/2p5/8/KP5r/8/8/8/8", Color::Black);
  IS(g->move("c7", "c5"), Ok);
  EXPECT_EQ(movesOf(*g, "b5"), std::string("b6"));  // b5xc6 would clear the fifth rank between the king and the rook
  IS(g->move("b5", "c6"), IllegalMove);
}

TEST(EnPassant, CanAnswerACheckByRemovingThePawnThatGivesIt) {
  auto g = position("4k3/3p4/8/4P3/4K3/8/8/8", Color::Black);
  IS(g->move("d7", "d5"), Ok);
  EXPECT_TRUE(g->inCheck());
  EXPECT_EQ(movesOf(*g, "e5"), std::string("d6"));  // the only pawn move that answers the check
  IS(g->move("e5", "d6"), Ok);
  EXPECT_FALSE(g->inCheck());
}

TEST(Rules, TheBasicRulesStillHoldInTheFullGame) {
  auto start = chess::makeFullGame();
  EXPECT_EQ(countMoves(*start), 20LL);
  EXPECT_EQ(movesOf(*start, "e1"), std::string(""));
  EXPECT_TRUE(playAll(*start, "f2f3 e7e5 g2g4 d8h4"));
  EXPECT_TRUE(start->outcome() == Outcome::Checkmate);
  IS(start->move("e2", "e3"), GameOver);
  auto promo = position("7k/4P3/8/8/8/8/8/K7");
  IS(promo->move("e7", "e8", Kind::King), InvalidPromotion);
  IS(promo->move("e7", "e8", Kind::Rook), Ok);
  EXPECT_EQ(letter(*promo, "e8"), 'R');
}

TEST(Perft, EveryRuleTogetherInAPositionBuiltToBreakMoveGenerators) {
  EXPECT_EQ(perft(kKiwipete, 1), 48LL);
  EXPECT_EQ(perft(kKiwipete, 2), 2039LL);
  EXPECT_EQ(perft(kKiwipete, 3), 97862LL);
}

TEST(Perft, EnPassantPinsAndChecksInARookEndgame) {
  EXPECT_EQ(perft("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8", 3), 2812LL);  // two en passant captures at this depth
  EXPECT_EQ(perft("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8", 4), 43238LL);
}

TEST(Perft, PromotionsCapturesIntoPromotionsAndCastlingForOnlyOneSide) {
  EXPECT_EQ(perft(kPositionFour, 1), 6LL);
  EXPECT_EQ(perft(kPositionFour, 2), 264LL);
  EXPECT_EQ(perft(kPositionFour, 3), 9467LL);
}
