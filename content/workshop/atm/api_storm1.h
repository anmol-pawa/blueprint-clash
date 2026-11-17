#pragma once
// Change Storm 1: pay whenever it is possible. Everything from api.h still holds for the new machine, except how notes are
// chosen.
#include "api.h"

namespace atm {

// makeAtm() is greedy: with 1 note of 50 and 3 of 20, a request for 60 takes the 50, finds 10 left over and gives up,
// although three 20s would do. This machine never gives up while some combination of the notes it holds pays the amount
// exactly.
//   - Among all exact combinations it picks the one with the FEWEST notes.
//   - If several combinations use the same number of notes, it picks the one that uses more of the larger denomination
//     (compare the counts from the largest denomination down; the first difference decides, more is better).
//   - Every other rule (checks, order of checks, states, PIN handling) is exactly as in api.h. CannotDispense now means that
//     no combination exists.
std::unique_ptr<Atm> makeFlexibleAtm(Bank& bank, const Notes& stock);

}  // namespace atm
