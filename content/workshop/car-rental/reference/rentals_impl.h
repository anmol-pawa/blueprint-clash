#pragma once
#include <memory>
#include <string>
#include <utility>

#include "api_storm2.h"
#include "bookings.h"
#include "car_chooser.h"
#include "fleet.h"
#include "late_fee.h"
#include "schedule.h"
#include "tariff.h"

// The public face. It validates a request in the documented order and sequences the collaborators. It holds no rule
// of its own about hours, prices, fees or which car goes out.
class RentalsImpl : public rental::Rentals {
 public:
  RentalsImpl(std::shared_ptr<rental::Clock> clock, std::unique_ptr<CarChooser> chooser, std::unique_ptr<LateFee> lateFee)
      : clock_(std::move(clock)), chooser_(std::move(chooser)), lateFee_(std::move(lateFee)) {}

  bool addCategory(const std::string& category, rental::Money dailyRate) override {
    return tariff_.add(category, dailyRate);
  }

  bool addCar(const std::string& plate, const std::string& category) override {
    if (!tariff_.knows(category)) return false;
    return fleet_.add(plate, category);
  }

  rental::ReserveResult reserve(const std::string& customer, const std::string& category, long long pickup,
                                long long dropoff) override {
    if (!tariff_.knows(category)) return refuse(rental::Status::UnknownCategory);
    const TimeSpan span(pickup, dropoff);
    if (customer.empty() || !span.isValid()) return refuse(rental::Status::InvalidRequest);
    if (span.startsBefore(clock_->nowHours())) return refuse(rental::Status::InPast);
    if (freeCarsFor(category, span) < 1) return refuse(rental::Status::NoneAvailable);
    const rental::Money total = tariff_.totalFor(category, span);
    const rental::ReservationId id = bookings_.add(Booking{customer, category, span, total, ""});
    schedule_.add(id, category, span);
    return rental::ReserveResult{rental::Status::Ok, id, total};
  }

  rental::Status cancel(rental::ReservationId id, const std::string& customer) override {
    Booking* booking = bookings_.find(id);
    if (booking == nullptr) return rental::Status::UnknownReservation;
    if (booking->customer != customer) return rental::Status::WrongCustomer;
    if (isCollected(*booking)) return rental::Status::AlreadyPickedUp;
    schedule_.remove(id);
    bookings_.remove(id);
    return rental::Status::Ok;
  }

  rental::PickUpResult pickUp(rental::ReservationId id, const std::string& customer) override {
    Booking* booking = bookings_.find(id);
    if (booking == nullptr) return rental::PickUpResult{rental::Status::UnknownReservation, ""};
    if (booking->customer != customer) return rental::PickUpResult{rental::Status::WrongCustomer, ""};
    if (isCollected(*booking)) return rental::PickUpResult{rental::Status::AlreadyPickedUp, ""};
    const long long now = clock_->nowHours();
    if (now < booking->span.from()) return rental::PickUpResult{rental::Status::TooEarly, ""};
    if (now >= booking->span.to()) return rental::PickUpResult{rental::Status::Lapsed, ""};
    const std::vector<IdleCar> idle = fleet_.idleIn(booking->category);
    if (idle.empty()) return rental::PickUpResult{rental::Status::NoCarReady, ""};
    booking->plate = chooser_->choose(idle);
    fleet_.takeOut(booking->plate);
    return rental::PickUpResult{rental::Status::Ok, booking->plate};
  }

  rental::ReturnResult returnCar(rental::ReservationId id, const std::string& customer) override {
    Booking* booking = bookings_.find(id);
    if (booking == nullptr) return rental::ReturnResult{rental::Status::UnknownReservation, 0};
    if (booking->customer != customer) return rental::ReturnResult{rental::Status::WrongCustomer, 0};
    if (!isCollected(*booking)) return rental::ReturnResult{rental::Status::NotPickedUp, 0};
    const long long now = clock_->nowHours();
    const long long lateHours = now - booking->span.to();
    const rental::Money charge =
        booking->total + lateFee_->extra(tariff_.dailyRate(booking->category), lateHours > 0 ? lateHours : 0);
    fleet_.bringBack(booking->plate, now);
    schedule_.endEarly(id, now);
    bookings_.remove(id);
    return rental::ReturnResult{rental::Status::Ok, charge};
  }

  int available(const std::string& category, long long pickup, long long dropoff) const override {
    const TimeSpan span(pickup, dropoff);
    if (!tariff_.knows(category) || !span.isValid()) return 0;
    return freeCarsFor(category, span);
  }

 private:
  static rental::ReserveResult refuse(rental::Status status) {
    return rental::ReserveResult{status, rental::kNoReservation, 0};
  }

  int freeCarsFor(const std::string& category, const TimeSpan& span) const {
    return fleet_.countIn(category) - schedule_.peak(category, span);
  }

  std::shared_ptr<rental::Clock> clock_;
  std::unique_ptr<CarChooser> chooser_;
  std::unique_ptr<LateFee> lateFee_;
  Tariff tariff_;
  Fleet fleet_;
  Schedule schedule_;
  Bookings bookings_;
};
