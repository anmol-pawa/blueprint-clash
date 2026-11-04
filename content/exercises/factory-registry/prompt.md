A tool converts text with codecs chosen by name (`"rot13"`, `"upper"`, ...). Today a `makeCodec(name)` function holds an `if (name == ...)` ladder, so every new codec edits it and recompiles every caller. Replace the ladder with a **registry of factories**. `api.h` gives the `Codec` interface and the `CodecFactory` alias. Write `CodecRegistry` in `solution.h`:

- `bool registerCodec(const std::string& name, CodecFactory factory)`: returns `true` when added. It returns `false` and changes nothing when the name is empty, the factory is empty (`!factory`), or the name is already registered (the first registration wins).
- `std::unique_ptr<Codec> create(const std::string& name) const`: calls that name's factory and returns the result, a **fresh** codec on every call. Unknown names give `nullptr`. If the factory itself returns `nullptr`, so does `create`.
- `std::vector<std::string> names() const`: every registered name in alphabetical order.

Factories are called **lazily**, only inside `create`: registering must not build anything. The registry never names a concrete codec; the tests register codecs you have never seen.
