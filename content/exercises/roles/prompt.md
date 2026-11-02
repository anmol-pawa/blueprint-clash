`api.h` declares two small role interfaces:

- `Readable` with `std::string read() const`
- `Writable` with `void write(const std::string& text)`

In `solution.h` write:

- `Notebook`: both readable and writable. `write` **appends** `text` to the contents; `read` returns everything written so far (empty at first).
- `Sensor(std::string reading)`: **only** readable; `read` returns the reading. A sensor must not be usable where a `Writable` is required.
- `void archive(const Readable& from, Writable& to)`: writes what `from` reads into `to`.

`archive` must accept any readable and any writable, including ones the tests define themselves.
