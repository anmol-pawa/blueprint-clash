#pragma once
#include <memory>
#include <utility>

#include "api_storm1.h"
#include "fee_policy.h"
#include "spot_inventory.h"
#include "ticket_book.h"

// Coordinates arrival and departure across spots, tickets and pricing.
// Every operation validates first and mutates last, so a failed call changes nothing.
class ParkingService : public park::ParkingLot {
 public:
  explicit ParkingService(std::unique_ptr<FeePolicy> fees) : fees_(std::move(fees)) {}

  park::Status addSpot(const std::string& spotId, park::SpotSize size) override;
  park::Ticket park(const std::string& plate, park::Vehicle vehicle) override;
  park::Receipt leave(const std::string& ticketId, int minutesParked) override;
  int freeSpots(park::SpotSize size) const override { return spots_.freeCount(size); }
  std::string spotOf(const std::string& plate) const override { return tickets_.spotOf(plate); }

 private:
  SpotInventory spots_;
  TicketBook tickets_;
  std::unique_ptr<FeePolicy> fees_;
};
