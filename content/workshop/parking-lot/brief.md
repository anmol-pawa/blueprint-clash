# Parking lot

You are building the core of a multi-storey car park's control system. A vehicle **arrives**, the system finds it a **spot** and hands back a **ticket**; the vehicle **leaves** and the system works out the **fee**.

What you know so far:

- The lot has numbered spots; staff add them one by one, each with a size.
- Vehicles are motorcycles, cars and trucks. A plate identifies a vehicle.
- Parking returns a ticket that names the spot. Leaving takes the ticket and returns a receipt with the fee.
- Someone at the gate wants to know how many spots of each size are free.

Your task: design and implement it behind the `park::ParkingLot` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete.
