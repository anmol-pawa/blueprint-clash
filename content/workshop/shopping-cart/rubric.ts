import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public operations, validates a request in the documented order and sequences the collaborators", phase: "base", owners: ["ShopImpl", "ShopService", "Storefront", "ShoppingService", "ShopFacade"] },
  { id: "res-catalog", text: "Knows what each product costs and which products exist", phase: "base", owners: ["Catalog", "ProductCatalog", "PriceList", "ProductRegistry", "Products"] },
  { id: "res-inventory", text: "Counts units on the shelf and moves the stock of a whole set of lines all or nothing", phase: "base", owners: ["Inventory", "StockRoom", "StockLedger", "Stock", "Warehouse"] },
  { id: "res-carts", text: "Keeps one wish list per customer and the rules about its lines (merging, removing, emptying)", phase: "base", owners: ["CartBook", "CartStore", "Carts", "CartRepository", "CartRegistry"] },
  { id: "res-orders", text: "Records what was bought, by whom and for how much; issues order ids and spends them on cancel", phase: "base", owners: ["OrderLedger", "OrderBook", "Orders", "OrderStore", "OrderRepository"] },
  { id: "res-discount", text: "Says how much one kind of coupon takes off, behind an interface so a new kind is a new class", phase: "storm1", owners: ["Discount", "DiscountRule", "Coupon", "PricingRule", "Promotion"] },
  { id: "res-pricer", text: "Turns a cart into a total: prices the lines, then folds the attached discounts over them in order", phase: "storm1", owners: ["Pricer", "PriceEngine", "PriceCalculator", "DiscountEngine", "Pricing"] },
  { id: "res-stacking", text: "Knows which coupons exist and which are attached to whose cart, in order, and enforces what may combine", phase: "storm2", owners: ["CouponBook", "CouponRegistry", "CouponWallet", "CouponStore", "Coupons"] },
];
