#include "editor_impl.h"

std::unique_ptr<edit::Editor> edit::makeEditor() { return std::make_unique<EditorImpl>(std::make_unique<NeverMerge>()); }

std::unique_ptr<edit::GroupingEditor> edit::makeGroupingEditor() {
  return std::make_unique<EditorImpl>(std::make_unique<NeverMerge>());
}

std::unique_ptr<edit::GroupingEditor> edit::makeTypingEditor() {
  return std::make_unique<EditorImpl>(std::make_unique<TypingRuns>());
}
