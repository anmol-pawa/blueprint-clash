#include <algorithm>
#include <deque>
#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "api_storm2.h"



// A normalised absolute path: the names from the root down, with "", "." and ".." already applied.
class Path {
 public:
  // Splits and normalises `text`. False when it is not absolute or a part is too long.
  static bool parse(const std::string& text, Path& out) {
    if (text.empty() || text[0] != '/') return false;
    std::vector<std::string> parts;
    std::size_t start = 1;
    while (start <= text.size()) {
      std::size_t end = text.find('/', start);
      if (end == std::string::npos) end = text.size();
      const std::string part = text.substr(start, end - start);
      if (part.size() > fs::kMaxNameLength) return false;
      if (part == "..") {
        if (!parts.empty()) parts.pop_back();
      } else if (!part.empty()) {
        parts.push_back(part);
      }
      start = end + 1;
    }
    out = Path(std::move(parts));
    return true;
  }

  Path() = default;

  const std::vector<std::string>& parts() const { return parts_; }
  bool isRoot() const { return parts_.empty(); }

  // True when this path is below `ancestor` (never when they are equal).
  bool isInside(const Path& ancestor) const {
    if (parts_.size() <= ancestor.parts_.size()) return false;
    return std::equal(ancestor.parts_.begin(), ancestor.parts_.end(), parts_.begin());
  }

  std::string str() const {
    if (parts_.empty()) return "/";
    std::string out;
    for (const std::string& part : parts_) out += "/" + part;
    return out;
  }

 private:
  explicit Path(std::vector<std::string> parts) : parts_(std::move(parts)) {}
  std::vector<std::string> parts_;
};



class Directory;
class File;
class Link;

// One entry in the tree (Composite). A node does not know its own name: its directory holds it under one.
class Node {
 public:
  virtual ~Node() = default;
  virtual fs::Kind kind() const = 0;
  virtual std::size_t bytes() const = 0;
  // Safe downcasts: null unless this node is that kind.
  virtual Directory* asDirectory() { return nullptr; }
  virtual File* asFile() { return nullptr; }
  virtual Link* asLink() { return nullptr; }
};

class File : public Node {
 public:
  explicit File(std::string content) : content_(std::move(content)) {}
  fs::Kind kind() const override { return fs::Kind::File; }
  std::size_t bytes() const override { return content_.size(); }
  File* asFile() override { return this; }
  const std::string& content() const { return content_; }
  void assign(std::string content) { content_ = std::move(content); }

 private:
  std::string content_;
};

// A symbolic link holds the path it stands for. It owns no content, so it counts as zero bytes.
class Link : public Node {
 public:
  explicit Link(Path target) : target_(std::move(target)) {}
  fs::Kind kind() const override { return fs::Kind::Link; }
  std::size_t bytes() const override { return 0; }
  Link* asLink() override { return this; }
  const Path& target() const { return target_; }

 private:
  Path target_;
};

class Directory : public Node {
 public:
  using Children = std::map<std::string, std::unique_ptr<Node>>;

  fs::Kind kind() const override { return fs::Kind::Directory; }
  std::size_t bytes() const override {
    std::size_t total = 0;
    for (const auto& entry : children_) total += entry.second->bytes();
    return total;
  }
  Directory* asDirectory() override { return this; }

  const Children& children() const { return children_; }
  bool empty() const { return children_.empty(); }
  Node* find(const std::string& name) const {
    const auto it = children_.find(name);
    return it == children_.end() ? nullptr : it->second.get();
  }
  void put(const std::string& name, std::unique_ptr<Node> node) { children_[name] = std::move(node); }
  std::unique_ptr<Node> take(const std::string& name) {
    std::unique_ptr<Node> node = std::move(children_[name]);
    children_.erase(name);
    return node;
  }

  // True when `wanted` is this directory or anywhere below it (links are not entered).
  bool holds(const Node* wanted) const {
    if (wanted == this) return true;
    for (const auto& entry : children_) {
      const Directory* sub = entry.second->asDirectory();
      if (sub != nullptr && sub->holds(wanted)) return true;
    }
    return false;
  }

 private:
  Children children_;
};



// Whether a link in the LAST part of a path is followed (links in the middle always are).
enum class Follow { Last, NotLast };

// Where a path leads: the directory holding the entry, its name there, and the entry (null when it is not there yet).
struct Located {
  fs::Status status = fs::Status::Ok;
  Directory* parent = nullptr;  // null only for the root
  std::string name;
  Node* node = nullptr;
};

// Walks a path from the root and owns the link rules: which links are followed and how many.
class Resolver {
 public:
  explicit Resolver(Directory& root) : root_(root) {}

  Located locate(const std::string& text, Follow last) const {
    Path path;
    if (!Path::parse(text, path)) return failure(fs::Status::InvalidPath);
    return locate(path, last);
  }

  Located locate(const Path& path, Follow last) const {
    std::deque<std::string> todo(path.parts().begin(), path.parts().end());
    Directory* dir = &root_;
    Located here;
    here.node = &root_;
    int hops = 0;
    while (!todo.empty()) {
      const std::string name = todo.front();
      todo.pop_front();
      const bool isLast = todo.empty();
      Node* child = dir->find(name);
      here = Located{fs::Status::Ok, dir, name, child};
      if (child == nullptr) return isLast ? here : failure(fs::Status::NotFound);
      Link* link = child->asLink();
      if (link != nullptr && (!isLast || last == Follow::Last)) {
        if (++hops > fs::kMaxLinkHops) return failure(fs::Status::LinkLoop);
        todo.insert(todo.begin(), link->target().parts().begin(), link->target().parts().end());
        dir = &root_;
        here = Located{fs::Status::Ok, nullptr, "", &root_};
        continue;
      }
      if (isLast) return here;
      dir = child->asDirectory();
      if (dir == nullptr) return failure(fs::Status::NotADirectory);
    }
    return here;
  }

 private:
  static Located failure(fs::Status status) {
    Located bad;
    bad.status = status;
    return bad;
  }

  Directory& root_;
};


// A name pattern: '*' is any run of characters (including none), '?' is exactly one, anything else is itself.
class Glob {
 public:
  explicit Glob(std::string pattern) : pattern_(std::move(pattern)) {}

  // Linear-time matching: remember the last '*' and, on a mismatch, let it swallow one more character.
  bool matches(const std::string& name) const {
    std::size_t p = 0;
    std::size_t i = 0;
    std::size_t star = std::string::npos;
    std::size_t mark = 0;
    while (i < name.size()) {
      if (p < pattern_.size() && pattern_[p] == '*') {
        star = p++;
        mark = i;
      } else if (p < pattern_.size() && (pattern_[p] == '?' || pattern_[p] == name[i])) {
        ++p;
        ++i;
      } else if (star != std::string::npos) {
        p = star + 1;
        i = ++mark;
      } else {
        return false;
      }
    }
    while (p < pattern_.size() && pattern_[p] == '*') ++p;
    return p == pattern_.size();
  }

 private:
  std::string pattern_;
};



// Depth-first walk of a directory tree collecting the entries whose name matches. Links are listed, never entered.
class Finder {
 public:
  explicit Finder(Glob glob) : glob_(std::move(glob)) {}

  void collect(const Directory& dir, const std::string& base, std::vector<std::string>& found) const {
    for (const auto& entry : dir.children()) {
      const std::string path = (base == "/" ? "" : base) + "/" + entry.first;
      if (glob_.matches(entry.first)) found.push_back(path);
      const Directory* sub = entry.second->asDirectory();
      if (sub != nullptr) collect(*sub, path, found);
    }
  }

 private:
  Glob glob_;
};



// The facade: one short method per call, each parsing nothing itself; the Resolver answers "what is there".
class FileSystemImpl : public fs::LinkingFileSystem {
 public:
  fs::Status mkdir(const std::string& path) override {
    const Located at = resolver_.locate(path, Follow::NotLast);
    if (at.status != fs::Status::Ok) return at.status;
    if (at.node != nullptr) return fs::Status::AlreadyExists;
    at.parent->put(at.name, std::make_unique<Directory>());
    return fs::Status::Ok;
  }

  fs::Status write(const std::string& path, const std::string& content) override {
    const Located at = resolver_.locate(path, Follow::Last);
    if (at.status != fs::Status::Ok) return at.status;
    if (at.node == nullptr) {
      at.parent->put(at.name, std::make_unique<File>(content));
      return fs::Status::Ok;
    }
    File* file = at.node->asFile();
    if (file == nullptr) return fs::Status::IsADirectory;
    file->assign(content);
    return fs::Status::Ok;
  }

  fs::Status read(const std::string& path, std::string& out) const override {
    const Located at = resolver_.locate(path, Follow::Last);
    if (at.status != fs::Status::Ok) return at.status;
    if (at.node == nullptr) return fs::Status::NotFound;
    const File* file = at.node->asFile();
    if (file == nullptr) return fs::Status::IsADirectory;
    out = file->content();
    return fs::Status::Ok;
  }

  fs::Status remove(const std::string& path) override {
    const Located at = resolver_.locate(path, Follow::NotLast);
    if (at.status != fs::Status::Ok) return at.status;
    if (at.node == nullptr) return fs::Status::NotFound;
    if (at.parent == nullptr) return fs::Status::InvalidPath;
    const Directory* dir = at.node->asDirectory();
    if (dir != nullptr && !dir->empty()) return fs::Status::NotEmpty;
    at.parent->take(at.name);
    return fs::Status::Ok;
  }

  fs::Status list(const std::string& path, std::vector<std::string>& names) const override {
    const Located at = resolver_.locate(path, Follow::Last);
    if (at.status != fs::Status::Ok) return at.status;
    if (at.node == nullptr) return fs::Status::NotFound;
    const Directory* dir = at.node->asDirectory();
    if (dir == nullptr) return fs::Status::NotADirectory;
    names.clear();
    for (const auto& entry : dir->children()) names.push_back(entry.first);
    return fs::Status::Ok;
  }

  fs::Status size(const std::string& path, std::size_t& bytes) const override {
    const Located at = resolver_.locate(path, Follow::Last);
    if (at.status != fs::Status::Ok) return at.status;
    if (at.node == nullptr) return fs::Status::NotFound;
    bytes = at.node->bytes();
    return fs::Status::Ok;
  }

  fs::Status kind(const std::string& path, fs::Kind& out) const override {
    const Located at = resolver_.locate(path, Follow::NotLast);
    if (at.status != fs::Status::Ok) return at.status;
    if (at.node == nullptr) return fs::Status::NotFound;
    out = at.node->kind();
    return fs::Status::Ok;
  }

  fs::Status move(const std::string& from, const std::string& to) override {
    Path source;
    Path target;
    if (!Path::parse(from, source) || !Path::parse(to, target)) return fs::Status::InvalidPath;
    if (source.isRoot() || target.isInside(source)) return fs::Status::InvalidPath;
    const Located src = resolver_.locate(source, Follow::NotLast);
    if (src.status != fs::Status::Ok) return src.status;
    if (src.node == nullptr) return fs::Status::NotFound;
    const Located dst = resolver_.locate(target, Follow::NotLast);
    if (dst.status != fs::Status::Ok) return dst.status;
    if (dst.node != nullptr) return fs::Status::AlreadyExists;
    const Directory* moved = src.node->asDirectory();
    if (moved != nullptr && moved->holds(dst.parent)) return fs::Status::InvalidPath;
    dst.parent->put(dst.name, src.parent->take(src.name));
    return fs::Status::Ok;
  }

  fs::Status find(const std::string& dir, const std::string& pattern, std::vector<std::string>& found) const override {
    Path base;
    if (!Path::parse(dir, base)) return fs::Status::InvalidPath;
    if (pattern.empty() || pattern.find('/') != std::string::npos) return fs::Status::InvalidPath;
    const Located at = resolver_.locate(base, Follow::Last);
    if (at.status != fs::Status::Ok) return at.status;
    if (at.node == nullptr) return fs::Status::NotFound;
    const Directory* start = at.node->asDirectory();
    if (start == nullptr) return fs::Status::NotADirectory;
    found.clear();
    Finder(Glob(pattern)).collect(*start, base.str(), found);
    return fs::Status::Ok;
  }

  fs::Status symlink(const std::string& target, const std::string& linkPath) override {
    Path stored;
    Path where;
    if (!Path::parse(linkPath, where) || !Path::parse(target, stored)) return fs::Status::InvalidPath;
    const Located at = resolver_.locate(where, Follow::NotLast);
    if (at.status != fs::Status::Ok) return at.status;
    if (at.node != nullptr) return fs::Status::AlreadyExists;
    at.parent->put(at.name, std::make_unique<Link>(stored));
    return fs::Status::Ok;
  }

  fs::Status readLink(const std::string& path, std::string& target) const override {
    const Located at = resolver_.locate(path, Follow::NotLast);
    if (at.status != fs::Status::Ok) return at.status;
    if (at.node == nullptr) return fs::Status::NotFound;
    const Link* link = at.node->asLink();
    if (link == nullptr) return fs::Status::NotALink;
    target = link->target().str();
    return fs::Status::Ok;
  }

 private:
  Directory root_;
  Resolver resolver_{root_};
};


std::unique_ptr<fs::FileSystem> fs::makeFileSystem() { return std::make_unique<FileSystemImpl>(); }

std::unique_ptr<fs::SearchableFileSystem> fs::makeSearchableFileSystem() { return std::make_unique<FileSystemImpl>(); }

std::unique_ptr<fs::LinkingFileSystem> fs::makeLinkingFileSystem() { return std::make_unique<FileSystemImpl>(); }

