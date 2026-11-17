# Editorial: Hotel booking

## Requirements
Functional: room types with a number of identical rooms and a nightly rate. A guest books a type for a stay from a check-in day to a check-out day; the system reserves one room for every night or nothing, and returns an id and the total. A booking can be cancelled until the stay starts. Time arrives through an injected `Clock` as a whole day number. A stay is the half-open range of nights `[checkIn, checkOut)`, one to thirty nights. Checks run in a fixed order (`UnknownType`, `InvalidRequest`, `InPast`, `SoldOut`) and cancel fails in the order `UnknownReservation`, `WrongGuest`, `StayStarted`. Hidden until asked: whether the check-out day is a night, what "sold out" means for a stay that is only partly full, what cancelling gives back, and what a failed request changes (nothing). Non-goals: payment, taxes, room numbers, overbooking, thread safety (discussed), persistence.

**Change Storm 1, seasonal prices:** `addSeason(type, from, to, rate)` prices a range of nights for one type; where seasons overlap the last one added wins; `quote` returns what a stay would cost; a reservation already made keeps its total. Revealable by asking whether prices stay the same all year.

**Change Storm 2, refunds:** `makeRefundingHotel(clock, tiers)` with "at least N days before check-in, P percent back". The largest matching threshold applies, tiers come in any order, the refund is a percentage of the total charged at booking, rounded down.

## Reference design
- `StayRange` is the stay as a half-open range of nights: validity (one to thirty nights), the first night, the end, and how far away the start is. It knows nothing about rooms or money.
- `RoomCalendar` is one room type's capacity and a sparse count of rooms taken per night. Availability is the minimum over the nights; `take` and `give` add and remove exactly one room per night.
- `ReservationBook` issues ids and keeps, for each reservation, the guest, type, stay and the total it was given. Cancelling removes the record, so a cancelled id looks never issued.
- `Pricing` is the one place that knows what a night costs: a `BaseRates` rule and a `SeasonRates` rule asked in priority order. `book` and `quote` both call `total`.
- `RefundPolicy` is a Strategy: `NoRefund` and `TieredRefund`.
- `HotelImpl` is the facade: it validates in the documented order and sequences calendar, pricing, book and policy. It holds no rule of its own about nights, prices or refunds.

**Storm 1 in the reference:** `SeasonRates` is a new rule class and `Pricing` gets one more rule in its priority list; the facade gains `addSeason` and `quote`, each a few lines. No existing class changes its behaviour. The editorial would be lying if it said the facade was untouched, since it gains two methods.

**Storm 2 in the reference:** `TieredRefund` is one new class; `HotelImpl::cancel` becomes a call to `cancelWithRefund` and drops the money. The reservation already stores the total, which is the one design choice made earlier that Storm 2 depends on.

## Alternatives
- **A boolean per room per night** (`bool booked[room][night]`) looks natural and forces you to pick a room, scan for a free one on every night and keep the choice consistent across nights. Rooms of a type are interchangeable, so a count per night is both simpler and correct; per-room tracking is justified only when rooms differ (upgrades, accessibility) and then availability becomes a matching problem.
- **A list of reservations scanned on every request** is the first thing most candidates write: count overlapping reservations for each night. It is correct if the overlap test is, and costs O(reservations) per request. A calendar of counts is O(nights) and has no overlap predicate to get wrong.
- **A dense array of days** is fine for a fixed horizon and wastes memory for a sparse one; the sparse map keeps cost proportional to bookings and needs no year limit.
- **Re-pricing from the rate card at cancellation time** is the tempting shortcut that avoids storing a total. It makes refunds depend on today's prices, which is a bug the moment a season is added.
- **A State pattern per reservation** (Booked, Cancelled, CheckedIn) is the textbook shape. The only states here are "exists" and "spent", plus a date rule, so a record that is removed is enough; check-in and check-out events would justify real states and are listed in the follow-ups.
- **Overbooking, waiting lists and room upgrades** each change an assumption (capacity, a queue, interchangeability). Saying which class would change for each is stronger than building any of them.

## Trade-offs
Counting rooms per night, instead of assigning rooms, makes bookings O(nights) and keeps the model honest about what the guest was promised; it costs the ability to say which room, which needs a second phase at check-in. Storing the total on the reservation costs a few bytes and buys exact refunds and an audit trail. Keeping the id record only for live reservations makes memory proportional to live bookings; the cost is that "never issued" and "cancelled" are indistinguishable, which the API accepts and a real product would not (a tombstone keeps the difference). Newest-first seasons search is O(seasons) per night: fine for dozens of seasons, replaced by an interval map if profiling asks.

## What breaks at 10x
At 10x the hotels, nothing changes: each hotel is its own calendar, so you shard by hotel. At 10x the traffic on one hotel, the per-type lock becomes the hot spot and search traffic (availability) must be separated from booking traffic: serve searches from a stale cache and re-check at booking. The pricing scan per night grows with the number of seasons and needs an interval structure. In memory is no longer enough: the calendar becomes rows keyed by (hotel, type, night) with a conditional update that refuses to exceed capacity, which moves correctness into the database, and booking needs an idempotency key so a retry cannot book twice. Payment confirmation arriving late wants a short hold between choosing and paying, which is the ticket-booking design.

## Level signals
- **SDE2:** the half-open range stated and used consistently, availability as the minimum over nights, a failed booking that changes nothing, cancel that frees only its own room and spends the id, checks in a clear order.
- **Senior:** asks about the check-out day, partial overlaps and what a failed request changes before coding; keeps range, calendar, reservations, pricing and refund as separate small classes; stores the total at booking and explains why; the refund and the seasons are policies added without editing the core; describes the per-type critical section and why check-then-write races.
- **Staff:** moves correctness into a conditional write in a shared store and separates search from booking, discusses overbooking and room assignment as changes of assumption, idempotency and holds for the payment gap, and the failure modes of caching availability.
