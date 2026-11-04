#pragma once
#include <cstddef>
#include <memory>
#include <utility>
#include <vector>
#include "api.h"

// A fixed set of buffers handed out as RAII leases. The pool must outlive every lease it
// issued: a lease keeps a raw pointer back to it.
class BufferPool {
 public:
  class Lease {
   public:
    Lease() = default;
    Lease(const Lease&) = delete;
    Lease& operator=(const Lease&) = delete;
    Lease(Lease&& other) noexcept
        : pool_(std::exchange(other.pool_, nullptr)), buffer_(std::exchange(other.buffer_, nullptr)) {}
    Lease& operator=(Lease&& other) noexcept {
      if (this != &other) {
        pool_ = std::exchange(other.pool_, nullptr);
        buffer_ = std::exchange(other.buffer_, nullptr);
      }
      return *this;
    }
    ~Lease() { release(); }

    explicit operator bool() const { return buffer_ != nullptr; }
    Buffer& operator*() const { return *buffer_; }
    Buffer* operator->() const { return buffer_; }

   private:
    friend class BufferPool;
    Lease(BufferPool* pool, Buffer* buffer) : pool_(pool), buffer_(buffer) {}
    void release() {
      if (buffer_ != nullptr) pool_->giveBack(buffer_);
      pool_ = nullptr;
      buffer_ = nullptr;
    }

    BufferPool* pool_ = nullptr;
    Buffer* buffer_ = nullptr;
  };

  explicit BufferPool(std::size_t capacity) {
    owned_.reserve(capacity);
    idle_.reserve(capacity);
    for (std::size_t i = 0; i < capacity; ++i) {
      owned_.push_back(std::make_unique<Buffer>());
      idle_.push_back(owned_.back().get());
    }
  }
  BufferPool(const BufferPool&) = delete;
  BufferPool& operator=(const BufferPool&) = delete;

  Lease acquire() {
    if (idle_.empty()) return Lease();
    Buffer* buffer = idle_.back();
    idle_.pop_back();
    return Lease(this, buffer);
  }

  std::size_t capacity() const { return owned_.size(); }
  std::size_t available() const { return idle_.size(); }

 private:
  void giveBack(Buffer* buffer) {
    buffer->clear();
    idle_.push_back(buffer);
  }

  std::vector<std::unique_ptr<Buffer>> owned_;
  std::vector<Buffer*> idle_;
};
