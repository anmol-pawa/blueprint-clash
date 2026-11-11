# Elevator system

You are writing the control software of a bank of elevators in an office building. People press a **hall button** on a floor to call a car, and press **floor buttons** inside a car to say where they are going. The software decides which car answers each call and how every car moves.

What you know so far:

- The building has several floors and several cars.
- A hall call says which floor and which way the person wants to go.
- Once inside, a rider picks a destination floor.
- Cars move one floor at a time and open their doors where they stop.

Your task: design and implement it behind the `elev::ElevatorSystem` interface in `api.h`. Time is simulated: nothing moves until `step()` is called. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete.
