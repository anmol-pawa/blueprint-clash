#include <algorithm>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include "api_storm2.h"
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

std::unique_ptr<chess::UndoGame> position(const std::string& placement, Color toMove = Color::White) {
  return chess::makeUndoGameFrom(rowsOf(placement), toMove);
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


// Everything an observer can see: if two games have the same signature they behave the same from here on.
std::string signature(const chess::Game& g) {
  std::string out = placementOf(g) + (g.turn() == Color::White ? " w " : " b ");
  out += std::to_string(static_cast<int>(g.outcome())) + (g.inCheck() ? "+" : "-");
  for (char file = 'a'; file <= 'h'; ++file) {
    for (char rank = '1'; rank <= '8'; ++rank) {
      const std::string from{file, rank};
      const std::string moves = movesOf(g, from);
      if (!moves.empty()) out += " " + from + ":" + moves;
    }
  }
  return out;
}

long long perft(chess::UndoGame& g, int depth) {
  if (depth == 1) return countMoves(g);
  long long total = 0;
  for (char file = 'a'; file <= 'h'; ++file) {
    for (char rank = '1'; rank <= '8'; ++rank) {
      const std::string from{file, rank};
      const char c = letter(g, from);
      for (const auto& to : g.legalMoves(from)) {
        const bool promotion = (c == 'P' || c == 'p') && (to[1] == '8' || to[1] == '1');
        for (Kind k : {Kind::Queen, Kind::Rook, Kind::Bishop, Kind::Knight}) {
          if (g.move(from, to, k) != Status::Ok) return -1000000;
          total += perft(g, depth - 1);
          if (g.undo() != Status::Ok) return -1000000;
          if (!promotion) break;
        }
      }
    }
  }
  return total;
}

// Plays `plies` pseudo-random legal moves (a fixed seed gives a fixed game), then takes them all back one by one.
bool walkAndUndo(const std::string& placement, Color toMove, std::uint64_t seed, int plies) {
  auto g = position(placement, toMove);
  if (!g) return false;
  std::vector<std::string> seen{signature(*g)};
  std::uint64_t state = seed;
  for (int ply = 0; ply < plies && g->outcome() == Outcome::Ongoing; ++ply) {
    std::vector<std::pair<std::string, std::string>> options;
    for (char file = 'a'; file <= 'h'; ++file) {
      for (char rank = '1'; rank <= '8'; ++rank) {
        const std::string from{file, rank};
        for (const auto& to : g->legalMoves(from)) options.emplace_back(from, to);
      }
    }
    state = state * 6364136223846793005ULL + 1442695040888963407ULL;
    const auto& pick = options[static_cast<std::size_t>(state >> 33) % options.size()];
    const Kind promote = (state >> 20) % 3 == 0 ? Kind::Knight : Kind::Queen;
    if (g->move(pick.first, pick.second, promote) != Status::Ok) return false;
    seen.push_back(signature(*g));
  }
  if (g->moveCount() != seen.size() - 1) return false;
  for (std::size_t back = seen.size() - 1; back > 0; --back) {
    if (g->undo() != Status::Ok) return false;
    if (signature(*g) != seen[back - 1]) return false;
  }
  return g->undo() == Status::NothingToUndo && g->moveCount() == 0;
}
}  // namespace

const char* const kBothSides = "r3k2r/8/8/8/8/8/8/R3K2R";
const char* const kKiwipete = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R";
const char* const kPositionFour = "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1";
const char* const kStart = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

TEST(Undo, TakesBackAMoveAndGivesTheTurnBack) {
  auto g = chess::makeUndoGame();
  IS(g->undo(), NothingToUndo);
  EXPECT_EQ(g->moveCount(), std::size_t{0});
  const std::string start = signature(*g);
  IS(g->move("e2", "e4"), Ok);
  EXPECT_EQ(g->moveCount(), std::size_t{1});
  EXPECT_TRUE(g->turn() == Color::Black);
  IS(g->undo(), Ok);
  EXPECT_EQ(signature(*g), start);
  EXPECT_TRUE(g->turn() == Color::White);
  EXPECT_EQ(g->moveCount(), std::size_t{0});
  IS(g->undo(), NothingToUndo);
  IS(g->move("e2", "e4"), Ok);  // and the same move can be played again
}

TEST(Undo, BringsBackACapturedPieceAndEveryoneElseStaysPut) {
  auto g = chess::makeUndoGame();
  EXPECT_TRUE(playAll(*g, "e2e4 d7d5"));
  const std::string before = signature(*g);
  IS(g->move("e4", "d5"), Ok);
  EXPECT_EQ(letter(*g, "d5"), 'P');
  IS(g->undo(), Ok);
  EXPECT_EQ(letter(*g, "d5"), 'p');
  EXPECT_EQ(letter(*g, "e4"), 'P');
  EXPECT_EQ(signature(*g), before);
  EXPECT_EQ(g->moveCount(), std::size_t{2});
}

TEST(Undo, ThePositionAGameStartedFromIsTheBottomOfTheHistory) {
  auto g = position("4k3/8/8/8/8/8/4P3/4K3");
  IS(g->undo(), NothingToUndo);
  EXPECT_EQ(g->moveCount(), std::size_t{0});
  IS(g->move("e2", "e4"), Ok);
  IS(g->undo(), Ok);
  IS(g->undo(), NothingToUndo);
  EXPECT_EQ(placementOf(*g), std::string("....k.../......../......../......../......../......../....P.../....K..."));
}

TEST(Undo, RefusedMovesLeaveNoTraceInTheHistory) {
  auto g = chess::makeUndoGame();
  IS(g->move("e2", "e4"), Ok);
  IS(g->move("e2", "e4"), Empty);
  IS(g->move("e7", "e3"), IllegalMove);
  IS(g->move("a1", "a2"), NotYourTurn);
  EXPECT_EQ(g->moveCount(), std::size_t{1});
  IS(g->undo(), Ok);  // takes back e2e4, not a refused call
  EXPECT_EQ(placementOf(*g), std::string(kStart).empty() ? "" : placementOf(*chess::makeUndoGame()));
  IS(g->undo(), NothingToUndo);
}

TEST(Undo, PromotionAndEnPassantAreTakenBack) {
  auto promo = position("7k/4P3/8/8/8/8/8/K7");
  const std::string before = signature(*promo);
  IS(promo->move("e7", "e8", Kind::Knight), Ok);
  EXPECT_EQ(letter(*promo, "e8"), 'N');
  IS(promo->undo(), Ok);
  EXPECT_EQ(letter(*promo, "e7"), 'P');
  EXPECT_EQ(letter(*promo, "e8"), '.');
  EXPECT_EQ(signature(*promo), before);
  auto ep = chess::makeUndoGame();
  EXPECT_TRUE(playAll(*ep, "e2e4 a7a6 e4e5 d7d5"));
  const std::string chance = signature(*ep);
  IS(ep->move("e5", "d6"), Ok);
  EXPECT_EQ(letter(*ep, "d5"), '.');
  IS(ep->undo(), Ok);
  EXPECT_EQ(letter(*ep, "d5"), 'p');
  EXPECT_EQ(letter(*ep, "d6"), '.');
  EXPECT_EQ(letter(*ep, "e5"), 'P');
  EXPECT_EQ(signature(*ep), chance);
  EXPECT_EQ(movesOf(*ep, "e5"), std::string("d6 e6"));  // the chance is back as well
}

TEST(Undo, CastlingComesBackWithItsRookAndItsRight) {
  auto g = position(kBothSides);
  const std::string before = signature(*g);
  IS(g->move("e1", "g1"), Ok);
  IS(g->undo(), Ok);
  EXPECT_EQ(signature(*g), before);
  EXPECT_EQ(movesOf(*g, "e1"), std::string("c1 d1 d2 e2 f1 f2 g1"));
  IS(g->move("e1", "c1"), Ok);
  IS(g->undo(), Ok);
  EXPECT_EQ(signature(*g), before);
  // A rook move and a king move take the right away; taking them back gives it back.
  EXPECT_TRUE(playAll(*g, "h1g1 a8b8"));
  EXPECT_EQ(movesOf(*g, "e1"), std::string("c1 d1 d2 e2 f1 f2"));
  IS(g->undo(), Ok);
  IS(g->undo(), Ok);
  EXPECT_EQ(signature(*g), before);
  EXPECT_TRUE(playAll(*g, "e1e2 a8b8"));
  IS(g->undo(), Ok);
  IS(g->undo(), Ok);
  EXPECT_EQ(movesOf(*g, "e1"), std::string("c1 d1 d2 e2 f1 f2 g1"));
}

TEST(Undo, ACapturedRookTakesItsCastlingRightWithItAndUndoReturnsIt) {
  auto g = position("4k3/pb6/8/8/8/7R/P7/4K2R");
  EXPECT_TRUE(playAll(*g, "a2a3 b7h1"));
  EXPECT_EQ(movesOf(*g, "e1"), std::string("d1 d2 e2 f1 f2"));
  IS(g->undo(), Ok);
  EXPECT_EQ(letter(*g, "h1"), 'R');
  IS(g->undo(), Ok);
  EXPECT_EQ(movesOf(*g, "e1"), std::string("d1 d2 e2 f1 f2 g1"));
}

TEST(Undo, TheEnPassantChanceIsRestoredWhenTheMoveThatEndedItIsTakenBack) {
  auto g = position("4k3/8/8/8/3p4/8/4P3/4K3");
  IS(g->move("e2", "e4"), Ok);
  EXPECT_EQ(movesOf(*g, "d4"), std::string("d3 e3"));
  EXPECT_TRUE(playAll(*g, "e8d8 e1d1"));  // the chance is gone after one move each
  EXPECT_EQ(movesOf(*g, "d4"), std::string("d3"));
  IS(g->undo(), Ok);
  IS(g->undo(), Ok);                      // back to the position right after the double advance
  EXPECT_EQ(movesOf(*g, "d4"), std::string("d3 e3"));
  IS(g->move("d4", "e3"), Ok);
  EXPECT_EQ(letter(*g, "e4"), '.');
  EXPECT_EQ(letter(*g, "e3"), 'p');
}

TEST(Undo, ACheckmateCanBeTakenBackAndTheGameGoesOn) {
  auto g = chess::makeUndoGame();
  EXPECT_TRUE(playAll(*g, "f2f3 e7e5 g2g4 d8h4"));
  EXPECT_TRUE(g->outcome() == Outcome::Checkmate);
  IS(g->undo(), Ok);
  EXPECT_TRUE(g->outcome() == Outcome::Ongoing);
  EXPECT_FALSE(g->inCheck());
  EXPECT_TRUE(g->turn() == Color::Black);
  IS(g->move("d8", "e7"), Ok);
  auto draw = position("7k/5Q2/8/6K1/8/8/8/8");
  IS(draw->move("g5", "g6"), Ok);
  EXPECT_TRUE(draw->outcome() == Outcome::Stalemate);
  IS(draw->move("h8", "g8"), GameOver);
  IS(draw->undo(), Ok);
  EXPECT_TRUE(draw->outcome() == Outcome::Ongoing);
}

TEST(Undo, LongRandomGamesCanBeTakenBackStepByStepThroughEveryPosition) {
  for (std::uint64_t seed = 1; seed <= 4; ++seed) {
    EXPECT_TRUE(walkAndUndo(kStart, Color::White, seed, 120));
    EXPECT_TRUE(walkAndUndo(kKiwipete, Color::White, seed * 7, 120));
    EXPECT_TRUE(walkAndUndo(kPositionFour, Color::White, seed * 13, 120));
    EXPECT_TRUE(walkAndUndo(kBothSides, Color::Black, seed * 29, 120));
  }
}

TEST(Perft, TheSameCountsAsEverWhenEveryMoveIsPlayedAndTakenBack) {
  auto kiwi = position(kKiwipete);
  EXPECT_EQ(perft(*kiwi, 3), 97862LL);
  EXPECT_EQ(kiwi->moveCount(), std::size_t{0});
  auto four = position(kPositionFour);
  EXPECT_EQ(perft(*four, 3), 9467LL);
  auto rook = position("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8");
  EXPECT_EQ(perft(*rook, 4), 43238LL);
  auto five = position("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R");
  EXPECT_EQ(perft(*five, 3), 62379LL);
}
