#pragma once
#include <memory>
#include <string>
#include "api.h"

// TODO: one concrete factory per family (LightFactory, DarkFactory) that makes MATCHING products,
// a makeFactory(name) lookup, and a renderLogin(factory) that only talks to the WidgetFactory interface.
inline std::unique_ptr<WidgetFactory> makeFactory(const std::string& family) {
  (void)family;
  return nullptr;
}

inline std::string renderLogin(const WidgetFactory& factory) {
  (void)factory;
  return "";
}
