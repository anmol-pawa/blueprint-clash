#pragma once
#include <map>
#include <string>
#include <vector>

// Owns the books and their shelf counts. The only place a count changes.
class Catalog {
 public:
  bool add(const std::string& id, const std::string& title, const std::string& author, int copies) {
    return books_.emplace(id, Book{title, author, copies}).second;
  }
  bool contains(const std::string& id) const { return books_.count(id) != 0; }
  int available(const std::string& id) const {
    auto it = books_.find(id);
    return it == books_.end() ? -1 : it->second.onShelf;
  }
  // Precondition: available(id) > 0.
  void takeCopy(const std::string& id) { --books_.at(id).onShelf; }
  void returnCopy(const std::string& id) { ++books_.at(id).onShelf; }

  std::vector<std::string> findByAuthor(const std::string& author) const {
    std::vector<std::string> ids;
    for (const auto& [id, book] : books_) {
      if (book.author == author) ids.push_back(id);  // std::map iterates in id order
    }
    return ids;
  }

 private:
  struct Book {
    std::string title;
    std::string author;
    int onShelf;
  };
  std::map<std::string, Book> books_;
};
