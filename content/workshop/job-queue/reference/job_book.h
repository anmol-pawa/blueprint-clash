#pragma once
#include <string>
#include <unordered_map>

#include "job_record.h"

// Every job ever enqueued, by id. Records never move, so a reference stays valid while handlers add more jobs.
class JobBook {
 public:
  bool contains(const std::string& id) const { return jobs_.count(id) > 0; }

  JobRecord& add(JobRecord record) {
    const std::string id = record.id;
    return jobs_[id] = std::move(record);
  }

  JobRecord* find(const std::string& id) {
    const auto it = jobs_.find(id);
    return it == jobs_.end() ? nullptr : &it->second;
  }

  const JobRecord* find(const std::string& id) const {
    const auto it = jobs_.find(id);
    return it == jobs_.end() ? nullptr : &it->second;
  }

  std::size_t waiting() const {
    std::size_t n = 0;
    for (const auto& entry : jobs_) n += entry.second.state == jobq::State::Waiting ? 1 : 0;
    return n;
  }

 private:
  std::unordered_map<std::string, JobRecord> jobs_;
};
