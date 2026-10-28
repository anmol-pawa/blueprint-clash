import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-catalog", text: "Knows which books exist and how many copies are on the shelf", phase: "base", owners: ["Catalog", "Inventory", "BookCatalog"] },
  { id: "res-members", text: "Knows which members exist and which books each holds", phase: "base", owners: ["Member", "MemberRegistry", "Members"] },
  { id: "res-policy", text: "Decides whether a member may borrow another book (the limit)", phase: "base", owners: ["LoanPolicy", "BorrowPolicy", "FixedLimitPolicy"] },
  { id: "res-facade", text: "Coordinates a borrow or return across catalog, member and policy", phase: "base", owners: ["LibraryService", "LibraryImpl", "Lending"] },
];
