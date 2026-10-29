`Item` (in `api.h`) is heap-allocated and cannot be copied. An `Inventory` **owns** the items put into it. Write it in `solution.h`:

- `bool add(std::unique_ptr<Item> item)`: takes ownership. Returns `false` (and frees the item) if `item` is null or an item with the same name is already stored.
- `const Item* find(const std::string& name) const`: a *non-owning* view, `nullptr` if absent.
- `std::unique_ptr<Item> take(const std::string& name)`: removes the item and **hands ownership back** to the caller; `nullptr` if absent.
- `std::size_t size() const`.

When the inventory is destroyed, everything it still owns is destroyed with it. No `new` or `delete` in your class.
