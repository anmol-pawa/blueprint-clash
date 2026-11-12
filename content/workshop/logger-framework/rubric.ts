import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-sinks", text: "Owns the sinks, their thresholds and ids, and offers a record to the ones that want it", phase: "base", owners: ["SinkList", "SinkRegistry", "Dispatcher", "Router", "Fanout", "SinkSet"] },
  { id: "res-facade", text: "Gates calls by level, reads the clock once, counts, and hands the record on", phase: "base", owners: ["LoggerImpl", "Logger", "LogService", "LoggerCore", "Logging"] },
  { id: "res-format", text: "Turns a record into text from a pattern, behind the sink seam so the logger does not change", phase: "storm1", owners: ["Pattern", "Formatter", "PatternFormatter", "FormattingSink", "LineFormatter", "Layout"] },
  { id: "res-dedup", text: "Keeps the current run of repeats for one sink and emits the summary", phase: "storm2", owners: ["DedupSink", "RepeatFilter", "Deduplicator", "CollapsingSink", "ThrottleSink", "RepeatCollapser"] },
];
