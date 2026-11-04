#pragma once
#include <memory>
#include <string>

// Two kinds of widget. Every widget belongs to one visual family ("light", "dark", ...).
class Button {
 public:
  virtual ~Button() = default;
  virtual std::string family() const = 0;
  virtual std::string render(const std::string& label) const = 0;
};

class Checkbox {
 public:
  virtual ~Checkbox() = default;
  virtual std::string family() const = 0;
  virtual std::string render(const std::string& label, bool checked) const = 0;
};

// Makes a matching set of widgets. A screen is built from ONE factory, so it can never mix families.
class WidgetFactory {
 public:
  virtual ~WidgetFactory() = default;
  virtual std::unique_ptr<Button> createButton() const = 0;
  virtual std::unique_ptr<Checkbox> createCheckbox() const = 0;
};
