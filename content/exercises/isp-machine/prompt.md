An office once had a fat `Machine` interface with `print`, `scan` and `fax`, so the cheap `BasicPrinter` had to implement `scan` and `fax` as stubs that did nothing. `api.h` already splits the roles into `Printer` and `Scanner`. Write in `solution.h`:

- `class BasicPrinter : public Printer`: **only** a printer. One page holds 10 characters, so `print` returns `ceil(text.size() / 10)` pages (`0` for an empty text).
- `class AllInOne : public Printer, public Scanner`: prints like `BasicPrinter`; `scan` returns `"scan#1"`, then `"scan#2"`, and so on.
- `int copyDocument(Scanner& from, Printer& to)`: scan one document, print it, return the pages printed. It must work with *any* scanner and *any* printer, including two different objects.

`BasicPrinter` must not be a `Scanner`.
