#pragma once
#include <string>
#include "api.h"

class FileHandle {
 public:
  explicit FileHandle(const std::string& path) : id_(os::open(path)) {}
  ~FileHandle() {
    if (id_ != 0) os::close(id_);
  }
  // copy and move are the compiler's defaults: two owners of one id
  int id() const { return id_; }

 private:
  int id_;
};
