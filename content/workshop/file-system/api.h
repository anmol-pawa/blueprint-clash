#pragma once
// Public API for the In-memory file system problem. The hidden tests only use what is declared here.
// You implement fs::makeFileSystem() (in any of your .cpp files); everything behind it is your design.
#include <cstddef>
#include <memory>
#include <string>
#include <vector>

namespace fs {

constexpr std::size_t kMaxNameLength = 32;  // longest allowed name, in characters

enum class Status {
  Ok,
  NotFound,       // the entry, or a directory on the way to it, does not exist
  AlreadyExists,  // the name is taken (by a file, a directory, or later a link)
  NotADirectory,  // a name on the way, or the one being listed, is not a directory
  IsADirectory,   // a file operation was aimed at a directory
  InvalidPath,    // malformed path, over-long name, or an operation that makes no sense (see each call)
  NotEmpty,       // remove() of a directory that still has entries
  LinkLoop,       // returned only by file systems with links (api_storm2.h); the base file system never does
  NotALink,       // returned only by file systems with links (api_storm2.h); the base file system never does
};

enum class Kind { File, Directory, Link };  // Link appears only in file systems with links (api_storm2.h)

// One tree of directories and files, starting from the root directory "/". Paths are absolute strings.
//
// PATHS. A path must start with '/'. It is split on '/'; empty parts and "." are ignored; ".." removes the part before
// it, and at the root it does nothing ("/.." is "/"). This is purely textual. A trailing '/' is fine. Every part, even
// one that ".." later removes, must be at most kMaxNameLength characters. Anything else wrong (empty string, no leading
// '/', over-long part) is InvalidPath, and that is checked before anything is looked up.
//
// Every call that returns Status leaves its output arguments and the file system unchanged unless it returns Ok.
// Looking an entry up is checked from the root down: a missing directory on the way is NotFound, a file on the way is
// NotADirectory; the entry itself is then looked at.
class FileSystem {
 public:
  virtual ~FileSystem() = default;

  // Creates one directory; its parent must exist. Taken name (including "/") is AlreadyExists.
  virtual Status mkdir(const std::string& path) = 0;

  // Creates the file or replaces the whole content of the existing one. The parent must exist. A directory at `path`
  // (including "/") is IsADirectory.
  virtual Status write(const std::string& path, const std::string& content) = 0;

  // Copies a file's content into `out`. A directory is IsADirectory.
  virtual Status read(const std::string& path, std::string& out) const = 0;

  // Removes a file or an EMPTY directory (NotEmpty otherwise). "/" is InvalidPath.
  virtual Status remove(const std::string& path) = 0;

  // Replaces `names` with the names (not paths) of the entries directly inside a directory, sorted ascending.
  virtual Status list(const std::string& path, std::vector<std::string>& names) const = 0;

  // A file's length in bytes; a directory's is the total length of every file anywhere below it (0 when empty).
  virtual Status size(const std::string& path, std::size_t& bytes) const = 0;

  // What the entry is.
  virtual Status kind(const std::string& path, Kind& out) const = 0;

  // Moves a file or a whole directory (with everything below it) to a new path, which is also its new name.
  // Checked in this order: both paths valid; `from` is "/" or `to` lies strictly inside `from` (InvalidPath: a
  // directory cannot move into itself); `from` exists; `to`'s parent exists and is a directory; `to` is free
  // (AlreadyExists, even for "to the same path"). Nothing is overwritten.
  virtual Status move(const std::string& from, const std::string& to) = 0;
};

std::unique_ptr<FileSystem> makeFileSystem();

}  // namespace fs
