import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-catalog", text: "Knows the slots, their prices and what is left in each", phase: "base", owners: ["SlotCatalog", "Inventory", "Slots", "Catalog", "ProductCatalog"] },
  { id: "res-credit", text: "Knows the money inserted and decides which coins are valid", phase: "base", owners: ["Till", "Wallet", "CoinBox", "CreditPurse", "Credit"] },
  { id: "res-stage", text: "Decides what each button or coin does at this stage of the purchase, with one place per stage", phase: "base", owners: ["MachineState", "IdleState", "HasCreditState", "State"] },
  { id: "res-facade", text: "Exposes the public operations and switches stage", phase: "base", owners: ["VendingMachineImpl", "MachineCore", "VendingMachineService", "Machine", "VendingMachineContext"] },
  { id: "res-maint", text: "Knows what maintenance changes, without editing the other stages", phase: "storm1", owners: ["MaintenanceState", "OutOfServiceState", "ServiceState"] },
];
