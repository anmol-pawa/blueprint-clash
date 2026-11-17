#pragma once
// Public API for the Food delivery problem. The hidden tests only use what is declared here.
// You implement food::makeFood() (in any of your .cpp files); everything behind it is your design.
#include <functional>
#include <memory>
#include <string>
#include <vector>

namespace food {

using OrderId = long long;
constexpr OrderId kNoOrder = 0;  // ids that are issued are always positive and never reused
using Money = long long;         // whole cents

constexpr Money kDeliveryFee = 299;      // added to every order, never discounted
constexpr int kMaxQuantity = 20;         // per line
constexpr int kCookingFeePercent = 25;   // of the food, when the customer cancels an Accepted order

enum class Status {
  Ok,
  InvalidRequest,     // empty name, no lines, a quantity outside 1..kMaxQuantity
  UnknownRestaurant,
  UnknownItem,        // a line names something that is not on that restaurant's menu
  UnknownOrder,
  WrongParty,         // the restaurant, courier or customer is not the one on this order
  InvalidState,       // the order is not in a state where this is allowed
  UnknownPromo,       // used from Change Storm 1
  PromoNotApplicable, // used from Change Storm 1
  KitchenFull,        // used from Change Storm 2
};

enum class OrderState { Placed, Accepted, Ready, PickedUp, Delivered, Rejected, Cancelled };

struct MenuItem {
  std::string name;
  Money price = 0;  // cents, at least 1
};

struct Line {
  std::string item;
  int quantity = 1;
};

struct PlaceResult {
  Status status = Status::Ok;
  OrderId order = kNoOrder;  // kNoOrder unless status is Ok
  Money total = 0;           // 0 unless status is Ok; food plus kDeliveryFee, fixed from now on
};

struct CancelResult {
  Status status = Status::Ok;
  Money fee = 0;  // what the customer is charged for cancelling; 0 unless status is Ok
};

struct OrderInfo {
  Status status = Status::Ok;  // UnknownOrder when no such order was ever issued
  OrderState state = OrderState::Placed;
  std::string customer;
  std::string restaurant;
  std::string courier;  // empty until a courier has been assigned; kept after delivery
  Money total = 0;
};

// Called once for every change of state of every order, in the order the changes happen. It is NOT called when a
// courier is assigned (that is not a change of state).
using Listener = std::function<void(OrderId, OrderState from, OrderState to)>;

class Food {
 public:
  virtual ~Food() = default;

  // Registers a restaurant and its menu. Returns false, changing nothing, for an empty name, a name already
  // registered, an empty menu, or a menu item with an empty name, a price below 1 or the same name as another item.
  virtual bool addRestaurant(const std::string& restaurant, const std::vector<MenuItem>& menu) = 0;

  // Registers a courier, who is free at once. Returns false for an empty or an already registered name. If an order
  // is waiting for a courier (see ready), the oldest one is given to the new courier.
  virtual bool registerCourier(const std::string& courier) = 0;

  // Adds a listener. Listeners are called in the order they were added.
  virtual void subscribe(Listener listener) = 0;

  // Places an order: food = sum of price * quantity over the lines (the same item may appear in several lines);
  // total = food + kDeliveryFee, fixed now. Checks in order: InvalidRequest, UnknownRestaurant, UnknownItem.
  // A failed call changes nothing. The order starts Placed.
  virtual PlaceResult place(const std::string& customer, const std::string& restaurant, const std::vector<Line>& lines) = 0;

  // Order lifecycle: Placed -> Accepted -> Ready -> PickedUp -> Delivered, or Rejected / Cancelled. Every call checks,
  // in this order: UnknownOrder, WrongParty (the caller is not this order's restaurant / courier / customer),
  // InvalidState. A failed call changes nothing.
  //
  // accept / reject: the RESTAURANT answers a Placed order. Placed -> Accepted, or Placed -> Rejected.
  // ready:           the RESTAURANT finishes cooking. Accepted -> Ready. The order is then given to the free courier
  //                  with the LOWEST NAME; with nobody free it waits, unassigned, and is given to the next courier
  //                  who becomes free (oldest waiting order first, by order id).
  // pickUp:          the order's ASSIGNED courier collects it. Ready -> PickedUp. (An unassigned order has no
  //                  assigned courier, so every courier gets WrongParty.)
  // deliver:         the same courier hands it over. PickedUp -> Delivered. The courier is free again and takes the
  //                  oldest waiting order, if any.
  virtual Status accept(OrderId order, const std::string& restaurant) = 0;
  virtual Status reject(OrderId order, const std::string& restaurant) = 0;
  virtual Status ready(OrderId order, const std::string& restaurant) = 0;
  virtual Status pickUp(OrderId order, const std::string& courier) = 0;
  virtual Status deliver(OrderId order, const std::string& courier) = 0;

  // The CUSTOMER cancels. Allowed from Placed (fee 0), Accepted (fee = food * kCookingFeePercent / 100, rounded down)
  // and Ready (fee = the whole food, the delivery fee is never charged). From PickedUp, Delivered, Rejected or
  // Cancelled it is InvalidState. Checks: UnknownOrder, WrongParty, InvalidState. A courier assigned to the order is
  // free again at once and takes the oldest waiting order; a waiting order is simply removed from the queue.
  virtual CancelResult cancel(OrderId order, const std::string& customer) = 0;

  // Orders are never forgotten, so finished orders can be inspected.
  virtual OrderInfo order(OrderId order) const = 0;
};

// Always returns a working system.
std::unique_ptr<Food> makeFood();

}  // namespace food
