#pragma once
#include <memory>
#include <string>
#include <utility>
#include "api.h"

namespace detail {

// One small product class per (family, kind). The factory is the only place a family is chosen.
class LightButton final : public Button {
 public:
  std::string family() const override { return "light"; }
  std::string render(const std::string& label) const override { return "[" + label + "]"; }
};

class LightCheckbox final : public Checkbox {
 public:
  std::string family() const override { return "light"; }
  std::string render(const std::string& label, bool checked) const override {
    return std::string(checked ? "[x] " : "[ ] ") + label;
  }
};

class DarkButton final : public Button {
 public:
  std::string family() const override { return "dark"; }
  std::string render(const std::string& label) const override { return "<" + label + ">"; }
};

class DarkCheckbox final : public Checkbox {
 public:
  std::string family() const override { return "dark"; }
  std::string render(const std::string& label, bool checked) const override {
    return std::string(checked ? "(x) " : "( ) ") + label;
  }
};

}  // namespace detail

class LightFactory final : public WidgetFactory {
 public:
  std::unique_ptr<Button> createButton() const override { return std::make_unique<detail::LightButton>(); }
  std::unique_ptr<Checkbox> createCheckbox() const override { return std::make_unique<detail::LightCheckbox>(); }
};

class DarkFactory final : public WidgetFactory {
 public:
  std::unique_ptr<Button> createButton() const override { return std::make_unique<detail::DarkButton>(); }
  std::unique_ptr<Checkbox> createCheckbox() const override { return std::make_unique<detail::LightCheckbox>(); }
};

inline std::unique_ptr<WidgetFactory> makeFactory(const std::string& family) {
  if (family == "light") return std::make_unique<LightFactory>();
  if (family == "dark") return std::make_unique<DarkFactory>();
  return nullptr;
}

// The screen depends on the abstraction only: a new family needs a new factory, not a new screen.
inline std::string renderLogin(const WidgetFactory& factory) {
  const auto checkbox = factory.createCheckbox();
  const auto button = factory.createButton();
  return checkbox->render("Remember me", true) + "\n" + button->render("Sign in");
}
