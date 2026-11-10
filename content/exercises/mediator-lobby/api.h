#pragma once
#include <string>

// Anything that can receive messages from the lobby (a game client, a bot, a test spy).
// Participants never talk to each other directly; they only know the Lobby.
class Participant {
 public:
  virtual ~Participant() = default;
  virtual void notify(const std::string& message) = 0;
};
