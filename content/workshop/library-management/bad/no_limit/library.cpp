// One class, two maps, every rule inline. Passes the happy path; misses the limit nobody asked about.
#include <map>
#include <set>

#include "api.h"

namespace {
class BigLibrary : public lib::Library {
 public:
  lib::Status addBook(const std::string& id, const std::string& title, const std::string& author, int copies) override {
    if (copies_.count(id)) return lib::Status::DuplicateId;
    copies_[id] = copies;
    authors_[id] = author;
    (void)title;
    return lib::Status::Ok;
  }
  lib::Status addMember(const std::string& id, const std::string&) override {
    return loans_.emplace(id, std::set<std::string>{}).second ? lib::Status::Ok : lib::Status::DuplicateId;
  }
  lib::Status borrow(const std::string& m, const std::string& b) override {
    if (!loans_.count(m)) return lib::Status::NoSuchMember;
    if (!copies_.count(b)) return lib::Status::NoSuchBook;
    if (loans_[m].count(b)) return lib::Status::AlreadyBorrowed;
    if (copies_[b] == 0) return lib::Status::NoCopiesAvailable;
    copies_[b]--;
    loans_[m].insert(b);
    return lib::Status::Ok;
  }
  lib::Status giveBack(const std::string& m, const std::string& b) override {
    if (!loans_.count(m)) return lib::Status::NoSuchMember;
    if (!copies_.count(b)) return lib::Status::NoSuchBook;
    if (!loans_[m].erase(b)) return lib::Status::NotBorrowed;
    copies_[b]++;
    return lib::Status::Ok;
  }
  int availableCopies(const std::string& b) const override {
    auto it = copies_.find(b);
    return it == copies_.end() ? -1 : it->second;
  }
  std::vector<std::string> loansOf(const std::string& m) const override {
    auto it = loans_.find(m);
    return it == loans_.end() ? std::vector<std::string>{} : std::vector<std::string>(it->second.begin(), it->second.end());
  }
  std::vector<std::string> findByAuthor(const std::string& a) const override {
    std::vector<std::string> out;
    for (const auto& [id, author] : authors_) if (author == a) out.push_back(id);
    return out;
  }

 private:
  std::map<std::string, int> copies_;
  std::map<std::string, std::string> authors_;
  std::map<std::string, std::set<std::string>> loans_;
};
}  // namespace

std::unique_ptr<lib::Library> lib::makeLibrary() { return std::make_unique<BigLibrary>(); }
