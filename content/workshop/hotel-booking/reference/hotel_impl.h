#pragma once
#include <map>
#include <memory>
#include <string>
#include <utility>

#include "api_storm2.h"
#include "pricing.h"
#include "refund_policy.h"
#include "reservation_book.h"
#include "room_calendar.h"

// The public face. It validates a request in the documented order and sequences the collaborators. It holds no
// rule of its own about nights, prices or refunds.
class HotelImpl : public hotel::RefundingHotel {
 public:
  HotelImpl(std::shared_ptr<hotel::Clock> clock, std::unique_ptr<RefundPolicy> refunds)
      : clock_(std::move(clock)), refunds_(std::move(refunds)) {}

  bool addRoomType(const std::string& type, int rooms, hotel::Money rate) override {
    if (type.empty() || rooms < 1 || rooms > hotel::kMaxRooms) return false;
    if (rate < 1 || rate > hotel::kMaxNightlyRate) return false;
    if (!calendars_.emplace(type, RoomCalendar(rooms)).second) return false;
    pricing_.setBase(type, rate);
    return true;
  }

  hotel::BookResult book(const std::string& guest, const std::string& type, long long checkIn,
                         long long checkOut) override {
    const auto calendar = calendars_.find(type);
    if (calendar == calendars_.end()) return refuse(hotel::Status::UnknownType);
    const StayRange stay(checkIn, checkOut);
    if (guest.empty() || !stay.isValid()) return refuse(hotel::Status::InvalidRequest);
    if (stay.startsBefore(clock_->today())) return refuse(hotel::Status::InPast);
    if (calendar->second.freeFor(stay) < 1) return refuse(hotel::Status::SoldOut);
    calendar->second.take(stay);
    const hotel::Money total = pricing_.total(type, stay);
    const hotel::ReservationId id = reservations_.add(Reservation{guest, type, stay, total});
    return hotel::BookResult{hotel::Status::Ok, id, total};
  }

  hotel::Status cancel(hotel::ReservationId id, const std::string& guest) override {
    return cancelWithRefund(id, guest).status;
  }

  hotel::CancelResult cancelWithRefund(hotel::ReservationId id, const std::string& guest) override {
    const Reservation* reservation = reservations_.find(id);
    if (reservation == nullptr) return hotel::CancelResult{hotel::Status::UnknownReservation, 0};
    if (reservation->guest != guest) return hotel::CancelResult{hotel::Status::WrongGuest, 0};
    const long long today = clock_->today();
    if (reservation->stay.hasStartedBy(today)) return hotel::CancelResult{hotel::Status::StayStarted, 0};
    const hotel::Money refund = refunds_->refund(reservation->total, reservation->stay.daysUntilStart(today));
    calendars_.at(reservation->type).give(reservation->stay);
    reservations_.remove(id);
    return hotel::CancelResult{hotel::Status::Ok, refund};
  }

  int available(const std::string& type, long long checkIn, long long checkOut) const override {
    const auto calendar = calendars_.find(type);
    const StayRange stay(checkIn, checkOut);
    if (calendar == calendars_.end() || !stay.isValid()) return 0;
    return calendar->second.freeFor(stay);
  }

  bool addSeason(const std::string& type, long long fromDay, long long toDay, hotel::Money rate) override {
    if (calendars_.find(type) == calendars_.end() || toDay <= fromDay) return false;
    if (rate < 1 || rate > hotel::kMaxNightlyRate) return false;
    pricing_.addSeason(type, fromDay, toDay, rate);
    return true;
  }

  std::optional<hotel::Money> quote(const std::string& type, long long checkIn, long long checkOut) const override {
    const StayRange stay(checkIn, checkOut);
    if (calendars_.find(type) == calendars_.end() || !stay.isValid()) return std::nullopt;
    return pricing_.total(type, stay);
  }

 private:
  static hotel::BookResult refuse(hotel::Status status) { return hotel::BookResult{status, hotel::kNoReservation, 0}; }

  std::shared_ptr<hotel::Clock> clock_;
  std::unique_ptr<RefundPolicy> refunds_;
  std::map<std::string, RoomCalendar> calendars_;
  Pricing pricing_;
  ReservationBook reservations_;
};
