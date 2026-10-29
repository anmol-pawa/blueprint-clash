#pragma once
#include <string>
#include "api.h"

// TODO: own the id, release it in the destructor, forbid copying, allow moving.
class FileHandle {
 public:
  explicit FileHandle(const std::string& path) : id_(os::open(path)) {}
  int id() const { return id_; }

 private:
  int id_;
};
