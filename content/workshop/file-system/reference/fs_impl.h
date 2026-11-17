#pragma once
#include <memory>
#include <string>
#include <vector>

#include "finder.h"
#include "resolver.h"

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
