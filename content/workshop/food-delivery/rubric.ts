import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations and sequences the collaborators; it holds no rule about prices, fees or legal moves", phase: "base", owners: ["FoodImpl", "FoodService", "FoodSystem", "OrderService", "FoodFacade"] },
  { id: "res-menu", text: "Knows what each restaurant sells and for how much", phase: "base", owners: ["Menu", "MenuBook", "Catalog", "Restaurants", "RestaurantCatalog"] },
  { id: "res-desk", text: "Validates a request in the documented order, prices it and records the new order", phase: "base", owners: ["OrderDesk", "Checkout", "OrderFactory", "OrderPlacer", "OrderService"] },
  { id: "res-lifecycle", text: "Owns the order state machine: which moves are legal, written once, and the single place where a state changes", phase: "base", owners: ["OrderBook", "OrderLifecycle", "OrderStateMachine", "OrderRepository", "Orders"] },
  { id: "res-observer", text: "Announces every change of state to subscribed listeners (Observer), in subscription order", phase: "base", owners: ["OrderBook", "TransitionFeed", "EventPublisher", "OrderEvents", "Notifier"] },
  { id: "res-couriers", text: "Knows which couriers are free and queues ready orders that have none, oldest first", phase: "base", owners: ["CourierPool", "Dispatcher", "CourierDispatcher", "Couriers", "DispatchQueue"] },
  { id: "res-fee", text: "Decides what a cancellation costs for the stage the order has reached, behind an interface", phase: "base", owners: ["CancellationFee", "CancelPolicy", "FeePolicy", "CancellationPolicy", "StageFee"] },
  { id: "res-promo", text: "Decides what a code takes off the food and whether it applies", phase: "storm1", owners: ["PromoBook", "Discount", "PromoRule", "PromoCatalog", "Promotions"] },
  { id: "res-kitchen", text: "Counts what each kitchen is cooking and says whether it has a place free", phase: "storm2", owners: ["KitchenLoad", "KitchenCapacity", "Kitchens", "KitchenTracker", "Capacity"] },
];
