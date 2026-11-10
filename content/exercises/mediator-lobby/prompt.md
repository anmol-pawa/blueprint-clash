In a multiplayer lobby every player could hold a pointer to every other player, tell them "I'm ready" and check "is everybody ready?" themselves. That is N x N references, and the start-the-match rule ends up copied into every player. The **Mediator** pattern puts the players behind one object: players talk only to the `Lobby`, and the `Lobby` owns the rules about who hears what and when the match starts.

`api.h` gives you the `Participant` interface (`notify(const std::string&)`). Write `Lobby` in `solution.h`. It keeps **non-owning** references to participants (they outlive the lobby in the tests), identified by unique names:

- `bool join(const std::string& name, Participant& participant)`: adds a player (not ready yet) and returns `true`; returns `false` and changes nothing if the name is already taken.
- `void leave(const std::string& name)`: removes the player; unknown names are ignored. A removed player never hears from the lobby again.
- `void setReady(const std::string& name, bool ready)`: marks the player ready or not; unknown names are ignored.
- `void say(const std::string& from, const std::string& text)`: delivers `from + ": " + text` to **every other** player, in join order. Not to the sender. Unknown senders are ignored (no one hears anything).
- `bool matchStarted() const`.

**Start rule** (checked after every `setReady` and every `leave`): the match starts when there are **at least two** players and **all** of them are ready. Starting calls `notify("match started")` on every player, in join order, **exactly once**; after it has started, later changes never start it again.

Note that `leave` can complete the condition: if the only player who was not ready walks out, the remaining ready players start the match.
