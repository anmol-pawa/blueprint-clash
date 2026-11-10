#pragma once
#include <cstddef>
#include <iterator>
#include <string>
#include <utility>
#include <vector>

class Roster {
 public:
  // TODO: a forward iterator over the LIVE names only. Store what it needs (the slots and an index)
  // and skip dead slots in the constructor and in operator++.
  class const_iterator {
   public:
    using iterator_category = std::forward_iterator_tag;
    using value_type = std::string;
    using difference_type = std::ptrdiff_t;
    using pointer = const std::string*;
    using reference = const std::string&;

    const_iterator() = default;
    reference operator*() const { return empty_; }
    pointer operator->() const { return &empty_; }
    const_iterator& operator++() { return *this; }
    const_iterator operator++(int) { return *this; }
    friend bool operator==(const const_iterator&, const const_iterator&) { return true; }
    friend bool operator!=(const const_iterator&, const const_iterator&) { return false; }

   private:
    std::string empty_;
  };

  // TODO: keep removed entries as tombstones (so order never changes) and count only live ones.
  void add(std::string name) { (void)name; }
  bool remove(const std::string& name) { (void)name; return false; }
  std::size_t size() const { return 0; }

  const_iterator begin() const { return const_iterator(); }
  const_iterator end() const { return const_iterator(); }
};
