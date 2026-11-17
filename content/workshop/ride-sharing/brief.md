# Ride sharing

You are writing the dispatch core of a small ride-hailing service. Riders ask for a ride from A to B, the system matches a nearby driver, and the trip moves through its life until the rider has paid and rated it.

What you know so far:

- Drivers go online at a spot on a grid and wait. A rider requests a ride and gets the nearest driver.
- A trip has a life: the driver is matched, arrives, starts the ride, completes it. Riders change their minds, but not once they are in the car.
- A fare is a base amount plus a price per unit of distance.
- Riders rate drivers afterwards.
- Nothing here depends on the time of day, so there is no clock to inject.

Your task: design and implement it behind the `ride::Dispatch` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "what happens to the driver when the rider cancels?" is where most first drafts go wrong.
