#pragma once
#include <memory>
#include <string>
#include <utility>

// Context: owns the current state and forwards every action to it.
// Each handler returns the next state, or nullptr when the action is not allowed.
class Document {
 public:
  Document() : state_(std::make_unique<Draft>()) {}

  bool edit() {
    if (!state_->allowsEdit()) return false;
    ++revision_;
    return true;
  }
  bool submit() { return transition(state_->submit()); }
  bool approve() { return transition(state_->approve()); }
  bool reject() { return transition(state_->reject()); }

  std::string stateName() const { return state_->name(); }
  int revision() const { return revision_; }

 private:
  class State {
   public:
    virtual ~State() = default;
    virtual std::string name() const = 0;
    virtual bool allowsEdit() const { return false; }
    virtual std::unique_ptr<State> submit() const { return nullptr; }
    virtual std::unique_ptr<State> approve() const { return nullptr; }
    virtual std::unique_ptr<State> reject() const { return nullptr; }
  };

  class Draft final : public State {
   public:
    std::string name() const override { return "draft"; }
    bool allowsEdit() const override { return true; }
    std::unique_ptr<State> submit() const override { return std::make_unique<Review>(); }
  };

  class Review final : public State {
   public:
    std::string name() const override { return "review"; }
    bool allowsEdit() const override { return true; }
    std::unique_ptr<State> approve() const override { return std::make_unique<Published>(); }
    std::unique_ptr<State> reject() const override { return std::make_unique<Draft>(); }
  };

  class Published final : public State {
   public:
    std::string name() const override { return "published"; }
  };

  // Swap only after the handler has returned, so no state is destroyed while it is running.
  bool transition(std::unique_ptr<State> next) {
    if (!next) return false;
    state_ = std::move(next);
    return true;
  }

  std::unique_ptr<State> state_;
  int revision_ = 0;
};
