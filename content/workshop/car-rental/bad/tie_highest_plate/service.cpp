// MUTATION: ties are broken towards the higher plate.
#include <algorithm>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>
#include "api_storm2.h"


constexpr int kHoursPerDay = 24;

// A rental as a half-open range of hours: `from` is the first hour the car is held, `to` is the hour it comes back
// and is NOT held. Every question about hours, length and billing is answered here and nowhere else.
class TimeSpan {
 public:
  TimeSpan(long long from, long long to) : from_(from), to_(to) {}

  bool isValid() const { return to_ > from_ && to_ - from_ <= rental::kMaxHours; }
  long long from() const { return from_; }
  long long to() const { return to_; }
  bool startsBefore(long long hour) const { return from_ < hour; }
  bool overlaps(const TimeSpan& other) const { return from_ < other.to_ && other.from_ < to_; }
  // The same rental, ended early at `hour` (clamped so it never ends before it starts).
  TimeSpan endedAt(long long hour) const { return TimeSpan(from_, hour < from_ ? from_ : (hour < to_ ? hour : to_)); }
  bool isEmpty() const { return to_ <= from_; }
  // Started days: 1 to 24 hours is one day, 25 to 48 is two.
  long long startedDays() const { return (to_ - from_ + kHoursPerDay - 1) / kHoursPerDay; }

 private:
  long long from_;
  long long to_;
};


// What each category costs per started day, and what a rental of it costs in total.
class Tariff {
 public:
  bool add(const std::string& category, rental::Money dailyRate) {
    if (category.empty() || dailyRate < 1 || dailyRate > rental::kMaxDailyRate) return false;
    return rates_.emplace(category, dailyRate).second;
  }
  bool knows(const std::string& category) const { return rates_.count(category) > 0; }
  rental::Money dailyRate(const std::string& category) const { return rates_.at(category); }
  rental::Money totalFor(const std::string& category, const TimeSpan& span) const {
    return dailyRate(category) * span.startedDays();
  }

 private:
  std::map<std::string, rental::Money> rates_;
};


// The promises made, per category: which hours each reservation holds a car. It answers one question, "how many cars
// are committed at the busiest hour of this span", and knows nothing about which physical car is which.
class Schedule {
 public:
  void add(rental::ReservationId id, const std::string& category, const TimeSpan& span) {
    entries_[id] = Entry{category, span};
  }
  void remove(rental::ReservationId id) { entries_.erase(id); }

  // A car came back early: the hours after `hour` are free again.
  void endEarly(rental::ReservationId id, long long hour) {
    const auto it = entries_.find(id);
    if (it == entries_.end()) return;
    it->second.span = it->second.span.endedAt(hour);
    if (it->second.span.isEmpty()) entries_.erase(it);
  }

  // The most reservations of the category that hold a car at the same hour inside `span`.
  int peak(const std::string& category, const TimeSpan& span) const {
    std::vector<std::pair<long long, int>> changes;  // +1 where a hold starts, -1 where it ends
    int holding = 0;
    for (const auto& [id, entry] : entries_) {
      if (entry.category != category || !entry.span.overlaps(span)) continue;
      const long long start = std::max(entry.span.from(), span.from());
      const long long end = std::min(entry.span.to(), span.to());
      if (start == span.from()) ++holding;
      else changes.emplace_back(start, +1);
      if (end < span.to()) changes.emplace_back(end, -1);
    }
    std::sort(changes.begin(), changes.end());  // at the same hour a -1 sorts before a +1: the car is back first
    int busiest = holding;
    for (const auto& change : changes) {
      holding += change.second;
      busiest = std::max(busiest, holding);
    }
    return busiest;
  }

 private:
  struct Entry {
    std::string category;
    TimeSpan span{0, 0};
  };
  std::map<rental::ReservationId, Entry> entries_;
};


// A car that is in the garage right now, and what a chooser needs to know about it.
struct IdleCar {
  std::string plate;
  bool everReturned;
  long long returnedAt;  // meaningful only when everReturned
};

// The physical cars: which exist, which category each belongs to, which are out, and when each last came back.
class Fleet {
 public:
  bool add(const std::string& plate, const std::string& category) {
    if (plate.empty()) return false;
    return cars_.emplace(plate, Car{category, false, false, 0}).second;
  }

  int countIn(const std::string& category) const {
    int count = 0;
    for (const auto& [plate, car] : cars_) count += car.category == category ? 1 : 0;
    return count;
  }

  std::vector<IdleCar> idleIn(const std::string& category) const {
    std::vector<IdleCar> idle;
    for (const auto& [plate, car] : cars_) {
      if (car.category == category && !car.out) idle.push_back(IdleCar{plate, car.everReturned, car.returnedAt});
    }
    return idle;
  }

  void takeOut(const std::string& plate) { cars_.at(plate).out = true; }
  void bringBack(const std::string& plate, long long hour) {
    Car& car = cars_.at(plate);
    car.out = false;
    car.everReturned = true;
    car.returnedAt = hour;
  }

 private:
  struct Car {
    std::string category;
    bool out;
    bool everReturned;
    long long returnedAt;
  };
  std::map<std::string, Car> cars_;
};


// Decides which of the idle cars goes out next. A Strategy: the facade never learns the rule.
class CarChooser {
 public:
  virtual ~CarChooser() = default;
  // `idle` is never empty.
  virtual std::string choose(const std::vector<IdleCar>& idle) const = 0;
};

class LowestPlate : public CarChooser {
 public:
  std::string choose(const std::vector<IdleCar>& idle) const override {
    return std::min_element(idle.begin(), idle.end(), [](const IdleCar& a, const IdleCar& b) { return a.plate < b.plate; })
        ->plate;
  }
};

// The car that has waited longest. Cars never returned have waited forever; ties go to the lower plate.
class LongestIdle : public CarChooser {
 public:
  std::string choose(const std::vector<IdleCar>& idle) const override {
    return std::min_element(idle.begin(), idle.end(), &LongestIdle::waitsLess)->plate;
  }

 private:
  static bool waitsLess(const IdleCar& a, const IdleCar& b) {
    if (a.everReturned != b.everReturned) return !a.everReturned;
    if (a.everReturned && a.returnedAt != b.returnedAt) return a.returnedAt < b.returnedAt;
    return a.plate > b.plate;
  }
};


constexpr int kPercentDivisor = 100;

// What a car that comes back `lateHours` after its drop-off hour costs on top of the total.
class LateFee {
 public:
  virtual ~LateFee() = default;
  virtual rental::Money extra(rental::Money dailyRate, long long lateHours) const = 0;
};

class NoLateFee : public LateFee {
 public:
  rental::Money extra(rental::Money, long long) const override { return 0; }
};

class GraceThenPercent : public LateFee {
 public:
  GraceThenPercent(int graceHours, int percentPerHour) : grace_(graceHours), percent_(percentPerHour) {}

  static bool isValid(int graceHours, int percentPerHour) {
    return graceHours >= 0 && percentPerHour >= 0 && percentPerHour <= kMaxPercent;
  }

  rental::Money extra(rental::Money dailyRate, long long lateHours) const override {
    const long long billable = std::max(0LL, lateHours - grace_);
    return dailyRate * billable * percent_ / kPercentDivisor;
  }

 private:
  static constexpr int kMaxPercent = 1000;
  int grace_;
  int percent_;
};


struct Booking {
  std::string customer;
  std::string category;
  TimeSpan span;
  rental::Money total;
  std::string plate;  // empty until the car is collected
};

inline bool isCollected(const Booking& booking) { return !booking.plate.empty(); }

// The records of promises: who holds which reservation. Issues ids and spends them: a removed record looks never issued.
class Bookings {
 public:
  rental::ReservationId add(Booking booking) {
    const rental::ReservationId id = ++lastId_;
    records_.emplace(id, std::move(booking));
    return id;
  }
  Booking* find(rental::ReservationId id) {
    const auto it = records_.find(id);
    return it == records_.end() ? nullptr : &it->second;
  }
  void remove(rental::ReservationId id) { records_.erase(id); }

 private:
  rental::ReservationId lastId_ = rental::kNoReservation;
  std::map<rental::ReservationId, Booking> records_;
};


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

std::unique_ptr<rental::Rentals> rental::makeRentals(std::shared_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<RentalsImpl>(std::move(clock), std::make_unique<LowestPlate>(), std::make_unique<NoLateFee>());
}

std::unique_ptr<rental::Rentals> rental::makeLateFeeRentals(std::shared_ptr<Clock> clock, int graceHours,
                                                            int percentPerHour) {
  if (clock == nullptr || !GraceThenPercent::isValid(graceHours, percentPerHour)) return nullptr;
  return std::make_unique<RentalsImpl>(std::move(clock), std::make_unique<LowestPlate>(),
                                       std::make_unique<GraceThenPercent>(graceHours, percentPerHour));
}

std::unique_ptr<rental::Rentals> rental::makeRotatingRentals(std::shared_ptr<Clock> clock, int graceHours,
                                                             int percentPerHour) {
  if (clock == nullptr || !GraceThenPercent::isValid(graceHours, percentPerHour)) return nullptr;
  return std::make_unique<RentalsImpl>(std::move(clock), std::make_unique<LongestIdle>(),
                                       std::make_unique<GraceThenPercent>(graceHours, percentPerHour));
}
