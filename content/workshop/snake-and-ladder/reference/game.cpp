#include "game_impl.h"

namespace {
constexpr int kMinPlayers = 2;
constexpr int kMinBoardForBounce = 6;  // a bounce from the last-but-one square with a six must stay on the board

std::unique_ptr<GameImpl> build(int players, int size, const std::vector<snl::Link>& links, snl::Rules rules,
                                std::unique_ptr<snl::Dice> dice) {
  if (players < kMinPlayers || dice == nullptr || !Board::acceptsLinks(size, links)) return nullptr;
  if (rules.bounceBack && size < kMinBoardForBounce) return nullptr;
  std::unique_ptr<OvershootPolicy> overshoot;
  if (rules.bounceBack) {
    overshoot = std::make_unique<BouncePolicy>();
  } else {
    overshoot = std::make_unique<StayPolicy>();
  }
  return std::make_unique<GameImpl>(players, Board(size, links), std::move(overshoot), rules.sixRerolls, std::move(dice));
}
}  // namespace

std::unique_ptr<snl::Game> snl::makeGame(int players, int size, std::vector<Link> links, std::unique_ptr<Dice> dice) {
  return build(players, size, links, Rules{}, std::move(dice));
}

std::unique_ptr<snl::Game> snl::makeGameWithRules(int players, int size, std::vector<Link> links, Rules rules,
                                                  std::unique_ptr<Dice> dice) {
  return build(players, size, links, rules, std::move(dice));
}

std::unique_ptr<snl::ResignableGame> snl::makeResignableGame(int players, int size, std::vector<Link> links, Rules rules,
                                                              std::unique_ptr<Dice> dice) {
  return build(players, size, links, rules, std::move(dice));
}
