import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "movie-booking",
  title: "Movie ticket booking with seat holds",
  level: "Senior",
  parMinutes: 60,
  patterns: ["State", "Strategy"],
  requirements: [
    { id: "R-hold", text: "hold() claims all requested seats or none. Checks in order: UnknownShow, BadSeat (empty, repeated or out-of-range seats), TooManySeats (more than 6), SeatTaken (any seat held by a live hold or booked). Ids are positive and never reused. addShow refuses a used name or a non-positive size.", phase: "base", hidden: true },
    { id: "R-lapse", text: "Time comes from an injected Clock. A hold is live while now() < madeAt + holdTicks; at that tick its seats are Free again with no cleanup call, and freeSeats() and new holds see them as free. makeService returns nullptr for a null clock or a non-positive period.", phase: "base", hidden: true },
    { id: "R-confirm", text: "confirm() and release() check in order: UnknownHold (never issued, or already confirmed or released), NotOwner (the hold stays live), Expired (nothing is touched, because the seats may belong to someone else now). A confirmed hold's seats are Booked for good; a spent id is never valid again.", phase: "base", hidden: true },
    { id: "R-extend", text: "Storm 1: extend() gives a live hold a fresh full period counted from now (replacing the old deadline), once per hold. Checks in order: UnknownHold, NotOwner, Expired (a lapsed hold cannot be revived), AlreadyExtended.", phase: "storm1", hidden: true },
    { id: "R-best", text: "Storm 2: holdBest(show, user, count) holds count seats next to each other in one row: lowest row that fits, then lowest starting seat; never across a row boundary; lapsed seats count as free, booked and held seats do not. Errors: UnknownShow, BadSeat (count < 1), TooManySeats (count > 6), SeatTaken when no run fits. seatsOf() lists a live hold's seats ascending.", phase: "storm2", hidden: true },
  ],
  bad: [
    {
      dir: "hold_inclusive",
      failsPhase: "base",
      failingTests: ["Expiry.ASeatIsHeldUntilItsLastTickAndFreeAtTheExpiryTick", "Expiry.TheHoldPeriodCountsFromTheMomentOfTheHold"],
      reason: "The lapse test uses > instead of >=, so a hold made with a period of 10 survives 11 ticks. Off-by-one at the deadline is the classic bug in every timeout feature; stating the interval (live while now < madeAt + period) and keeping the comparison in one function makes it testable at the exact tick.",
    },
    {
      dir: "stale_confirm_books",
      failsPhase: "base",
      failingTests: ["Confirm.ALapsedHoldCannotBeConfirmed", "Confirm.AStaleConfirmDoesNotStealSeatsFromTheNewHolder"],
      reason: "confirm() does not ask whether the hold lapsed, so a customer who pays after the timeout books seats that someone else is holding now. This is the double-booking bug the whole problem exists to prevent. Every transition out of Held (confirm, release, extend) must first ask the one place that decides whether the hold is live.",
    },
    {
      dir: "partial_hold",
      failsPhase: "base",
      failingTests: ["Hold.AllOrNothingWhenOneSeatIsTaken"],
      reason: "hold() claims whichever requested seats are free and answers Ok. A group of four ends up with three seats and a success message. Check every seat first, then claim; the cost of validating twice is nothing next to the cost of cleaning up half a booking.",
    },
    {
      dir: "owner_unchecked",
      failsPhase: "base",
      failingTests: ["Confirm.OnlyTheHolderCanConfirmAndTheHoldSurvivesTheAttempt", "Release.OnlyTheHolderCanRelease"],
      reason: "Anyone who learns or guesses a hold id can confirm or release it. Hold ids are capabilities only if they are checked against an owner; sequential ids make guessing easy, which is also why a real system would use unguessable tokens on top of the owner check.",
    },
    {
      dir: "duplicate_seats_ok",
      failsPhase: "base",
      failingTests: ["Hold.DuplicateSeatsAreRefusedEvenWhenTheyAreFree", "Hold.EmptyRepeatedAndOutOfRangeSeatsAreBad"],
      reason: "A request that names the same seat twice is accepted. Whatever the later code does with it (double count, double release) is wrong. Input validation belongs at the boundary and should be a small named function, not scattered conditions.",
    },
    {
      dir: "booked_seat_reholdable",
      failsPhase: "base",
      failingTests: ["Hold.ABookedSeatCannotBeHeld"],
      reason: "The 'is this seat free?' test only asks whether a live hold claims it, so a sold seat can be held again and sold twice. A seat has three states (free, held, booked) and one function should map a seat to its state; here the Booked case was forgotten in one of its two copies.",
    },
    {
      dir: "confirm_not_final",
      failsPhase: "base",
      failingTests: ["Confirm.ConfirmingTwiceIsRefused", "Release.AConfirmedBookingCannotBeReleased"],
      reason: "Confirming does not retire the hold id, so the same hold can be confirmed again or released after payment. A hold has a life cycle (active, then confirmed, released or lapsed), and terminal states must reject every later transition. This is the State pattern's whole point, even when it is a flag and not a class.",
    },
    {
      dir: "free_seats_counts_lapsed",
      failsPhase: "base",
      failingTests: ["Expiry.FreeSeatsGetsLapsedHoldsBack"],
      reason: "freeSeats() counts any seat that names a hold as taken, even if the hold lapsed, while seatState() gets it right. The service has several ways to ask about a seat and each re-implemented 'is it live?'. One rule consulted by every read path (the ledger) is the cure.",
    },
    {
      dir: "max_seats_exclusive",
      failsPhase: "base",
      failingTests: ["Hold.SixSeatsAreAllowedSevenAreNot"],
      reason: "The limit comparison is off by one and refuses exactly the maximum. Limits are part of the contract: a named constant and a test at the boundary on both sides is the cheapest insurance.",
    },
    {
      dir: "extend_from_old_deadline",
      failsPhase: "storm1",
      failingTests: ["Extend.TheNewDeadlineReplacesTheOldOneInsteadOfAddingToIt", "Extend.GivesAFullPeriodCountedFromTheMomentOfTheExtension"],
      reason: "The new deadline is the old deadline plus a period, so asking early gives a longer hold than asking late, and a customer can bank time. The rule is a fresh period from now; the decision belongs in one method of the object that owns deadlines.",
    },
    {
      dir: "extend_unlimited",
      failsPhase: "storm1",
      failingTests: ["Extend.AHoldCanBeExtendedOnlyOnce"],
      reason: "Nothing remembers that the hold was extended, so a bot can hold the best seats forever by extending every few seconds. The 'extended' flag belongs on the hold, next to its deadline, and the limit is a business rule that should be easy to change (once, twice, per user per day).",
    },
    {
      dir: "extend_revives_lapsed",
      failsPhase: "storm1",
      failingTests: ["Extend.ALapsedHoldCannotBeRevived", "Extend.ACheckOrderOfUnknownThenOwnerThenExpiredThenAlreadyExtended"],
      reason: "extend() works on a lapsed hold, so someone who comes back late takes seats back from the person who holds them now. Lapse is a one-way door: the seats were released at the deadline, whether or not anything noticed.",
    },
    {
      dir: "extend_ignores_owner",
      failsPhase: "storm1",
      failingTests: ["Extend.OnlyTheHolderCanExtend", "Extend.ACheckOrderOfUnknownThenOwnerThenExpiredThenAlreadyExtended"],
      reason: "A new operation was added and the ownership check from confirm() and release() was not carried over, so anyone can prolong anyone's hold. Operations on a hold share a precondition (exists, is mine, is live); extracting it into one function is what makes the third and fourth operation safe by default.",
    },
    {
      dir: "run_wraps_rows",
      failsPhase: "storm2",
      failingTests: ["Best.ARunNeverWrapsFromOneRowToTheNext"],
      reason: "The search walks seat numbers as one long line, so a pair can be 'the last seat of row 0 and the first of row 1' which sit on different rows. Geometry (rows, positions) is the seat map's knowledge; the allocator should ask it, not assume a flat array.",
    },
    {
      dir: "lapsed_seats_unavailable",
      failsPhase: "storm2",
      failingTests: ["Best.SeatsFromLapsedHoldsAreCandidatesAgain"],
      reason: "The new search tests the raw 'who claims this seat' field instead of the existing 'is it free right now' check, so seats of lapsed holds look taken. A new feature that bypasses the existing predicate for 'free' re-creates the very bug the predicate fixed.",
    },
    {
      dir: "last_row_wins",
      failsPhase: "storm2",
      failingTests: ["Best.AnEmptyHallGivesTheFirstSeatsOfTheFirstRow", "Best.RowsAreTriedInOrderAndFullOnesAreSkipped"],
      reason: "The search starts at the back row. Which seats count as best is a business rule (front, middle, aisle, together) and an interviewer will change it; it should live in one small class behind an interface so that changing it edits nothing else.",
    },
  ],
};
