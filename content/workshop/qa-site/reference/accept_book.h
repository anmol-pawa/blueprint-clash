#pragma once
#include <functional>
#include <map>
#include <string>

// Which answer, if any, is accepted for each question.
class AcceptBook {
 public:
  std::string acceptedFor(const std::string& question) const {
    const auto it = accepted_.find(question);
    return it == accepted_.end() ? std::string() : it->second;
  }

  void accept(const std::string& question, const std::string& answer) { accepted_[question] = answer; }
  void clear(const std::string& question) { accepted_.erase(question); }

  void forEach(const std::function<void(const std::string& question, const std::string& answer)>& visit) const {
    for (const auto& entry : accepted_) visit(entry.first, entry.second);
  }

 private:
  std::map<std::string, std::string> accepted_;
};
