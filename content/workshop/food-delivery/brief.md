# Food delivery

You are writing the order core for a food-delivery startup in one city. Customers order from a restaurant's menu, the kitchen cooks, a courier brings it, and the order moves through a handful of stages until it arrives or somebody calls it off.

What you know so far:

- Restaurants have menus with prices. A customer orders a few items from one restaurant and is told the total up front.
- A restaurant accepts or turns down an order, cooks it and says when it is ready. A courier then collects it and hands it over.
- Customers change their minds. What that costs depends on how far the kitchen has got.
- Other parts of the product (notifications, analytics) want to know whenever an order changes stage.

Your task: design and implement it behind the `food::Food` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer first: the brief is deliberately incomplete, and "who gets a ready order when no courier is free, and when does a cancel cost money?" is where most first drafts go wrong.
