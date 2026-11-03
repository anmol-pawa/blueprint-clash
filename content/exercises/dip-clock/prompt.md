Code that calls the system clock directly cannot be tested: you would have to sleep. Make time an injected dependency. `api.h` gives the `Clock` abstraction. Write `SessionStore` in `solution.h`:

- `SessionStore(std::unique_ptr<Clock> clock, long long ttlSeconds)`: the store **owns** its clock (the caller hands it over with `std::move`). It never reads the system clock itself.
- `std::string open(const std::string& user)`: creates a session at the current time and returns its token: `"s1"`, `"s2"`, ...
- `bool isValid(const std::string& token) const`: true when the token exists and `now - createdAt < ttlSeconds` (a session created exactly `ttl` seconds ago has expired).
- `std::size_t activeCount() const`: how many sessions are valid right now.

The tests give you a clock they can move, and check that destroying the store destroys the clock it owns.
