#pragma once
#include <cstddef>
#include <iterator>
#include <string>
#include <utility>
#include <vector>

// Names in join order. Removal leaves a tombstone so the order of the others never changes;
// the iterator hides the tombstones from callers.
class Roster {
  struct Slot {
    std::string name;
    bool live;
  };

 public:
  class const_iterator {
   public:
    using iterator_category = std::forward_iterator_tag;
    using value_type = std::string;
    using difference_type = std::ptrdiff_t;
    using pointer = const std::string*;
    using reference = const std::string&;

    const_iterator() = default;

    reference operator*() const { return (*slots_)[index_].name; }
    pointer operator->() const { return &(*slots_)[index_].name; }

    const_iterator& operator++() {
      ++index_;
      skipDead();
      return *this;
    }
    const_iterator operator++(int) {
      const_iterator previous = *this;
      ++*this;
      return previous;
    }

    friend bool operator==(const const_iterator& a, const const_iterator& b) {
      return a.slots_ == b.slots_ && a.index_ == b.index_;
    }
    friend bool operator!=(const const_iterator& a, const const_iterator& b) { return !(a == b); }

   private:
    friend class Roster;
    const_iterator(const std::vector<Slot>* slots, std::size_t index) : slots_(slots), index_(index) { skipDead(); }

    void skipDead() {
      while (index_ < slots_->size() && !(*slots_)[index_].live) {
        ++index_;
      }
    }

    const std::vector<Slot>* slots_ = nullptr;
    std::size_t index_ = 0;
  };

  void add(std::string name) {
    slots_.push_back({std::move(name), true});
    ++live_;
  }

  bool remove(const std::string& name) {
    for (Slot& slot : slots_) {
      if (slot.live && slot.name == name) {
        slot.live = false;
        --live_;
        return true;
      }
    }
    return false;
  }

  std::size_t size() const { return slots_.size(); }

  const_iterator begin() const { return const_iterator(&slots_, 0); }
  const_iterator end() const { return const_iterator(&slots_, slots_.size()); }

 private:
  std::vector<Slot> slots_;
  std::size_t live_ = 0;
};
