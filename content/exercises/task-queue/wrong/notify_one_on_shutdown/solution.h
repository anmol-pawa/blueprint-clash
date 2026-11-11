#pragma once
#include <mutex>
#include <queue>
#include <utility>
#include "api.h"

// One lock, one condition. Workers sleep while there is nothing to do, run each task *outside* the lock,
// and leave only when shutdown was requested and the queue is drained.
class TaskQueue {
 public:
  TaskQueue(Lock& lock, Condition& wakeup) : lock_(lock), wakeup_(wakeup) {}

  bool submit(Task task) {
    std::lock_guard<Lock> guard(lock_);
    if (stopping_) return false;
    tasks_.push(std::move(task));
    wakeup_.notifyOne();
    return true;
  }

  void shutdown() {
    std::lock_guard<Lock> guard(lock_);
    stopping_ = true;
    wakeup_.notifyOne();
  }

  void runWorker() {
    for (;;) {
      Task task;
      {
        std::lock_guard<Lock> guard(lock_);
        while (tasks_.empty() && !stopping_) wakeup_.wait(lock_);
        if (tasks_.empty()) return;  // shutting down and nothing left to drain
        task = std::move(tasks_.front());
        tasks_.pop();
      }
      task();  // lock released: tasks may call submit(), and slow tasks block nobody
    }
  }

 private:
  Lock& lock_;
  Condition& wakeup_;
  std::queue<Task> tasks_;
  bool stopping_ = false;
};
