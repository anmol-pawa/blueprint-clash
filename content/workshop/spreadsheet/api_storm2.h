#pragma once
// Change Storm 2: change notifications.
#include <functional>
#include <memory>
#include <string>

#include "api_storm1.h"

namespace sheet {

// One cell whose value changed: `before` and `after` are what get() returned before and after the edit (an empty cell
// is the number 0).
struct Change {
  std::string cell;
  Value before;
  Value after;
};

using Listener = std::function<void(const Change&)>;

// makeWatchedSheet() has everything makeFunctionSheet() has, plus listeners.
//
// After every SUCCESSFUL set, once the whole recalculation is finished, each subscribed listener is called once for
// every cell whose Value is different from before (the edited cell included; cells that were recomputed to the same
// value, and failed sets, report nothing). A listener may call get() and text() and sees the finished sheet; calling
// set() from inside a listener is not allowed. Changes are reported so that a cell comes after every changed cell it
// depends on; the order of unrelated cells is not specified. For each change, listeners are called in the order they
// subscribed.
class WatchedSheet : public Sheet {
 public:
  // Returns an id for unsubscribe(). Ids are never reused.
  virtual int subscribe(Listener listener) = 0;

  // The listener hears nothing from the next set on. An unknown id does nothing.
  virtual void unsubscribe(int id) = 0;
};

std::unique_ptr<WatchedSheet> makeWatchedSheet();

}  // namespace sheet
