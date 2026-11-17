#pragma once
#include <deque>
#include <string>

#include "node.h"

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
