#pragma once
#include <string>
#include <utility>
#include "api.h"

class FileHandle {
 public:
  explicit FileHandle(const std::string& path) : id_(os::open(path)) {}
  // no destructor: the id is never given back
  FileHandle(const FileHandle&) = delete;
  FileHandle& operator=(const FileHandle&) = delete;
  FileHandle(FileHandle&& o) noexcept : id_(std::exchange(o.id_, 0)) {}
  FileHandle& operator=(FileHandle&& o) noexcept {
    id_ = std::exchange(o.id_, 0);
    return *this;
  }
  int id() const { return id_; }

 private:
  int id_;
};
