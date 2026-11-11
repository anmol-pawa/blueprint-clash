#include "parking_service.h"

using park::Status;

Status ParkingService::addSpot(const std::string& spotId, park::SpotSize size) {
  return spots_.add(spotId, size) ? Status::Ok : Status::DuplicateId;
}

park::Ticket ParkingService::park(const std::string& plate, park::Vehicle vehicle) {
  if (tickets_.isInside(plate)) return {Status::AlreadyParked, "", ""};
  std::string spotId = spots_.occupyBestFit(vehicle);
  if (spotId.empty()) return {Status::LotFull, "", ""};
  std::string ticketId = tickets_.open(Stay{plate, vehicle, spotId});
  return {Status::Ok, ticketId, spotId};
}

park::Receipt ParkingService::leave(const std::string& ticketId, int minutesParked) {
  auto stay = tickets_.close(ticketId);
  if (!stay) return {Status::NoSuchTicket, 0, ""};
  spots_.release(stay->spotId);
  return {Status::Ok, fees_->feeCents(stay->vehicle, minutesParked), stay->spotId};
}

std::unique_ptr<park::ParkingLot> park::makeParkingLot() {
  return std::make_unique<ParkingService>(std::make_unique<HourlyFeePolicy>(100));
}

std::unique_ptr<park::ParkingLot> park::makePricedParkingLot() {
  return std::make_unique<ParkingService>(std::make_unique<RatedFeePolicy>(std::array<long long, 3>{50, 100, 200}, 15));
}
