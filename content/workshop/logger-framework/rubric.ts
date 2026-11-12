import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-format", text: "Turns level, category and message into the one line every sink receives", phase: "base", owners: ["LineFormatter", "Formatter", "LogFormatter"] },
  { id: "res-delivery", text: "Owns one sink's delivery: its minimum level and the write, behind a seam that new behaviour can join", phase: "base", owners: ["Handler", "SinkChannel", "Appender", "Channel", "SinkHandler", "LogHandler"] },
  { id: "res-facade", text: "Exposes the public operations and sequences check, format and fan-out in sink order", phase: "base", owners: ["LoggerImpl", "Logger", "LogDispatcher", "Dispatcher", "LoggerCore"] },
  { id: "res-policy", text: "Decides whether a record is produced at all: the logger-wide level and the most specific category level", phase: "storm1", owners: ["LevelPolicy", "LevelRegistry", "CategoryLevels", "Thresholds", "LevelTree"] },
  { id: "res-collapse", text: "Holds back repeated lines for one sink and reports the count, without touching other sinks", phase: "storm2", owners: ["RepeatCollapser", "DedupHandler", "Collapser", "RepeatFilter", "CollapsingHandler"] },
];
