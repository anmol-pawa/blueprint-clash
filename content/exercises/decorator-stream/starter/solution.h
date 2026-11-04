#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include <utility>
#include "api.h"

// TODO: write UpperWriter, TruncateWriter, BracketWriter and CountingWriter.
// Each one is a Writer that owns another Writer (unique_ptr), adds one behaviour, and forwards flush().
// Tip: a small shared base class can own the wrapped writer and forward flush once.
class UpperWriter : public Writer {
 public:
  explicit UpperWriter(std::unique_ptr<Writer> next) : next_(std::move(next)) {}
  void write(const std::string&) override {}
  void flush() override {}

 private:
  std::unique_ptr<Writer> next_;
};
