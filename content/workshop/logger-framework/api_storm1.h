#pragma once
// Change Storm 1 adds levels per category. Everything from api.h still holds.
#include "api.h"

namespace logx {

// Categories are dotted paths such as "net", "net.http" or "net.http.client".
// A category's own level overrides the logger-wide level for that category and everything below it:
//   - the level in force for a record is the one set on the most specific category that is the record's
//     category or one of its dotted ancestors ("net" is an ancestor of "net.http", but NOT of "network");
//   - if no category on the path has a level, the logger-wide level applies;
//   - a category level may be stricter or looser than the logger-wide level.
// Sink minimums still apply afterwards, exactly as before.
class CategoryLogger : public Logger {
 public:
  // Returns false and changes nothing if `category` is empty. Setting a category again replaces its level.
  virtual bool setCategoryLevel(const std::string& category, Level threshold) = 0;
  // Removes the category's own level so its records fall back to its ancestors. Returns false if it had none.
  virtual bool clearCategoryLevel(const std::string& category) = 0;
};

std::unique_ptr<CategoryLogger> makeCategoryLogger();

}  // namespace logx
