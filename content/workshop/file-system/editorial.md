# Editorial: In-memory file system

## Requirements
Functional: one tree under the root "/"; mkdir, write, read, remove, list, size, kind and move on absolute paths; every call reports a status instead of crashing; searching by name pattern; symbolic links.

Hidden in the brief and revealed by good questions: paths are textual (`.`, `..`, repeated and trailing slashes, a 32-character name limit that applies even to parts `..` removes, and `..` at the root staying at the root); invalid paths are reported before any lookup; a lookup goes from the root down, so a missing directory is NotFound and a file on the way is NotADirectory; mkdir needs its parent; write replaces the whole content; remove takes a file or an empty directory; list replaces the caller's vector with sorted direct children; the size of a directory is everything below it; move never overwrites, carries a whole subtree, refuses to move into itself and has a written check order; failed calls change nothing and leave outputs alone.

**Change Storm 1, search:** `find(dir, pattern)` matches names (not paths) with `*` and `?`, over every level, directories included, results depth-first with a directory before its content.

**Change Storm 2, symbolic links:** a link is an entry that holds a path. Links in the middle of a path are always followed; a final link is followed by read, write, list, size and find and not by kind, readLink, remove, move, mkdir and symlink. Writing through a dangling link creates its target, `..` is applied to the text before links, eight hops are allowed and the ninth is LinkLoop, directory sizes skip links, find does not descend through them, and a move into itself through a link is refused.

## Reference design
- `FileSystemImpl` is the facade. Each call is a few lines: ask the resolver where the path leads, check the kind, change the tree, return a status. It parses no strings itself.
- `Path` is a value: the normalised names from the root. It is the only code that knows about slashes, dots and the name limit, so every other class works with names.
- `Node` is the Composite: `File`, `Directory` and `Link` answer `kind()` and `bytes()`, and a directory's `bytes()` is the sum of its children's. Safe downcast methods (`asDirectory`, `asFile`, `asLink`) replace `dynamic_cast` and type tags.
- `Resolver` is the one place that walks a path. It returns a `Located` result: the directory that holds the entry, the name, and the entry (null when it is not there yet), or a status. A `Follow` flag says whether a link in the last part is followed. Everything that makes a failed lookup NotFound or NotADirectory lives here.
- `Glob` matches one name against a pattern in linear time (remember the last star, retry with one more character swallowed). `Finder` walks the tree depth-first over sorted children and collects matches.
- `Link` is a node that holds a `Path`. It counts as 0 bytes. The resolver replaces a followed link by its target and counts hops.

**Storm 1 in the reference:** `Glob`, `Finder` and one method on the facade. No node class changes: the walker uses the directory's children and the safe downcast.

**Storm 2 in the reference:** `Link` (a new node), a branch and a counter in `Resolver::locate`, two facade methods (`symlink`, `readLink`), and `Directory::holds` for the move check. File and Directory are untouched because lookups already went through one class. The other calls pick `Follow::Last` or `Follow::NotLast` and nothing more.

## Alternatives
- **Visitor over the node family.** `accept(Visitor&)` on every node and one visitor per walk (size, find, du). Clean when walks multiply and node kinds are stable, and each new node kind means touching every visitor. Safe downcasts in a walker are lighter for two walks; at five or six, a Visitor wins.
- **Virtual `find` and `size` on `Node`.** Each node recurses itself. Natural for `size` (the reference does it), and a poor fit for every new traversal because File, Directory and Link all change.
- **A flat map from path string to entry.** Trivial lookup (this is also the test's model) and wrong for `list`, `move` of a directory (every key below it is rewritten) and `size` (a scan). Fine for a key-value store, not for a tree.
- **Parent pointers in every node.** Makes `..` physical and the `holds` check trivial, at the cost of keeping two links in sync on every move. The reference keeps ownership one-directional (unique_ptr down) and walks from the root.
- **One lookup written into each call.** Eleven copies of the path walk; when links arrive each must learn the link rule and the hop count, and they will not agree. A single `Resolver` is the whole change.
- **Lazy path strings: store each node's full path.** Every move rewrites a subtree's paths. Avoid.
- **A cached size on every directory.** O(1) `size`, but every write, remove and move must update all ancestors, and links make the cache wrong. Recompute until measurements say otherwise.

## Trade-offs
Reporting a status for every case, rather than throwing, makes callers deal with failure at each call, and it makes the interface testable down to the order of checks. The cost is a long contract: which error wins when several apply is part of the interface and is written down.

Applying `..` to the text is simple, needs no parent pointers and is easy to test. A real kernel applies `..` to the directory it has actually reached, which differs after a link; the simplification is deliberate and stated, and the follow-up on it is a standard senior question.

Following links in the resolver makes every operation correct by construction, and it puts a rule (hops, last-part following) in a place that every call depends on. The alternative, a flag per call, is what the code does: the call states whether the last part is followed and the resolver does the rest.

`map<string, unique_ptr<Node>>` gives sorted `list` and `find` for free and costs O(log n) per lookup and a node-per-entry memory layout. A `vector` of sorted pairs is smaller and slower to insert; a hash map is faster and then sorts on `list`.

## What breaks at 10x
A directory with a million entries makes `list` copy a million names and `find` walk everything. Page `list` with a cursor, index names (a trie or a sorted structure) and give `find` a way to stop early; memory per entry (a map node, a node object, a string) becomes the cost to measure. Deep trees make the recursive `bytes()` and `find` a stack hazard at depth in the tens of thousands: iterate with an explicit stack. Concurrent callers need a lock: one reader-writer lock first, then a lock per directory taken hand over hand, where `move` needs a global lock order and a descendant check under the lock, otherwise two moves can make a cycle. Large files want chunked storage and copy-on-write snapshots; links across mounts and relative links add path rules the hop counter does not cover. Crash safety needs a journal of the mutations, which is a Command log like the text editor's history.

## Level signals
- **SDE2:** a directory tree that works for the common calls; normalises paths, returns the right error for a missing parent and a taken name, sorts `list`, refuses a non-empty `remove`, never overwrites in `move`.
- **Senior:** separates path text from the tree (a `Path`), uses a Composite so `size` is a recursion over objects, centralises the walk in one resolver, states and tests the order of checks, refuses a move into itself, adds the search as a walker without editing the nodes, and adds links as a new node plus one rule in the resolver; compares with a flat-map model in a randomised test.
- **Staff:** talks about physical versus textual `..`, hop limits and loop detection, locking order for moves, cached sizes and when they pay, journals and snapshots, per-mount trees, and what to measure (entries per directory, depth, memory per entry, lookup latency) before changing the layout.
