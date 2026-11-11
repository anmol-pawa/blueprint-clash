#pragma once
#include <mutex>
#include <queue>
#include <utility>
#include "api.h"

// TODO: submit() queues and wakes one worker; shutdown() sets a flag and wakes everyone;
// runWorker() sleeps in a loop while idle, runs each task with the lock released,
// and returns only when shutdown was requested and the queue is empty.
class TaskQueue {
 public:
  TaskQueue(Lock& lock, Condition& wakeup) : lock_(lock), wakeup_(wakeup) {}

  bool submit(Task task) {
    (void)task;
    return false;
  }
  void shutdown() {}
  void runWorker() {}

 private:
  Lock& lock_;
  Condition& wakeup_;
  std::queue<Task> tasks_;
  bool stopping_ = false;
};
