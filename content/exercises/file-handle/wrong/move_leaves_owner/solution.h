#pragma once
#include <string>
#include "api.h"

class FileHandle {
 public:
  explicit FileHandle(const std::string& path) : id_(os::open(path)) {}
  ~FileHandle() {
    if (id_ != 0) os::close(id_);
  }
  FileHandle(const FileHandle&) = delete;
  FileHandle& operator=(const FileHandle&) = delete;
  FileHandle(FileHandle&& o) noexcept : id_(o.id_) {}  // copies the id but forgets to empty the source
  FileHandle& operator=(FileHandle&& o) noexcept {
    if (this != &o) {
      if (id_ != 0) os::close(id_);
      id_ = o.id_;
    }
    return *this;
  }
  int id() const { return id_; }

 private:
  int id_;
};
