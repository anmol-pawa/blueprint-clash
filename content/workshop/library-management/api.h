#pragma once
// Public API for the Library problem. The hidden tests only use what is declared here.
// You implement lib::makeLibrary() (in any of your .cpp files); everything behind it is your design.
#include <memory>
#include <string>
#include <vector>

namespace lib {

enum class Status {
  Ok,
  DuplicateId,
  NoSuchBook,
  NoSuchMember,
  NoCopiesAvailable,
  LimitReached,
  AlreadyBorrowed,
  NotBorrowed,
};

class Library {
 public:
  virtual ~Library() = default;

  // Adds a title with `copies` physical copies (copies >= 1).
  virtual Status addBook(const std::string& bookId, const std::string& title, const std::string& author, int copies) = 0;
  virtual Status addMember(const std::string& memberId, const std::string& name) = 0;

  virtual Status borrow(const std::string& memberId, const std::string& bookId) = 0;
  virtual Status giveBack(const std::string& memberId, const std::string& bookId) = 0;

  // Copies currently on the shelf; -1 if the book is unknown.
  virtual int availableCopies(const std::string& bookId) const = 0;
  // Ids of the books the member holds, sorted ascending. Empty for unknown members.
  virtual std::vector<std::string> loansOf(const std::string& memberId) const = 0;
  // Ids of books whose author matches exactly, sorted ascending.
  virtual std::vector<std::string> findByAuthor(const std::string& author) const = 0;
};

std::unique_ptr<Library> makeLibrary();

}  // namespace lib
