# Shopping cart and discount engine

You are writing the core of a small online shop. Customers put products in a cart, check out, and sometimes change their minds. The shop must never sell a unit it does not have, and the price a customer is charged must be one the shop can explain.

What you know so far:

- The shop sells products, each with a price and a number of units on the shelf.
- A customer has a cart. Products go in and come out of it.
- Checking out turns a cart into an order.
- Orders can be cancelled.

Your task: design and implement it behind the `cart::Shop` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "does a full cart hold stock for me?" is where most first drafts go wrong. Expect the pricing rules to change after you have finished.
