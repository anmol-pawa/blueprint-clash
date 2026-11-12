#include "logger_impl.h"

std::unique_ptr<logx::Logger> logx::makeLogger() { return std::make_unique<LoggerImpl>(); }

std::unique_ptr<logx::CategoryLogger> logx::makeCategoryLogger() { return std::make_unique<LoggerImpl>(); }

std::unique_ptr<logx::CollapsingLogger> logx::makeCollapsingLogger() { return std::make_unique<LoggerImpl>(); }
