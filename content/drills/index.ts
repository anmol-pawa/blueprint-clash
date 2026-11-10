import type { Responsibility } from "@/lib/workshop/types";
import { cls, edge, m, pure, type BoardDrill } from "./types";

const R = (id: string, text: string, owners: string[]): Responsibility => ({ id, text, phase: "base", owners });

const parkingLot: BoardDrill = {
  id: "parking-lot",
  title: "Parking lot",
  brief:
    "A multi-level parking lot with motorbike, car and truck spots. A vehicle enters, gets a ticket and a spot; on exit it pays a fee that depends on the time parked and the vehicle type. Model the classes.",
  facade: "ParkingLot",
  rubric: [
    R("allocate", "Chooses a free spot that fits a vehicle", ["SpotAllocator", "SpotAllocationStrategy", "NearestSpotAllocator"]),
    R("occupancy", "Knows whether a spot is occupied and what size it is", ["ParkingSpot", "Spot"]),
    R("ticket", "Issues a ticket that records the entry time and spot", ["TicketIssuer", "TicketService"]),
    R("fee", "Computes the fee from duration and vehicle type", ["FeePolicy", "PricingPolicy", "HourlyFeePolicy"]),
    R("flow", "Coordinates entry and exit across allocator, tickets and fees", ["ParkingLot", "ParkingLotService"]),
  ],
  reference: {
    classes: [
      cls("lot", "ParkingLot", { responsibilities: ["flow"], methods: [m("enter", "std::optional<Ticket>", "const Vehicle& v"), m("exit", "std::optional<Money>", "const Ticket& t")] }),
      cls("alloc", "SpotAllocator", { kind: "interface", responsibilities: ["allocate"], methods: [pure("pick", "ParkingSpot*", "VehicleSize size", false)] }),
      cls("near", "NearestSpotAllocator", { methods: [m("pick", "ParkingSpot*", "VehicleSize size")] }),
      cls("spot", "ParkingSpot", { responsibilities: ["occupancy"], fields: [{ name: "size_", type: "VehicleSize" }, { name: "occupied_", type: "bool" }] }),
      cls("issuer", "TicketIssuer", { responsibilities: ["ticket"], methods: [m("issue", "Ticket", "const ParkingSpot& s")] }),
      cls("fee", "FeePolicy", { kind: "interface", responsibilities: ["fee"], methods: [pure("charge", "Money", "const Ticket& t, Duration d")] }),
      cls("hourly", "HourlyFeePolicy", { methods: [m("charge", "Money", "const Ticket& t, Duration d", { isConst: true })] }),
    ],
    edges: [
      edge("1", "lot", "alloc", "aggregation", "1"),
      edge("2", "lot", "issuer", "composition", "1"),
      edge("3", "lot", "fee", "aggregation", "1"),
      edge("4", "lot", "spot", "composition", "*"),
      edge("5", "near", "alloc", "implements"),
      edge("6", "hourly", "fee", "implements"),
      edge("7", "alloc", "spot", "dependency"),
    ],
  },
  tradeoffs: [
    "Spot allocation is an interface because 'nearest to the entrance' is the first of several plausible rules (cheapest level, EV-ready first). With one rule and no hint of more, a plain method on ParkingLot is smaller and fine; the seam pays off the moment the interviewer says 'now prefer spots near the lift'.",
    "FeePolicy is a seam for the same reason: pricing is the part product teams change most. Keeping it away from ParkingSpot means a new tariff never touches the spot or ticket code.",
    "Vehicle subclasses (Car, Bike, Truck) are deliberately absent: only the size differs, so an enum is enough. Inheritance here would be the usual over-modelling mistake.",
  ],
  levelSignal:
    "SDE II: the five responsibilities each have a clear owner. Senior: names the two seams (allocation, pricing) and says why Vehicle is not a hierarchy. Staff: raises concurrency on the entry gate (two cars racing for the last spot) and where the lock lives.",
};

const elevator: BoardDrill = {
  id: "elevator",
  title: "Elevator system",
  brief:
    "A building has several elevators. People press a hall button (up or down) and then a floor button inside the car. Decide which car answers each hall call and model how a car moves and stops.",
  facade: "ElevatorController",
  rubric: [
    R("dispatch", "Decides which car answers a hall call", ["DispatchStrategy", "Dispatcher", "NearestCarDispatcher"]),
    R("stops", "Keeps a car's pending stops and the next floor to visit", ["Car", "ElevatorCar", "StopQueue"]),
    R("state", "Knows whether a car is idle, moving up/down or has its doors open", ["Car", "ElevatorCar", "CarState"]),
    R("buttons", "Turns a button press into a request", ["ElevatorController", "RequestRouter", "Panel"]),
  ],
  reference: {
    classes: [
      cls("ctl", "ElevatorController", { responsibilities: ["buttons"], methods: [m("hallCall", "void", "int floor, Direction d"), m("carCall", "void", "int car, int floor")] }),
      cls("disp", "DispatchStrategy", { kind: "interface", responsibilities: ["dispatch"], methods: [pure("choose", "int", "const std::vector<Car>& cars, const Request& r")] }),
      cls("nearest", "NearestCarDispatcher", { methods: [m("choose", "int", "const std::vector<Car>& cars, const Request& r", { isConst: true })] }),
      cls("car", "Car", { responsibilities: ["stops", "state"], fields: [{ name: "floor_", type: "int" }, { name: "state_", type: "CarState" }, { name: "stops_", type: "std::set<int>" }], methods: [m("addStop", "void", "int floor"), m("step", "void")] }),
      cls("st", "CarState", { kind: "enum" }),
    ],
    edges: [
      edge("1", "ctl", "disp", "aggregation", "1"),
      edge("2", "ctl", "car", "composition", "1..*"),
      edge("3", "nearest", "disp", "implements"),
      edge("4", "car", "st", "association", "1"),
      edge("5", "disp", "car", "dependency"),
    ],
  },
  tradeoffs: [
    "Car owns both its stop list and its state: they change together (a stop arriving changes the state), so splitting them across classes would force two objects to be edited in lockstep.",
    "Dispatch is the interface because the interesting interview follow-ups (zoning, peak-hour policy, energy saving) all live there. The nearest-car rule is the baseline, and its known weakness is that a car heading the wrong way can look 'nearest'.",
    "A full State-pattern hierarchy (IdleState, MovingUpState...) is the alternative to the enum. It wins when states carry different behaviour beyond movement; with only three states and one step() method, an enum plus a switch inside Car is the honest choice.",
  ],
  levelSignal:
    "SDE II: separates controller, dispatcher and car. Senior: justifies the enum over the State pattern and names the nearest-car failure case. Staff: discusses fairness and starvation of far-away requests and testing the scheduler with a fake clock.",
};

const vending: BoardDrill = {
  id: "vending-machine",
  title: "Vending machine",
  brief:
    "A machine sells items from slots. A customer inserts coins, picks a slot, receives the item and change. It can run out of stock, refuse to give change, or be refilled by staff. Model the classes.",
  facade: "VendingMachine",
  rubric: [
    R("stock", "Knows how many items each slot holds and takes one out", ["Inventory", "Slot", "StockBook"]),
    R("cash", "Holds the coins inserted and works out the change", ["CashBox", "PaymentSession", "ChangeMaker"]),
    R("state", "Decides which actions are legal right now (idle, has money, dispensing)", ["VendingMachine", "MachineState", "State"]),
    R("price", "Knows the price of each slot", ["Inventory", "Slot", "PriceList"]),
  ],
  reference: {
    classes: [
      cls("vm", "VendingMachine", { responsibilities: ["state"], fields: [{ name: "state_", type: "MachineState" }], methods: [m("insert", "void", "Coin c"), m("select", "bool", "int slot"), m("cancel", "Money")] }),
      cls("inv", "Inventory", { responsibilities: ["stock", "price"], methods: [m("take", "bool", "int slot"), m("priceOf", "Money", "int slot", { isConst: true })] }),
      cls("cash", "CashBox", { responsibilities: ["cash"], methods: [m("insert", "void", "Coin c"), m("makeChange", "std::optional<std::vector<Coin>>", "Money amount")] }),
      cls("ms", "MachineState", { kind: "enum" }),
    ],
    edges: [
      edge("1", "vm", "inv", "composition", "1"),
      edge("2", "vm", "cash", "composition", "1"),
      edge("3", "vm", "ms", "association", "1"),
    ],
  },
  tradeoffs: [
    "Change-making returns std::optional: 'cannot make change' is a normal outcome the machine must handle (refund and refuse), not an exception.",
    "State is an enum inside VendingMachine because transitions are few and all live in two methods. Past about five states, or when each state needs different data, the State pattern earns its extra classes.",
    "Inventory owning price keeps one lookup for 'what is in slot 3 and what does it cost'. Splitting a PriceList out is better only if prices change independently of stock (dynamic pricing).",
  ],
  levelSignal:
    "SDE II: a working three-class model with the state called out. Senior: handles 'cannot make change' and refund paths explicitly. Staff: discusses atomicity of dispense plus payment, and recovery if power fails mid-vend.",
};

const notifications: BoardDrill = {
  id: "notification-service",
  title: "Notification service",
  brief:
    "An app sends notifications by email, SMS or push. Users choose which channels they want. Sends can fail transiently and must be retried a limited number of times. Model the classes.",
  facade: "NotificationService",
  rubric: [
    R("deliver", "Sends one message over one specific channel", ["Channel", "EmailChannel", "SmsChannel", "PushChannel"]),
    R("prefs", "Knows which channels a user has enabled", ["PreferenceStore", "UserPreferences", "Preferences"]),
    R("retry", "Decides whether and when to retry a failed send", ["RetryPolicy", "BackoffRetryPolicy"]),
    R("flow", "Fans a notification out to the user's channels and applies retries", ["NotificationService", "Notifier"]),
  ],
  reference: {
    classes: [
      cls("svc", "NotificationService", { responsibilities: ["flow"], methods: [m("send", "void", "const User& u, const Message& msg")] }),
      cls("ch", "Channel", { kind: "interface", responsibilities: ["deliver"], methods: [pure("deliver", "bool", "const User& u, const Message& msg", false)] }),
      cls("email", "EmailChannel", { methods: [m("deliver", "bool", "const User& u, const Message& msg")] }),
      cls("sms", "SmsChannel", { methods: [m("deliver", "bool", "const User& u, const Message& msg")] }),
      cls("prefs", "PreferenceStore", { responsibilities: ["prefs"], methods: [m("enabledChannels", "std::vector<std::string>", "const User& u", { isConst: true })] }),
      cls("retry", "RetryPolicy", { kind: "interface", responsibilities: ["retry"], methods: [pure("nextDelay", "std::optional<Duration>", "int attempt")] }),
    ],
    edges: [
      edge("1", "svc", "ch", "aggregation", "*"),
      edge("2", "svc", "prefs", "aggregation", "1"),
      edge("3", "svc", "retry", "aggregation", "1"),
      edge("4", "email", "ch", "implements"),
      edge("5", "sms", "ch", "implements"),
    ],
  },
  tradeoffs: [
    "Channel is an interface because adding push or WhatsApp must be one new class and one registration. The cost is a lowest-common-denominator API; channel-specific features (rich email bodies) need a richer Message, not a channel-aware service.",
    "Retry is a policy object rather than a loop in the service so tests can use a no-delay policy and so backoff rules can change without touching fan-out.",
    "In a real system retries move off the request path to a queue with a dead-letter store; on a whiteboard class diagram, the policy seam is the part to model and the queue is a one-line aside.",
  ],
  levelSignal:
    "SDE II: channel interface with at least two implementations. Senior: separates preferences and retry from fan-out. Staff: raises idempotency (a retried send must not double-notify), ordering, and rate limits per provider.",
};

export const BOARD_DRILLS: BoardDrill[] = [parkingLot, elevator, vending, notifications];
export const DRILL_BY_ID: Record<string, BoardDrill> = Object.fromEntries(BOARD_DRILLS.map((d) => [d.id, d]));
