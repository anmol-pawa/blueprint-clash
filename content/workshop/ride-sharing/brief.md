# Ride sharing

You are writing the matching and trip core of a ride-hailing app for one city. Riders ask for a ride, the system finds a driver, and the trip moves from "matched" to "in progress" to "done". Money and maps are somebody else's problem; the core must never double-book a driver or lose track of a trip.

What you know so far:

- Drivers sign on with a name and a point on a grid, and are available until they get a trip or sign off.
- A rider asks for a ride from one point to another, and the system chooses a driver for them.
- A trip has a lifecycle: the rider may cancel early; the driver collects the rider and later drops them off.
- The fare depends on how far the trip is.

Your task: design and implement it behind the `ride::RideService` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "who counts as nearby, and what happens to a driver after a trip?" is where most first drafts go wrong.
