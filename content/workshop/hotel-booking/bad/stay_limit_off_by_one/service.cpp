// MUTATION: the longest stay is 29 nights.
#include <algorithm>
#include <map>
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>
#include "api_storm2.h"

// A stay as a half-open range of nights: checkIn is the first night, checkOut is the day the guest leaves and is
// NOT a night. Every question about nights, length and "how far away" is answered here and nowhere else.
class StayRange {
 public:
  StayRange(long long checkIn, long long checkOut) : in_(checkIn), out_(checkOut) {}

  bool isValid() const { return out_ > in_ && out_ - in_ < hotel::kMaxNights; }
  long long firstNight() const { return in_; }
  long long endDay() const { return out_; }  // one past the last night
  bool startsBefore(long long day) const { return in_ < day; }
  bool hasStartedBy(long long today) const { return in_ <= today; }
  long long daysUntilStart(long long today) const { return in_ - today; }

 private:
  long long in_;
  long long out_;
};



// How many rooms of ONE type are taken on each night. Sparse: a night nobody booked has no entry. A stay is
// available only as far as its tightest night, so availability is the minimum over the nights.
class RoomCalendar {
 public:
  explicit RoomCalendar(int rooms) : rooms_(rooms) {}

  int freeFor(const StayRange& stay) const {
    int free = rooms_;
    for (long long night = stay.firstNight(); night < stay.endDay(); ++night) free = std::min(free, rooms_ - takenOn(night));
    return free;
  }

  // The caller has checked freeFor(stay) >= 1.
  void take(const StayRange& stay) {
    for (long long night = stay.firstNight(); night < stay.endDay(); ++night) ++taken_[night];
  }

  // Gives back exactly one room per night: other guests' rooms on the same nights stay taken.
  void give(const StayRange& stay) {
    for (long long night = stay.firstNight(); night < stay.endDay(); ++night) --taken_[night];
  }

 private:
  int takenOn(long long night) const {
    const auto it = taken_.find(night);
    return it == taken_.end() ? 0 : it->second;
  }

  int rooms_;
  std::map<long long, int> taken_;
};



// One source of nightly prices. Rules are asked in priority order; the first one with an answer decides.
class RateRule {
 public:
  virtual ~RateRule() = default;
  virtual std::optional<hotel::Money> rateFor(const std::string& type, long long night) const = 0;
};

// The normal rate of each room type, set when the type is added.
class BaseRates : public RateRule {
 public:
  void set(const std::string& type, hotel::Money rate) { rates_[type] = rate; }
  std::optional<hotel::Money> rateFor(const std::string& type, long long) const override {
    const auto it = rates_.find(type);
    if (it == rates_.end()) return std::nullopt;
    return it->second;
  }

 private:
  std::map<std::string, hotel::Money> rates_;
};

// Seasonal overrides. The season added last wins where seasons overlap, so the list is searched newest first.
class SeasonRates : public RateRule {
 public:
  void add(const std::string& type, long long fromDay, long long toDay, hotel::Money rate) {
    seasons_.push_back(Season{type, fromDay, toDay, rate});
  }

  std::optional<hotel::Money> rateFor(const std::string& type, long long night) const override {
    for (auto it = seasons_.rbegin(); it != seasons_.rend(); ++it) {
      if (it->type == type && night >= it->from && night < it->to) return it->rate;
    }
    return std::nullopt;
  }

 private:
  struct Season {
    std::string type;
    long long from;
    long long to;
    hotel::Money rate;
  };
  std::vector<Season> seasons_;
};

// The price of a stay: the nights' rates added up. Booking and quoting both call total(), so they cannot disagree.
class Pricing {
 public:
  void setBase(const std::string& type, hotel::Money rate) { base_.set(type, rate); }
  void addSeason(const std::string& type, long long from, long long to, hotel::Money rate) {
    seasons_.add(type, from, to, rate);
  }

  hotel::Money total(const std::string& type, const StayRange& stay) const {
    hotel::Money sum = 0;
    for (long long night = stay.firstNight(); night < stay.endDay(); ++night) sum += nightly(type, night);
    return sum;
  }

 private:
  hotel::Money nightly(const std::string& type, long long night) const {
    const std::optional<hotel::Money> seasonal = seasons_.rateFor(type, night);
    return seasonal.has_value() ? *seasonal : *base_.rateFor(type, night);
  }

  BaseRates base_;
  SeasonRates seasons_;
};



// A reservation as it was made. The total is fixed at booking time and never recomputed.
struct Reservation {
  std::string guest;
  std::string type;
  StayRange stay;
  hotel::Money total;
};

// Who holds which reservation. Ids are positive, increasing and never reused; cancelling removes the record, so
// "cancelled" and "never issued" look the same, as the API says.
class ReservationBook {
 public:
  hotel::ReservationId add(Reservation reservation) {
    const hotel::ReservationId id = nextId_++;
    records_.emplace(id, std::move(reservation));
    return id;
  }

  const Reservation* find(hotel::ReservationId id) const {
    const auto it = records_.find(id);
    return it == records_.end() ? nullptr : &it->second;
  }

  void remove(hotel::ReservationId id) { records_.erase(id); }

 private:
  hotel::ReservationId nextId_ = 1;
  std::map<hotel::ReservationId, Reservation> records_;
};



// Decides how much of a total is paid back when a stay is cancelled `daysBefore` days ahead. A Strategy so that
// "no refunds" is not a special case in the cancellation code.
class RefundPolicy {
 public:
  virtual ~RefundPolicy() = default;
  virtual hotel::Money refund(hotel::Money total, long long daysBefore) const = 0;
};

class NoRefund : public RefundPolicy {
 public:
  hotel::Money refund(hotel::Money, long long) const override { return 0; }
};

// The tier with the largest daysBefore that is still <= the days remaining applies, whatever order they came in.
class TieredRefund : public RefundPolicy {
 public:
  explicit TieredRefund(std::vector<hotel::RefundTier> tiers) : tiers_(std::move(tiers)) {
    std::sort(tiers_.begin(), tiers_.end(),
              [](const hotel::RefundTier& a, const hotel::RefundTier& b) { return a.daysBefore > b.daysBefore; });
  }

  hotel::Money refund(hotel::Money total, long long daysBefore) const override {
    for (const hotel::RefundTier& tier : tiers_) {
      if (tier.daysBefore <= daysBefore) return total * tier.percent / 100;
    }
    return 0;
  }

  // True when the tiers are usable: sane numbers, no two with the same daysBefore.
  static bool areValid(const std::vector<hotel::RefundTier>& tiers) {
    for (std::size_t i = 0; i < tiers.size(); ++i) {
      if (tiers[i].percent < 0 || tiers[i].percent > 100 || tiers[i].daysBefore < 0) return false;
      for (std::size_t j = i + 1; j < tiers.size(); ++j) {
        if (tiers[i].daysBefore == tiers[j].daysBefore) return false;
      }
    }
    return true;
  }

 private:
  std::vector<hotel::RefundTier> tiers_;
};



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


std::unique_ptr<hotel::Hotel> hotel::makeHotel(std::shared_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<HotelImpl>(std::move(clock), std::make_unique<NoRefund>());
}

std::unique_ptr<hotel::SeasonalHotel> hotel::makeSeasonalHotel(std::shared_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<HotelImpl>(std::move(clock), std::make_unique<NoRefund>());
}

std::unique_ptr<hotel::RefundingHotel> hotel::makeRefundingHotel(std::shared_ptr<Clock> clock,
                                                                 std::vector<RefundTier> tiers) {
  if (clock == nullptr || !TieredRefund::areValid(tiers)) return nullptr;
  return std::make_unique<HotelImpl>(std::move(clock), std::make_unique<TieredRefund>(std::move(tiers)));
}
