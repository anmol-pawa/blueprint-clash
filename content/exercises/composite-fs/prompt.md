A file explorer shows folders that contain files and other folders. Calling code must not care which it holds. `api.h` gives the `Node` interface. Write in `solution.h`:

- `File(std::string name, long long bytes)`: `size()` is `bytes`, `fileCount()` is `1`, `render(depth)` is `<indent><name> (<bytes>)\n`, where the indent is two spaces per level. `find("")` returns the file itself; `find` with any other path returns `nullptr` (a file has nothing below it).
- `Directory(std::string name)`: a Composite.
  - `bool add(std::unique_ptr<Node> child)` takes ownership. It returns `false` and adds nothing for `nullptr`, for a name already used by a child, or when `child.get() == this`. Otherwise it appends and returns `true`.
  - `size()` is the sum of the children's sizes, **recursively**; `fileCount()` the total of files below.
  - `render(depth)` is `<indent><name>/ (<total size>)\n` followed by the children's `render(depth + 1)` in insertion order.
  - `find(path)`: an empty path is this directory; otherwise split at the first `/`, look up that child, and let the child resolve the rest (`find("a/b.txt")` asks child `a` for `b.txt`). An unknown name gives `nullptr`.
