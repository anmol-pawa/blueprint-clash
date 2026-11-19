#include <algorithm>
#include <array>
#include <cctype>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api_storm2.h"






// A square of the board: file 0..7 is a..h, rank 0..7 is 1..8. A default Square is "nowhere".
class Square {
 public:
  Square() = default;
  Square(int file, int rank) : file_(file), rank_(rank) {}

  int file() const { return file_; }
  int rank() const { return rank_; }
  bool valid() const { return file_ >= 0 && file_ < 8 && rank_ >= 0 && rank_ < 8; }
  int index() const { return rank_ * 8 + file_; }
  Square offset(int fileStep, int rankStep) const { return Square(file_ + fileStep, rank_ + rankStep); }
  std::string name() const { return std::string{static_cast<char>('a' + file_), static_cast<char>('1' + rank_)}; }

  bool operator==(const Square& other) const { return file_ == other.file_ && rank_ == other.rank_; }
  bool operator!=(const Square& other) const { return !(*this == other); }

  // "e4" gives a Square; anything else (wrong length, wrong characters, upper case) gives nowhere.
  static Square parse(const std::string& text) {
    if (text.size() != 2 || text[0] < 'a' || text[0] > 'h' || text[1] < '1' || text[1] > '8') return Square();
    return Square(text[0] - 'a', text[1] - '1');
  }

 private:
  int file_ = -1;
  int rank_ = -1;
};


// Which piece stands where. A plain value: copying it is how a trial move is tried.
class Board {
 public:
  bool occupied(Square square) const { return cells_[square.index()].present; }
  chess::Piece at(Square square) const { return cells_[square.index()].piece; }
  void place(Square square, chess::Piece piece) { cells_[square.index()] = Cell{true, piece}; }
  void clear(Square square) { cells_[square.index()] = Cell{}; }

  bool holds(Square square, chess::Color color, chess::Kind kind) const {
    return occupied(square) && at(square).color == color && at(square).kind == kind;
  }

  std::vector<Square> squaresOf(chess::Color color) const {
    std::vector<Square> found;
    for (int rank = 0; rank < 8; ++rank) {
      for (int file = 0; file < 8; ++file) {
        const Square square(file, rank);
        if (occupied(square) && at(square).color == color) found.push_back(square);
      }
    }
    return found;
  }

  bool findKing(chess::Color color, Square& out) const {
    for (const Square& square : squaresOf(color)) {
      if (at(square).kind == chess::Kind::King) {
        out = square;
        return true;
      }
    }
    return false;
  }

 private:
  struct Cell {
    bool present = false;
    chess::Piece piece{chess::Color::White, chess::Kind::Pawn};
  };

  std::array<Cell, 64> cells_{};
};


// Everything that depends on which side a piece belongs to, in one place.
inline chess::Color opposite(chess::Color color) { return color == chess::Color::White ? chess::Color::Black : chess::Color::White; }
inline int forwardStep(chess::Color color) { return color == chess::Color::White ? 1 : -1; }
inline int homeRank(chess::Color color) { return color == chess::Color::White ? 0 : 7; }
inline int pawnRank(chess::Color color) { return color == chess::Color::White ? 1 : 6; }
inline int lastRank(chess::Color color) { return color == chess::Color::White ? 7 : 0; }
inline int sideIndex(chess::Color color) { return static_cast<int>(color); }


enum class MoveKind { Normal, DoublePush, Castle, EnPassant };

// One move: where from, where to, and what a pawn becomes on the last rank. Kind::Pawn in promoteTo means "no promotion".
struct Move {
  Square from;
  Square to;
  chess::Kind promoteTo = chess::Kind::Pawn;
  MoveKind kind = MoveKind::Normal;
};

inline bool promotes(const Move& move) { return move.promoteTo != chess::Kind::Pawn; }


// How one kind of piece moves (Strategy). A rule is stateless: it looks at the board and the square it is asked about.
class PieceRules {
 public:
  virtual ~PieceRules() = default;
  // The squares this piece attacks: where it could capture. The first piece on a line counts, whichever colour it is.
  virtual void attacks(const Board& board, Square from, chess::Color color, std::vector<Square>& out) const = 0;
  // The moves the piece may make by its own movement rules alone (its king's safety is somebody else's question).
  virtual void moves(const Board& board, Square from, chess::Color color, std::vector<Move>& out) const = 0;
};

// A piece that may move to every square it attacks except those held by a friend: knight, bishop, rook, queen, king.
class ReachRule : public PieceRules {
 public:
  void moves(const Board& board, Square from, chess::Color color, std::vector<Move>& out) const override {
    std::vector<Square> reach;
    attacks(board, from, color, reach);
    for (const Square& to : reach) {
      if (!board.occupied(to) || board.at(to).color != color) out.push_back(Move{from, to});
    }
  }
};

using Steps = std::vector<std::pair<int, int>>;

// Jumps by a fixed list of offsets: knight and king.
class StepRule : public ReachRule {
 public:
  explicit StepRule(Steps steps) : steps_(std::move(steps)) {}

  void attacks(const Board&, Square from, chess::Color, std::vector<Square>& out) const override {
    for (const auto& step : steps_) {
      const Square to = from.offset(step.first, step.second);
      if (to.valid()) out.push_back(to);
    }
  }

 private:
  Steps steps_;
};

// Slides along its directions until the first piece: bishop, rook, queen.
class SlideRule : public ReachRule {
 public:
  explicit SlideRule(Steps directions) : directions_(std::move(directions)) {}

  void attacks(const Board& board, Square from, chess::Color, std::vector<Square>& out) const override {
    for (const auto& direction : directions_) {
      Square to = from.offset(direction.first, direction.second);
      while (to.valid()) {
        out.push_back(to);
        if (board.occupied(to)) break;
        to = to.offset(direction.first, direction.second);
      }
    }
  }

 private:
  Steps directions_;
};

class PawnRule : public PieceRules {
 public:
  void attacks(const Board&, Square from, chess::Color color, std::vector<Square>& out) const override {
    for (const int fileStep : {-1, 1}) {
      const Square to = from.offset(fileStep, forwardStep(color));
      if (to.valid()) out.push_back(to);
    }
  }

  void moves(const Board& board, Square from, chess::Color color, std::vector<Move>& out) const override {
    const Square one = from.offset(0, forwardStep(color));
    if (one.valid() && !board.occupied(one)) {
      add(from, one, color, MoveKind::Normal, out);
      const Square two = from.offset(0, 2 * forwardStep(color));
      if (from.rank() == pawnRank(color) && !board.occupied(two)) out.push_back(Move{from, two, chess::Kind::Pawn, MoveKind::DoublePush});
    }
    std::vector<Square> diagonals;
    attacks(board, from, color, diagonals);
    for (const Square& to : diagonals) {
      if (board.occupied(to) && board.at(to).color != color) add(from, to, color, MoveKind::Normal, out);
    }
  }

 private:
  // A move onto the last rank is four moves: one per piece the pawn may become.
  static void add(Square from, Square to, chess::Color color, MoveKind kind, std::vector<Move>& out) {
    if (to.rank() != lastRank(color)) {
      out.push_back(Move{from, to, chess::Kind::Pawn, kind});
      return;
    }
    for (const chess::Kind becomes : {chess::Kind::Queen, chess::Kind::Rook, chess::Kind::Bishop, chess::Kind::Knight}) {
      out.push_back(Move{from, to, becomes, kind});
    }
  }
};

// The rules of every kind of piece, found by kind: no switch, so a new piece is a new entry.
class RuleTable {
 public:
  RuleTable() {
    const Steps straight{{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    const Steps diagonal{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
    Steps around = straight;
    around.insert(around.end(), diagonal.begin(), diagonal.end());
    const Steps jumps{{1, 2}, {2, 1}, {2, -1}, {1, -2}, {-1, -2}, {-2, -1}, {-2, 1}, {-1, 2}};
    set(chess::Kind::Pawn, std::make_unique<PawnRule>());
    set(chess::Kind::Knight, std::make_unique<StepRule>(jumps));
    set(chess::Kind::Bishop, std::make_unique<SlideRule>(diagonal));
    set(chess::Kind::Rook, std::make_unique<SlideRule>(straight));
    set(chess::Kind::Queen, std::make_unique<SlideRule>(around));
    set(chess::Kind::King, std::make_unique<StepRule>(around));
  }

  const PieceRules& of(chess::Kind kind) const { return *rules_[static_cast<std::size_t>(kind)]; }

 private:
  void set(chess::Kind kind, std::unique_ptr<PieceRules> rule) { rules_[static_cast<std::size_t>(kind)] = std::move(rule); }

  std::array<std::unique_ptr<PieceRules>, 6> rules_;
};


// Answers "is this square attacked?" and "is this king in check?" by asking every enemy piece what it attacks.
class CheckDetector {
 public:
  explicit CheckDetector(const RuleTable& pieces) : pieces_(pieces) {}

  bool attacked(const Board& board, Square target, chess::Color by) const {
    std::vector<Square> reach;
    for (const Square& from : board.squaresOf(by)) {
      reach.clear();
      pieces_.of(board.at(from).kind).attacks(board, from, by, reach);
      if (std::find(reach.begin(), reach.end(), target) != reach.end()) return true;
    }
    return false;
  }

  bool inCheck(const Board& board, chess::Color side) const {
    Square king;
    return board.findKing(side, king) && attacked(board, king, opposite(side));
  }

 private:
  const RuleTable& pieces_;
};




// Who may still castle, per colour (indexed by sideIndex): the king has not moved and that rook has not moved or been captured.
struct CastleRights {
  bool kingSide[2] = {false, false};
  bool queenSide[2] = {false, false};
};

// Everything that decides what can happen next. A value: one history entry is one copy of it.
struct Position {
  Board board;
  chess::Color turn = chess::Color::White;
  CastleRights rights;
  Square enPassant;  // the square a pawn has just skipped with a two-square advance, or nowhere
};


// A rule that is not a piece's own way of moving (Strategy): it may add moves and it may have to do more than move one piece.
class SpecialMove {
 public:
  virtual ~SpecialMove() = default;
  // Extra moves for the piece of the side to move standing on `from`.
  virtual void generate(const Position& position, Square from, std::vector<Move>& out) const = 0;
  // Called after the piece has been moved, captured and promoted: finish the move and update the state it keeps.
  virtual void afterMove(Position& position, const Move& move) const = 0;
};

class CastlingRule : public SpecialMove {
 public:
  explicit CastlingRule(const RuleTable& pieces) : detector_(pieces) {}

  void generate(const Position& position, Square from, std::vector<Move>& out) const override {
    const chess::Color side = position.turn;
    if (from != Square(kKingFile, homeRank(side))) return;
    if (detector_.attacked(position.board, from, opposite(side))) return;
    if (position.rights.kingSide[sideIndex(side)]) addIfClear(position, from, +1, kRookFileKingSide, out);
    if (position.rights.queenSide[sideIndex(side)]) addIfClear(position, from, -1, kRookFileQueenSide, out);
  }

  void afterMove(Position& position, const Move& move) const override {
    if (move.kind == MoveKind::Castle) moveRook(position, move);
    for (const chess::Color side : {chess::Color::White, chess::Color::Black}) {
      const int rank = homeRank(side);
      if (touches(move, Square(kKingFile, rank))) {
        position.rights.kingSide[sideIndex(side)] = false;
        position.rights.queenSide[sideIndex(side)] = false;
      }
      if (touches(move, Square(kRookFileKingSide, rank))) position.rights.kingSide[sideIndex(side)] = false;
      if (touches(move, Square(kRookFileQueenSide, rank))) position.rights.queenSide[sideIndex(side)] = false;
    }
  }

 private:
  static constexpr int kKingFile = 4;
  static constexpr int kRookFileKingSide = 7;
  static constexpr int kRookFileQueenSide = 0;

  static bool touches(const Move& move, Square square) { return move.from == square || move.to == square; }

  // Adds the castling towards `rookFile` when the squares between king and rook are empty and the king's way is not attacked.
  // The landing square is checked like for any king move, by the legality filter.
  void addIfClear(const Position& position, Square king, int direction, int rookFile, std::vector<Move>& out) const {
    for (int file = kKingFile + direction; file != rookFile; file += direction) {
      if (position.board.occupied(Square(file, king.rank()))) return;
    }
    if (detector_.attacked(position.board, king.offset(direction, 0), opposite(position.turn))) return;
    out.push_back(Move{king, king.offset(2 * direction, 0), chess::Kind::Pawn, MoveKind::Castle});
  }

  static void moveRook(Position& position, const Move& move) {
    const bool kingSide = move.to.file() > move.from.file();
    const Square rookFrom(kingSide ? kRookFileKingSide : kRookFileQueenSide, move.from.rank());
    const Square rookTo(kingSide ? kRookFileKingSide - 2 : kRookFileQueenSide + 3, move.from.rank());
    position.board.place(rookTo, position.board.at(rookFrom));
    position.board.clear(rookFrom);
  }

  CheckDetector detector_;
};

class EnPassantRule : public SpecialMove {
 public:
  explicit EnPassantRule(const RuleTable& pieces) : pawns_(pieces.of(chess::Kind::Pawn)) {}

  void generate(const Position& position, Square from, std::vector<Move>& out) const override {
    if (!position.enPassant.valid() || position.board.at(from).kind != chess::Kind::Pawn) return;
    std::vector<Square> reach;
    pawns_.attacks(position.board, from, position.turn, reach);
    if (std::find(reach.begin(), reach.end(), position.enPassant) == reach.end()) return;
    out.push_back(Move{from, position.enPassant, chess::Kind::Pawn, MoveKind::EnPassant});
  }

  void afterMove(Position& position, const Move& move) const override {
    position.enPassant = Square();
    if (move.kind == MoveKind::DoublePush) position.enPassant = Square(move.from.file(), (move.from.rank() + move.to.rank()) / 2);
    if (move.kind == MoveKind::EnPassant) position.board.clear(Square(move.to.file(), move.from.rank()));
  }

 private:
  const PieceRules& pawns_;
};


enum class Rules { Basic, Full };

// The rules of one game: how each piece moves, plus the special moves that this variant has.
class RuleBook {
 public:
  explicit RuleBook(Rules rules) {
    if (rules == Rules::Full) {
      specials_.push_back(std::make_unique<CastlingRule>(pieces_));
      specials_.push_back(std::make_unique<EnPassantRule>(pieces_));
    }
  }

  const RuleTable& pieces() const { return pieces_; }
  const std::vector<std::unique_ptr<SpecialMove>>& specials() const { return specials_; }

 private:
  RuleTable pieces_;
  std::vector<std::unique_ptr<SpecialMove>> specials_;
};


// Makes a move on a position: the one place where a move changes anything.
class MoveApplier {
 public:
  explicit MoveApplier(const RuleBook& rules) : rules_(rules) {}

  void apply(Position& position, const Move& move) const {
    const chess::Piece mover = position.board.at(move.from);
    position.board.clear(move.from);
    position.board.place(move.to, promotes(move) ? chess::Piece{mover.color, move.promoteTo} : mover);
    for (const auto& special : rules_.specials()) special->afterMove(position, move);
    position.turn = opposite(position.turn);
  }

 private:
  const RuleBook& rules_;
};


// Finds the legal moves: the piece's own moves and the special moves, minus those that leave the mover's king attacked.
class MoveGenerator {
 public:
  MoveGenerator(const RuleBook& rules, const CheckDetector& detector, const MoveApplier& applier)
      : rules_(rules), detector_(detector), applier_(applier) {}

  void legalFrom(const Position& position, Square from, std::vector<Move>& out) const {
    if (!position.board.occupied(from) || position.board.at(from).color != position.turn) return;
    std::vector<Move> candidates;
    rules_.pieces().of(position.board.at(from).kind).moves(position.board, from, position.turn, candidates);
    for (const auto& special : rules_.specials()) special->generate(position, from, candidates);
    for (const Move& move : candidates) {
      Position after = position;
      applier_.apply(after, move);
      if (!detector_.inCheck(after.board, position.turn)) out.push_back(move);
    }
  }

  bool anyLegal(const Position& position) const {
    std::vector<Move> found;
    for (const Square& from : position.board.squaresOf(position.turn)) {
      legalFrom(position, from, found);
      if (!found.empty()) return true;
    }
    return false;
  }

 private:
  const RuleBook& rules_;
  const CheckDetector& detector_;
  const MoveApplier& applier_;
};


// The state of one game and everything that can be asked about it without changing it.
class GameQueries : public chess::UndoGame {
 public:
  GameQueries(Rules rules, Position start)
      : rules_(rules), detector_(rules_.pieces()), applier_(rules_), generator_(rules_, detector_, applier_), position_(std::move(start)) {
    refresh();
  }

  chess::Status pieceAt(const std::string& square, chess::Piece& out) const override {
    const Square at = Square::parse(square);
    if (!at.valid()) return chess::Status::InvalidSquare;
    if (!position_.board.occupied(at)) return chess::Status::Empty;
    out = position_.board.at(at);
    return chess::Status::Ok;
  }

  chess::Color turn() const override { return position_.turn; }
  bool inCheck() const override { return detector_.inCheck(position_.board, position_.turn); }
  chess::Outcome outcome() const override { return outcome_; }

  std::vector<std::string> legalMoves(const std::string& from) const override {
    std::vector<Move> moves;
    const Square at = Square::parse(from);
    if (at.valid()) generator_.legalFrom(position_, at, moves);
    std::vector<std::string> names;
    for (const Move& move : moves) names.push_back(move.to.name());
    names.erase(std::unique(names.begin(), names.end()), names.end());
    return names;
  }

 protected:
  // Works out whether the game is over; call after every change of the position.
  void refresh() {
    if (generator_.anyLegal(position_)) outcome_ = chess::Outcome::Ongoing;
    else outcome_ = inCheck() ? chess::Outcome::Checkmate : chess::Outcome::Stalemate;
  }

  RuleBook rules_;
  CheckDetector detector_;
  MoveApplier applier_;
  MoveGenerator generator_;
  Position position_;
  chess::Outcome outcome_ = chess::Outcome::Ongoing;
};



// Turns the eight text rows of makeGameFrom() into a Position, or refuses a position that cannot exist.
class PositionParser {
 public:
  explicit PositionParser(const CheckDetector& detector) : detector_(detector) {}

  static std::vector<std::string> startRows() {
    return {"rnbqkbnr", "pppppppp", "........", "........", "........", "........", "PPPPPPPP", "RNBQKBNR"};
  }

  bool parse(const std::vector<std::string>& rows, chess::Color toMove, Position& out) const {
    if (rows.size() != 8) return false;
    Position position;
    position.turn = toMove;
    int kings[2] = {0, 0};
    for (int row = 0; row < 8; ++row) {
      if (rows[row].size() != 8) return false;
      for (int file = 0; file < 8; ++file) {
        if (rows[row][file] == '.') continue;
        chess::Piece piece{chess::Color::White, chess::Kind::Pawn};
        if (!decode(rows[row][file], piece)) return false;
        const Square at(file, 7 - row);
        if (piece.kind == chess::Kind::Pawn && (at.rank() == 0 || at.rank() == 7)) return false;
        if (piece.kind == chess::Kind::King) ++kings[sideIndex(piece.color)];
        position.board.place(at, piece);
      }
    }
    if (kings[0] != 1 || kings[1] != 1) return false;
    if (detector_.inCheck(position.board, opposite(toMove))) return false;
    inferCastleRights(position);
    out = position;
    return true;
  }

 private:
  static bool decode(char letter, chess::Piece& out) {
    static const std::string kKinds = "pnbrqk";
    const std::size_t found = kKinds.find(static_cast<char>(std::tolower(static_cast<unsigned char>(letter))));
    if (found == std::string::npos) return false;
    out = chess::Piece{std::isupper(static_cast<unsigned char>(letter)) ? chess::Color::White : chess::Color::Black, static_cast<chess::Kind>(found)};
    return true;
  }

  // A king on its home square and a rook of its colour in a corner count as never moved.
  static void inferCastleRights(Position& position) {
    for (const chess::Color side : {chess::Color::White, chess::Color::Black}) {
      const int rank = homeRank(side);
      const bool kingHome = position.board.holds(Square(4, rank), side, chess::Kind::King);
      position.rights.kingSide[sideIndex(side)] = kingHome && position.board.holds(Square(7, rank), side, chess::Kind::Rook);
      position.rights.queenSide[sideIndex(side)] = kingHome && position.board.holds(Square(0, rank), side, chess::Kind::Rook);
    }
  }

  const CheckDetector& detector_;
};


// The commands. A move is looked up among the legal moves of the piece, so there is one definition of "legal"; the
// history is a stack of whole positions (Memento), which is why undo needs to know nothing about the rules.
class GameImpl : public GameQueries {
 public:
  using GameQueries::GameQueries;

  static std::unique_ptr<GameImpl> create(Rules rules, const std::vector<std::string>& rows, chess::Color toMove) {
    const RuleTable pieces;
    const CheckDetector detector(pieces);
    Position start;
    if (!PositionParser(detector).parse(rows, toMove, start)) return nullptr;
    return std::make_unique<GameImpl>(rules, start);
  }

  chess::Status move(const std::string& from, const std::string& to, chess::Kind promoteTo) override {
    if (outcome_ != chess::Outcome::Ongoing) return chess::Status::GameOver;
    const Square source = Square::parse(from);
    const Square target = Square::parse(to);
    if (!source.valid() || !target.valid()) return chess::Status::InvalidSquare;
    if (!position_.board.occupied(source)) return chess::Status::Empty;
    if (position_.board.at(source).color != position_.turn) return chess::Status::NotYourTurn;
    std::vector<Move> options;
    generator_.legalFrom(position_, source, options);
    options.erase(std::remove_if(options.begin(), options.end(), [&](const Move& m) { return m.to != target; }), options.end());
    if (options.empty()) return chess::Status::IllegalMove;
    const Move* chosen = choose(options, promoteTo);
    if (!chosen) return chess::Status::InvalidPromotion;
    history_.push_back(position_);
    applier_.apply(position_, *chosen);
    refresh();
    return chess::Status::Ok;
  }

  chess::Status undo() override {
    if (history_.empty()) return chess::Status::NothingToUndo;
    position_ = history_.back();
    history_.pop_back();
    refresh();
    return chess::Status::Ok;
  }

  std::size_t moveCount() const override { return history_.size(); }

 private:
  // One option, or four when the move is a promotion (one per piece): the one asked for, or nothing.
  static const Move* choose(const std::vector<Move>& options, chess::Kind promoteTo) {
    if (!promotes(options.front())) return &options.front();
    for (const Move& option : options) {
      if (option.promoteTo == promoteTo) return &option;
    }
    return nullptr;
  }

  std::vector<Position> history_;
};

std::unique_ptr<chess::Game> chess::makeGame() { return GameImpl::create(Rules::Basic, PositionParser::startRows(), chess::Color::White); }

std::unique_ptr<chess::Game> chess::makeGameFrom(const std::vector<std::string>& rows, chess::Color toMove) {
  return GameImpl::create(Rules::Basic, rows, toMove);
}

std::unique_ptr<chess::Game> chess::makeFullGame() { return GameImpl::create(Rules::Full, PositionParser::startRows(), chess::Color::White); }

std::unique_ptr<chess::Game> chess::makeFullGameFrom(const std::vector<std::string>& rows, chess::Color toMove) {
  return GameImpl::create(Rules::Full, rows, toMove);
}

std::unique_ptr<chess::UndoGame> chess::makeUndoGame() { return GameImpl::create(Rules::Full, PositionParser::startRows(), chess::Color::White); }

std::unique_ptr<chess::UndoGame> chess::makeUndoGameFrom(const std::vector<std::string>& rows, chess::Color toMove) {
  return GameImpl::create(Rules::Full, rows, toMove);
}
