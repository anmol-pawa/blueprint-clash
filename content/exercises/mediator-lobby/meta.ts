import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "mediator-lobby",
  title: "Mediator: a game lobby that owns the rules",
  concepts: ["mediator", "decoupling", "non-owning references", "rule ownership", "re-checking invariants"],
  hints: [
    "Store `struct Member { std::string name; Participant* participant; bool ready; }` in a `std::vector`. A private `find(name)` returns an iterator so `join`, `leave`, `setReady` and `say` all share one lookup.",
    "Write one private `startIfEveryoneIsReady()`: return early if `started_` or fewer than two members; if `std::all_of` members are ready, set `started_` and notify each member in order. Call it from `setReady` **and** from `leave`.",
    "`say` first checks the sender exists, then loops over the members and skips the one whose name equals `from`. `join` returns `false` when `find` already finds the name. Erase the member in `leave` before re-checking the start rule so the departed player is not notified.",
  ],
  wrong: [
    { dir: "echoes_to_sender", failingTests: ["Lobby.SayReachesEveryoneExceptTheSender"], reason: "Delivers the message to the sender as well: the mediator forgot that a chat line should not echo back." },
    { dir: "start_with_one_player", failingTests: ["Lobby.ALonePlayerNeverStartsAMatch", "Lobby.LeavingCannotStartAMatchWithFewerThanTwoPlayers"], reason: "'All ready' is vacuously true for a lone player: the match starts with one person in the lobby." },
    { dir: "any_ready_starts", failingTests: ["Lobby.OneNotReadyPlayerBlocksTheStart", "Lobby.MatchStartsWhenEveryoneIsReadyAndEveryoneIsToldOnce"], reason: "Starts when any player is ready instead of all of them: the start rule is wrong in the one place it lives." },
    { dir: "start_announced_twice", failingTests: ["Lobby.TheMatchStartsOnlyOnceEvenIfReadinessChangesAgain"], reason: "Has no 'already started' latch, so toggling ready after the start announces the match again." },
    { dir: "leave_skips_recheck", failingTests: ["Lobby.TheLastUnreadyPlayerLeavingStartsTheMatchForTheRest"], reason: "Only setReady re-checks the rule, so the room waits forever after the one unready player leaves." },
    { dir: "duplicate_join_allowed", failingTests: ["Lobby.DuplicateNamesAreRefusedAndDoNotDoubleDeliver"], reason: "Accepts a second player with an existing name, so messages are delivered to two clients under one identity." },
    { dir: "leave_keeps_listening", failingTests: ["Lobby.ALeftPlayerHearsNothingMore", "Lobby.TheLastUnreadyPlayerLeavingStartsTheMatchForTheRest"], reason: "leave() never actually removes the player, so a departed client keeps receiving messages, still blocks the name and still counts against the start rule." },
  ],
};
