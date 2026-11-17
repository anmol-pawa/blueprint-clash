# In-memory file system

You are building the storage core of a small operating-system simulator: a tree of directories and files held entirely in memory. Programs create directories, write and read files, list a directory, delete things and move them around, and they give you paths as strings. They are not careful with those strings, and they are not forgiving when a "simple" call corrupts the tree.

What you know so far:

- There is one root directory, "/". Everything lives below it.
- A directory holds named entries; each entry is a file with content or another directory.
- Callers refer to entries by absolute path: "/home/ada/notes.txt".
- Calls report what went wrong instead of crashing: a missing parent, a name that is already taken, a file where a directory was expected.

Your task: design and implement it behind the `fs::FileSystem` interface in `api.h`. The hidden tests call only that interface. Ask the interviewer questions first: the brief is deliberately incomplete, and "what exactly is a path, and which error wins when several apply?" is where first drafts go wrong. Expect a request to search by name pattern, and then a request for symbolic links, after you have finished.
