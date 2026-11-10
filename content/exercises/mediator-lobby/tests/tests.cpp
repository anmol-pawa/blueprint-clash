#include <string>
#include <vector>
#include "bp_test.h"
#include "solution.h"

namespace {
class Spy final : public Participant {
 public:
  void notify(const std::string& message) override { heard.push_back(message); }
  std::vector<std::string> heard;
};

std::vector<std::string> v(std::initializer_list<const char*> items) { return {items.begin(), items.end()}; }
}  // namespace

TEST(Lobby, SayReachesEveryoneExceptTheSender) {
  Lobby lobby;
  Spy ann, bob, cy;
  lobby.join("ann", ann);
  lobby.join("bob", bob);
  lobby.join("cy", cy);
  lobby.say("ann", "hi");
  EXPECT_TRUE(ann.heard.empty());
  EXPECT_TRUE(bob.heard == v({"ann: hi"}));
  EXPECT_TRUE(cy.heard == v({"ann: hi"}));
}

TEST(Lobby, MessagesArriveInTheOrderTheyWereSaid) {
  Lobby lobby;
  Spy ann, bob;
  lobby.join("ann", ann);
  lobby.join("bob", bob);
  lobby.say("ann", "one");
  lobby.say("ann", "two");
  EXPECT_TRUE(bob.heard == v({"ann: one", "ann: two"}));
}

TEST(Lobby, DuplicateNamesAreRefusedAndDoNotDoubleDeliver) {
  Lobby lobby;
  Spy ann, bob, impostor;
  EXPECT_TRUE(lobby.join("ann", ann));
  EXPECT_TRUE(lobby.join("bob", bob));
  EXPECT_FALSE(lobby.join("bob", impostor));
  lobby.say("ann", "hello");
  EXPECT_EQ(bob.heard.size(), static_cast<std::size_t>(1));
  EXPECT_TRUE(impostor.heard.empty());
}

TEST(Lobby, UnknownSendersAreIgnored) {
  Lobby lobby;
  Spy ann;
  lobby.join("ann", ann);
  lobby.say("ghost", "boo");
  EXPECT_TRUE(ann.heard.empty());
}

TEST(Lobby, MatchStartsWhenEveryoneIsReadyAndEveryoneIsToldOnce) {
  Lobby lobby;
  Spy ann, bob;
  lobby.join("ann", ann);
  lobby.join("bob", bob);
  lobby.setReady("ann", true);
  EXPECT_FALSE(lobby.matchStarted());
  lobby.setReady("bob", true);
  EXPECT_TRUE(lobby.matchStarted());
  EXPECT_TRUE(ann.heard == v({"match started"}));
  EXPECT_TRUE(bob.heard == v({"match started"}));
}

TEST(Lobby, ALonePlayerNeverStartsAMatch) {
  Lobby lobby;
  Spy ann;
  lobby.join("ann", ann);
  lobby.setReady("ann", true);
  EXPECT_FALSE(lobby.matchStarted());
  EXPECT_TRUE(ann.heard.empty());
}

TEST(Lobby, OneNotReadyPlayerBlocksTheStart) {
  Lobby lobby;
  Spy ann, bob, cy;
  lobby.join("ann", ann);
  lobby.join("bob", bob);
  lobby.join("cy", cy);
  lobby.setReady("ann", true);
  lobby.setReady("bob", true);
  EXPECT_FALSE(lobby.matchStarted());
}

TEST(Lobby, TheMatchStartsOnlyOnceEvenIfReadinessChangesAgain) {
  Lobby lobby;
  Spy ann, bob;
  lobby.join("ann", ann);
  lobby.join("bob", bob);
  lobby.setReady("ann", true);
  lobby.setReady("bob", true);
  lobby.setReady("bob", false);
  lobby.setReady("bob", true);
  EXPECT_EQ(ann.heard.size(), static_cast<std::size_t>(1));
  EXPECT_EQ(bob.heard.size(), static_cast<std::size_t>(1));
}

TEST(Lobby, TheLastUnreadyPlayerLeavingStartsTheMatchForTheRest) {
  Lobby lobby;
  Spy ann, bob, cy;
  lobby.join("ann", ann);
  lobby.join("bob", bob);
  lobby.join("cy", cy);
  lobby.setReady("ann", true);
  lobby.setReady("bob", true);
  lobby.leave("cy");
  EXPECT_TRUE(lobby.matchStarted());
  EXPECT_TRUE(ann.heard == v({"match started"}));
  EXPECT_TRUE(cy.heard.empty());  // gone before the start
}

TEST(Lobby, ALeftPlayerHearsNothingMore) {
  Lobby lobby;
  Spy ann, bob;
  lobby.join("ann", ann);
  lobby.join("bob", bob);
  lobby.leave("bob");
  lobby.say("ann", "anyone?");
  EXPECT_TRUE(bob.heard.empty());
  lobby.leave("nobody");  // unknown names are ignored
  EXPECT_TRUE(lobby.join("bob", bob));  // the name is free again
}

TEST(Lobby, LeavingCannotStartAMatchWithFewerThanTwoPlayers) {
  Lobby lobby;
  Spy ann, bob;
  lobby.join("ann", ann);
  lobby.join("bob", bob);
  lobby.setReady("ann", true);
  lobby.leave("bob");
  EXPECT_FALSE(lobby.matchStarted());
}
