import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "logger-framework",
  title: "Logger Framework",
  level: "Senior",
  parMinutes: 50,
  patterns: ["Chain of Responsibility", "Decorator", "Strategy"],
  requirements: [
    { id: "R-format", text: "Every sink receives the line `[LEVEL] category: message`, with LEVEL one of DEBUG, INFO, WARN, ERROR; when the category is empty the line is `[LEVEL] message`. The message is passed through unchanged.", phase: "base", hidden: true },
    { id: "R-fanout", text: "log() delivers the line to every sink that wants it, in the order the sinks were added. A sink added later receives only later lines. A logger with no sinks does nothing.", phase: "base", hidden: true },
    { id: "R-levels", text: "A sink receives a line only if its level is at least the sink's own minimum. setLevel() sets a logger-wide threshold, starting at Debug, below which a record is dropped for every sink. Both must allow the line.", phase: "base", hidden: true },
    { id: "R-setup", text: "addSink() with a null sink returns false and changes nothing; sinkCount() counts only attached sinks. Two loggers share no state.", phase: "base", hidden: true },
    { id: "R-category", text: "Storm 1: setCategoryLevel() gives a dotted category its own level, used for that category and its dotted descendants. The most specific configured ancestor wins, 'net' is not an ancestor of 'network', a category level may be looser or stricter than the logger-wide level, and sink minimums still apply afterwards. clearCategoryLevel() removes it; the empty category cannot be configured.", phase: "storm1", hidden: true },
    { id: "R-collapse", text: "Storm 2: a collapsing sink writes the first line of a run of identical lines and holds back the rest, then writes `(last message repeated N times)` when a different line arrives or flush() is called. A run is per sink and is made of the lines that reach that sink, so lines filtered out for it do not break it. flush() ends the run. Ordinary sinks still get every line.", phase: "storm2", hidden: true },
  ],
  bad: [
    {
      dir: "sink_min_ignored",
      failsPhase: "base",
      failingTests: ["SinkLevel.ASinkOnlyGetsLinesAtOrAboveItsMinimum", "SinkLevel.EachSinkFiltersOnItsOwn"],
      reason: "The sink's minimum is stored and never consulted, so every sink gets everything. It is the commonest slip in a first draft: a field that is set in the constructor and read nowhere. Making the level filter its own small class puts the comparison in exactly one place.",
    },
    {
      dir: "global_level_ignored",
      failsPhase: "base",
      failingTests: ["Global.TheLoggerLevelDropsLinesForEverySink", "Global.TheStricterOfLoggerAndSinkWins"],
      reason: "setLevel() stores the threshold but log() never asks for it. Two independent filters (logger-wide and per sink) need two independent tests; a design that has one 'level' concept in mind merges them and loses one.",
    },
    {
      dir: "sinks_reversed",
      failsPhase: "base",
      failingTests: ["Fanout.SinksAreWrittenInTheOrderTheyWereAdded"],
      reason: "The sinks are walked from the newest to the oldest. Order is part of the contract (an alert sink after the file sink may rely on the file line already existing), and only a test with one shared journal across sinks can see it.",
    },
    {
      dir: "null_sink_counted",
      failsPhase: "base",
      failingTests: ["Setup.ANullSinkIsRefused", "Setup.RefusingANullSinkLeavesTheOthersWorking"],
      reason: "A null sink is waved through and counted, so the caller is told it worked. Validate at the door: a rejected input that returns true is worse than a crash because nothing points at the cause.",
    },
    {
      dir: "prefix_not_dotted",
      failsPhase: "storm1",
      failingTests: ["Category.ANameThatMerelyStartsTheSameIsNotADescendant"],
      reason: "Ancestry is a raw string prefix, so a level set on 'net' also silences 'network'. A category is a path, not a string: the check has to compare whole dotted segments. The tree-walk in the reference makes that true by construction.",
    },
    {
      dir: "shortest_prefix_wins",
      failsPhase: "storm1",
      failingTests: ["Category.TheMostSpecificCategoryWins", "Category.TheOrderOfConfigurationDoesNotMatter"],
      reason: "The walk up the path keeps overwriting the answer instead of stopping at the first hit, so the root-most category wins. 'Most specific wins' is the whole point of a hierarchy; stopping at the first hit while walking up makes it structural.",
    },
    {
      dir: "category_only_stricter",
      failsPhase: "storm1",
      failingTests: ["Category.ACategoryCanLoosenTheLoggerLevel"],
      reason: "A category level is combined with the logger-wide level using max(), so it can silence a category but never open one up. The usual reason to configure a category is to turn on Debug for one noisy suspect while the rest stays quiet.",
    },
    {
      dir: "collapse_global",
      failsPhase: "storm2",
      failingTests: ["Collapse.OrdinarySinksStillGetEveryLine", "Collapse.EachCollapsingSinkKeepsItsOwnRun"],
      reason: "Repeats are detected once per record, before the sinks, so ordinary sinks lose lines too. Whether to collapse is a property of one sink's delivery. A per-sink chain with a collapsing link keeps the state next to the sink it belongs to.",
    },
    {
      dir: "flush_forgets",
      failsPhase: "storm2",
      failingTests: ["Collapse.FlushWritesThePendingSummary", "Collapse.FlushEndsTheRunSoTheNextLineIsWrittenAgain"],
      reason: "flush() clears the counters but throws the pending summary away. The count is information the operator needed; the whole reason to have flush() is to push out what was being held back.",
    },
    {
      dir: "run_ignores_filter",
      failsPhase: "storm2",
      failingTests: ["Collapse.LinesBelowTheSinkMinimumDoNotBreakARun"],
      reason: "The run is judged before the sink's minimum is applied, so a Debug line the sink would never show still ends the run. The collapsing step must sit after the level filter, which is an ordering decision that a chain makes explicit and a monolith hides.",
    },
  ],
};
