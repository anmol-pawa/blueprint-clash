Every report your service prints has the same skeleton (a heading, the rows, an optional footer), but each report fills in the middle differently. Copy-pasting the skeleton into every report class is how one of them ends up without its footer. The **Template Method** pattern fixes the skeleton once in a base class and lets subclasses fill in only the steps.

Write `ReportGenerator` in `solution.h` with this shape:

- `virtual ~ReportGenerator()`.
- A **public, non-virtual, const** `std::string generate() const`. This is the template method: subclasses must not be able to change the order of the steps.
- Three **private virtual** steps (non-virtual interface idiom). Subclasses override them; callers never call them directly:
  - `virtual std::string title() const = 0;` (required)
  - `virtual std::vector<std::string> rows() const = 0;` (required)
  - `virtual std::string footer() const` : an optional **hook** with a default that returns `""`.

`generate()` returns, in this order:

1. `"== " + title() + " ==\n"`
2. one line `"- " + row + "\n"` per row, or `"(no rows)\n"` when there are none
3. `footer()` exactly as returned

`rows()` is a step that may be expensive (it could query a database), so call it **exactly once** per `generate()`. A subclass that only overrides `title()` and `rows()` must compile.
