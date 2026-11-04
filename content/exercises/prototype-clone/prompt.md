A form designer lets users stamp out copies of a prepared element: a label, a badge, or a whole panel of them. The copy must be completely independent, and callers only hold a `Widget`. `api.h` gives the `Widget` interface with its `clone()`. Write in `solution.h`:

- `Label(std::string text)`: `describe()` is `label(<text>)`.
- `Badge(std::string text)`: a kind of `Label` that `describe()`s as `badge(<text>)`.
- `Panel(std::string title)`: owns children. `Panel& add(std::unique_ptr<Widget> child)` appends and returns `*this`; `std::size_t size() const`; `Widget* child(std::size_t i)` (`nullptr` out of range). `describe()` is `panel(<title>)[<child>,<child>]` using each child's `describe()`, e.g. `panel(form)[label(Name),badge(new)]`; with no children `panel(form)[]`. `setText` changes the title.
- `Palette`: a registry of prototypes. `bool add(const std::string& name, const Widget& prototype)` stores a **private copy** and returns `true`; it returns `false` and changes nothing for an empty or duplicate name. `std::unique_ptr<Widget> spawn(const std::string& name) const` returns a new independent copy, or `nullptr` for an unknown name.

`clone()` must return an object of the **same dynamic type** (a cloned `Badge` is still a `Badge`) and a **deep** copy: editing a clone, or any child of a cloned panel, must never change the original, and the other way round. For `Label::setText` replace its text.
