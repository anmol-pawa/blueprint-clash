#pragma once
#include <cstddef>
#include "api.h"

// TODO: own `capacity` buffers; make Lease a move-only RAII handle that returns its buffer
// (cleared) to the pool when destroyed or overwritten.
class BufferPool {
 public:
  class Lease {
   public:
    explicit operator bool() const { return false; }
    Buffer& operator*() const { return *buffer_; }
    Buffer* operator->() const { return buffer_; }

   private:
    Buffer* buffer_ = nullptr;
  };

  explicit BufferPool(std::size_t capacity) : capacity_(capacity) {}
  Lease acquire() { return Lease(); }
  std::size_t capacity() const { return capacity_; }
  std::size_t available() const { return 0; }

 private:
  std::size_t capacity_;
};
