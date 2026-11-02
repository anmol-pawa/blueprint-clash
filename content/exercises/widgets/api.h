#pragma once
#include <memory>
#include <string>
#include <utility>

class Widget {
 public:
  virtual ~Widget() { --liveCount_; }
  virtual std::unique_ptr<Widget> clone() const = 0;
  virtual std::string kind() const = 0;
  const std::string& text() const { return text_; }
  void setText(std::string t) { text_ = std::move(t); }

  /// Widgets alive right now (tests use it to spot leaks).
  static int live() { return liveCount_; }

 protected:
  explicit Widget(std::string t) : text_(std::move(t)) { ++liveCount_; }
  Widget(const Widget& o) : text_(o.text_) { ++liveCount_; }
  Widget& operator=(const Widget&) = default;

 private:
  std::string text_;
  static inline int liveCount_ = 0;
};

class Label final : public Widget {
 public:
  explicit Label(std::string t) : Widget(std::move(t)) {}
  std::unique_ptr<Widget> clone() const override { return std::make_unique<Label>(*this); }
  std::string kind() const override { return "label"; }
};

class Button final : public Widget {
 public:
  explicit Button(std::string t) : Widget(std::move(t)) {}
  std::unique_ptr<Widget> clone() const override { return std::make_unique<Button>(*this); }
  std::string kind() const override { return "button"; }
};
