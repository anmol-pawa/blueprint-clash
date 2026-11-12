#include "dedup_sink.h"
#include "formatting.h"
#include "logger_impl.h"

namespace {
constexpr int kRefused = -1;
}  // namespace

const char* logx::levelName(Level level) {
  switch (level) {
    case Level::Debug: return "DEBUG";
    case Level::Info: return "INFO";
    case Level::Warn: return "WARN";
    case Level::Error: return "ERROR";
  }
  return "";
}

std::unique_ptr<logx::Logger> logx::makeLogger(std::unique_ptr<Clock> clock) {
  if (clock == nullptr) return nullptr;
  return std::make_unique<LoggerImpl>(std::move(clock));
}

int logx::addLineSink(Logger& logger, std::unique_ptr<LineSink> sink, Level threshold, const std::string& pattern) {
  if (sink == nullptr) return kRefused;
  std::optional<Pattern> parsed = Pattern::parse(pattern);
  if (!parsed) return kRefused;
  return logger.addSink(std::make_unique<FormattingSink>(std::move(*parsed), std::move(sink)), threshold);
}

int logx::addDedupSink(Logger& logger, std::unique_ptr<Sink> sink, Level threshold, long long windowMs) {
  if (sink == nullptr || windowMs < 0) return kRefused;
  return logger.addSink(std::make_unique<DedupSink>(std::move(sink), windowMs), threshold);
}
