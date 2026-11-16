#pragma once
#include <map>
#include <string>

// The stored template texts, by id.
class TemplateStore {
 public:
  bool add(const std::string& id, const std::string& text) {
    if (id.empty()) return false;
    return texts_.emplace(id, text).second;
  }

  // The text, or nullptr when there is no such template.
  const std::string* find(const std::string& id) const {
    const auto found = texts_.find(id);
    return found == texts_.end() ? nullptr : &found->second;
  }

 private:
  std::map<std::string, std::string> texts_;
};
