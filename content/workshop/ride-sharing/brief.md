# Ride sharing

You are writing the dispatch core for a ride-hailing startup in one city. Riders ask for a trip, the system finds a driver, and the trip moves through a handful of stages until the rider is dropped off or the trip is called off.

What you know so far:

- The city is a grid. Drivers have a position, can go online or offline, and can only take one trip at a time.
- A rider asks for a trip from one point to another. The system picks a driver for them and tells them the price up front.
- A trip has stages (the driver is on the way, the driver has arrived, the rider is in the car, the trip is over), and what each side may do depends on the stage.
- Riders change their minds, and drivers sometimes have to stop.

Your task: design and implement it behind the `ride::Rides` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer first: the brief is deliberately incomplete, and "which driver, and how far is too far?" is where most first drafts go wrong.
