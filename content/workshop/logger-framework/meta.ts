import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "logger-framework",
  title: "Logger Framework",
  level: "SDE2",
  parMinutes: 45,
  patterns: ["Chain of Responsibility", "Observer", "Dependency Injection"],
  requirements: [
    { id: "R-log", text: "log(level, category, message) turns a record into one line and sends it to the sinks. Levels are Debug < Info < Warn < Error; setLevel() sets a logger-wide minimum (default Debug) and records below it are dropped. accepted() counts the records that passed that check.", phase: "base", hidden: false },
    { id: "R-sinks", text: "addSink(sink, minLevel) adds a destination the logger owns. Every sink gets the same line, in the order the sinks were added, but only if the record's level is at least that sink's own minimum. A sink added later does not see earlier records. A null sink is ignored. A record with no sinks is still counted by accepted().", phase: "base", hidden: true },
    { id: "R-format", text: "The line is `[<time>] <LEVEL> <category>: <message>` with LEVEL one of DEBUG, INFO, WARN, ERROR and an empty category written as `-`.", phase: "base", hidden: true },
    { id: "R-oneline", text: "A carriage return or line feed in the category or message is written as the two characters \\r or \\n, so one record is always one line and a message cannot forge a second record.", phase: "base", hidden: true },
    { id: "R-clock", text: "The time comes from the injected Clock. It is read exactly once per accepted record (never for a dropped record), and every sink receives that same line. makeLogger() returns nullptr for a null clock.", phase: "base", hidden: true },
    { id: "R-category", text: "Storm 1: setCategoryLevel(category, level) gives a dot-separated category and everything below it its own minimum, replacing the logger-wide level for those records (it may be more or less verbose). Matching is by whole segments (\"db\" governs \"db.pool\" but not \"dbx\"), and the most specific rule wins. Without a rule, a record follows the logger-wide level, and changing that level leaves the rules alone.", phase: "storm1", hidden: true },
    { id: "R-clear", text: "Storm 1: clearCategoryLevel(category) removes the rule on exactly that category (children fall back to the next rule up, or the logger-wide level); an unknown name is a no-op. setCategoryLevel() with an empty name returns false and changes nothing. Sink levels still apply after the category rule.", phase: "storm1", hidden: true },
  ],
  bad: [
    {
      dir: "forged_lines",
      failsPhase: "base",
      failingTests: ["Format.LineBreaksInTheMessageAreEscaped", "Format.CarriageReturnsAndCategoryBreaksAreEscapedToo"],
      reason: "The message is pasted into the line unchanged. A user-controlled string containing a newline and something shaped like a log header produces a second, forged record. Formatting belongs in one class whose job includes making a record exactly one line.",
    },
    {
      dir: "clock_per_sink",
      failsPhase: "base",
      failingTests: ["Sinks.AllSinksShareOneTimestampPerRecord"],
      reason: "The line is rebuilt for each sink, so the clock is read once per delivery. The same record then carries a different time in the console and in the file, and a tick count that depends on how many sinks are attached. Read the clock once, format once, fan the finished line out.",
    },
    {
      dir: "clock_before_gate",
      failsPhase: "base",
      failingTests: ["Levels.DroppedRecordsNeverReadTheClock", "Levels.RecordsBelowTheLoggerLevelAreDropped"],
      reason: "The timestamp is taken at the top of log(), before the level check. A dropped debug record is supposed to be nearly free (a real clock read is a system call), and here it still costs one and burns a tick of a scripted clock. The cheapest check goes first.",
    },
    {
      dir: "sink_level_ignored",
      failsPhase: "base",
      failingTests: ["Sinks.EachSinkFiltersByItsOwnLevel", "Sinks.TheSinkLevelAppliesOnTopOfTheLoggerLevel"],
      reason: "The minimum passed to addSink() is stored but never consulted, so the 'errors only' file receives everything the console does. The per-sink level is what lets one logger serve a chatty console and a quiet pager feed at once.",
    },
    {
      dir: "accepted_counts_deliveries",
      failsPhase: "base",
      failingTests: ["Sinks.AnAcceptedRecordIsCountedEvenWithNoSink"],
      reason: "The counter is incremented inside the sink loop, so it counts deliveries: zero with no sinks, double with two. A metric means what its name says, and 'accepted by the logger' is decided before any sink is involved.",
    },
    {
      dir: "prefix_match",
      failsPhase: "storm1",
      failingTests: ["Categories.RulesMatchWholeSegmentsOnly"],
      reason: "A rule matches with a string prefix test, so quieting 'db' also silences 'dbx' and 'database'. Category names are paths: the unit of matching is a dot-separated segment, and the walk up the path belongs in one small class with its own tests.",
    },
    {
      dir: "exact_category_only",
      failsPhase: "storm1",
      failingTests: ["Categories.ChildCategoriesInheritTheirParentsRule", "Categories.TheMostSpecificRuleWins"],
      reason: "Rules are looked up by the exact category, so a rule on 'db' does nothing for 'db.pool'. Operators set rules at the subsystem level and expect every child to follow; the whole point of dotted categories is inheritance.",
    },
    {
      dir: "shallowest_rule_wins",
      failsPhase: "storm1",
      failingTests: ["Categories.TheMostSpecificRuleWins"],
      reason: "The lookup walks from the root down and stops at the first rule, so a rule on 'db' beats a deliberate override on 'db.pool'. You turn one subsystem to debug to chase a bug and nothing happens. The nearest rule must win.",
    },
    {
      dir: "level_resets_rules",
      failsPhase: "storm1",
      failingTests: ["Categories.ChangingTheLoggerLevelLeavesRulesAlone"],
      reason: "setLevel() also clears the category rules, perhaps because both live in the same map or the same 'configure' method. Raising the global level in production silently throws away the per-subsystem overrides an operator set an hour ago. Two settings with different owners need different state.",
    },
  ],
};
