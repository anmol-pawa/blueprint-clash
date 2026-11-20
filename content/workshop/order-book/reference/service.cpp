#include "book_impl.h"

std::unique_ptr<book::Book> book::makeBook() { return std::make_unique<BookImpl>(); }
std::unique_ptr<book::TimedBook> book::makeTimedBook() { return std::make_unique<BookImpl>(); }
std::unique_ptr<book::AmendBook> book::makeAmendBook() { return std::make_unique<BookImpl>(); }
