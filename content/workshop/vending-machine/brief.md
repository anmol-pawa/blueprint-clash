# Vending machine

You are writing the control software of a snack vending machine. A customer **inserts coins**, **presses a slot button**, and the machine **dispenses** the product and gives back **change**. Staff stock the slots.

What you know so far:

- The machine has slots, each with a product name, a price and a quantity.
- Customers pay with coins and can press cancel to get their money back.
- Pressing a slot button after paying dispenses one unit and returns the change.
- Staff can set up slots and add stock.

Your task: design and implement it behind the `vend::VendingMachine` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete.
