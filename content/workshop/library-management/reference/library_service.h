#pragma once
#include <map>
#include <memory>
#include <string>

#include "api.h"
#include "catalog.h"
#include "loan_policy.h"
#include "member.h"

// Coordinates borrow and return across catalog, members and policy.
// Every operation validates first and mutates last, so a failed call changes nothing.
class LibraryService : public lib::Library {
 public:
  explicit LibraryService(std::unique_ptr<LoanPolicy> policy) : policy_(std::move(policy)) {}

  lib::Status addBook(const std::string& bookId, const std::string& title, const std::string& author, int copies) override;
  lib::Status addMember(const std::string& memberId, const std::string& name) override;
  lib::Status borrow(const std::string& memberId, const std::string& bookId) override;
  lib::Status giveBack(const std::string& memberId, const std::string& bookId) override;
  int availableCopies(const std::string& bookId) const override { return catalog_.available(bookId); }
  std::vector<std::string> loansOf(const std::string& memberId) const override;
  std::vector<std::string> findByAuthor(const std::string& author) const override { return catalog_.findByAuthor(author); }

 private:
  Catalog catalog_;
  std::map<std::string, Member> members_;
  std::unique_ptr<LoanPolicy> policy_;
};
