#pragma once
#include <memory>
#include <string>

// A UI element that can copy itself without the caller knowing its concrete type.
class Widget {
 public:
  virtual ~Widget() = default;
  // The prototype operation. C++ cannot make `unique_ptr<Derived>` covariant with `unique_ptr<Widget>`,
  // so every class returns `unique_ptr<Widget>` and must override this itself.
  virtual std::unique_ptr<Widget> clone() const = 0;
  virtual std::string describe() const = 0;
  virtual void setText(const std::string& text) = 0;  // a Panel's text is its title
};
