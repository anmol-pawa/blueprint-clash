#pragma once
#include <string>

// A tiny pretend operating system. open() hands out ids, close() takes them back.
namespace os {
int open(const std::string& path);   // returns a fresh id (> 0)
void close(int id);                  // closing an id that is not open counts as an error
int openCount();                     // how many ids are open right now
int closeErrors();                   // how many bad closes (double close, unknown id) happened
void reset();
}  // namespace os
