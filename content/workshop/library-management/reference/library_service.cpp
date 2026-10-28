#include "library_service.h"

using lib::Status;

Status LibraryService::addBook(const std::string& bookId, const std::string& title, const std::string& author, int copies) {
  return catalog_.add(bookId, title, author, copies) ? Status::Ok : Status::DuplicateId;
}

Status LibraryService::addMember(const std::string& memberId, const std::string& name) {
  return members_.emplace(memberId, Member(memberId, name)).second ? Status::Ok : Status::DuplicateId;
}

Status LibraryService::borrow(const std::string& memberId, const std::string& bookId) {
  auto m = members_.find(memberId);
  if (m == members_.end()) return Status::NoSuchMember;
  if (!catalog_.contains(bookId)) return Status::NoSuchBook;
  Member& member = m->second;
  if (member.holds(bookId)) return Status::AlreadyBorrowed;
  if (catalog_.available(bookId) == 0) return Status::NoCopiesAvailable;
  if (!policy_->mayBorrow(member)) return Status::LimitReached;
  catalog_.takeCopy(bookId);
  member.addLoan(bookId);
  return Status::Ok;
}

Status LibraryService::giveBack(const std::string& memberId, const std::string& bookId) {
  auto m = members_.find(memberId);
  if (m == members_.end()) return Status::NoSuchMember;
  if (!catalog_.contains(bookId)) return Status::NoSuchBook;
  if (!m->second.holds(bookId)) return Status::NotBorrowed;
  m->second.removeLoan(bookId);
  catalog_.returnCopy(bookId);
  return Status::Ok;
}

std::vector<std::string> LibraryService::loansOf(const std::string& memberId) const {
  auto m = members_.find(memberId);
  return m == members_.end() ? std::vector<std::string>{} : m->second.loans();
}

std::unique_ptr<lib::Library> lib::makeLibrary() {
  return std::make_unique<LibraryService>(std::make_unique<FixedLimitPolicy>(3));
}
