import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-gate", text: "Decides whether a record is accepted, from its level (and, later, its category)", phase: "base", owners: ["LevelGate", "LevelFilter", "Filter", "Threshold", "LevelPolicy", "LogFilter"] },
  { id: "res-format", text: "Turns a record into one line, including the one-line escaping", phase: "base", owners: ["LineFormat", "Formatter", "LineFormatter", "LogFormatter", "RecordFormatter"] },
  { id: "res-sinks", text: "Holds the destinations with their own minimums and delivers a line to each in order", phase: "base", owners: ["SinkSet", "SinkList", "Sinks", "SinkRegistry", "SinkChain", "Dispatcher"] },
  { id: "res-facade", text: "Exposes the public operations and sequences gate, clock, format and delivery", phase: "base", owners: ["LoggerImpl", "Logger", "LogService", "LoggerCore", "LogManager"] },
  { id: "res-category", text: "Resolves the rule that governs a category: whole segments, nearest rule first", phase: "storm1", owners: ["CategoryLevels", "CategoryRules", "CategoryFilter", "LevelRules", "CategoryTree", "LevelGate"] },
];
