#pragma once
#include <string>
#include <utility>
#include "api.h"

class FileHandle {
 public:
  explicit FileHandle(const std::string& path) : id_(os::open(path)) {}
  ~FileHandle() { release(); }

  FileHandle(const FileHandle&) = delete;
  FileHandle& operator=(const FileHandle&) = delete;

  FileHandle(FileHandle&& other) noexcept : id_(std::exchange(other.id_, 0)) {}
  FileHandle& operator=(FileHandle&& other) noexcept {
    if (this != &other) {
      release();
      id_ = std::exchange(other.id_, 0);
    }
    return *this;
  }

  int id() const { return id_; }

 private:
  void release() {
    if (id_ != 0) os::close(id_);
    id_ = 0;
  }

  int id_;  // 0 means "owns nothing"
};
