import type { WorkshopMeta } from "@/lib/workshop/types";

export const meta: WorkshopMeta = {
  id: "logger-framework",
  title: "Logger Framework",
  level: "SDE2",
  parMinutes: 45,
  patterns: ["Observer", "Decorator", "Adapter", "Dependency Injection"],
  requirements: [
    { id: "R-levels", text: "Levels are ordered Debug < Info < Warn < Error and the logger starts at Info. A call below the logger's level is dropped before anything else: it is not counted, reaches no sink, and does not read the clock. levelName() gives DEBUG, INFO, WARN or ERROR.", phase: "base", hidden: true },
    { id: "R-stamp", text: "The clock is injected. For every accepted call the logger reads it exactly once, builds one Record, and every sink sees that same time, even when no sink wants the record.", phase: "base", hidden: true },
    { id: "R-sinks", text: "Sinks are added with their own threshold and offered each accepted record in the order they were added; a sink receives it when record.level >= its threshold (inclusive). The logger's level applies first.", phase: "base", hidden: false },
    { id: "R-manage", text: "addSink() takes ownership and returns an id (1, 2, 3, ..., never reused) or -1 for a null sink; removeSink(id) removes and destroys the sink and returns false for an unknown or already removed id. makeLogger(nullptr) returns nullptr.", phase: "base", hidden: true },
    { id: "R-flush", text: "Logger::flush() calls flush() on every sink, in the order they were added.", phase: "base", hidden: true },
    { id: "R-pattern", text: "Storm 1: addLineSink() adds a sink that receives text built from a pattern: %l level name, %t time in decimal, %m message, %% a percent sign. An unknown specifier or a trailing '%' makes the pattern invalid (-1, nothing added). A message is never interpreted, no newline is added, thresholds and flush() work as for any sink.", phase: "storm1", hidden: true },
    { id: "R-dedup", text: "Storm 2: addDedupSink() collapses a run of identical records (same level and message, within windowMs of the first of the run, inclusive) to the first record plus a summary '<message> (x<N>)' carrying the last repeat's time, emitted when the run ends or on flush(). Each dedup sink keeps its own run; windowMs < 0 or a null sink gives -1.", phase: "storm2", hidden: true },
  ],
  bad: [
    {
      dir: "clock_per_sink",
      failsPhase: "base",
      failingTests: ["Stamp.OneClockReadPerAcceptedRecord", "Stamp.AllSinksSeeTheSameTime", "Stamp.TheClockIsReadEvenWhenNoSinkWantsTheRecord"],
      reason: "The timestamp is taken inside the loop over sinks, so one event gets a different time in every destination and a record nobody wants is never stamped. The logger should build the Record once and the sinks should only receive it.",
    },
    {
      dir: "stamps_dropped",
      failsPhase: "base",
      failingTests: ["Levels.DroppedRecordsAreNotStamped"],
      reason: "The clock is read before the level check. Behaviour looks right from outside, but the most common call in production (a disabled debug line) now pays for a clock read. The cheap check goes first.",
    },
    {
      dir: "exclusive_threshold",
      failsPhase: "base",
      failingTests: ["Sinks.AThresholdIsInclusive", "Sinks.EachSinkChoosesItsOwnThreshold", "Levels.TheHelpersLogAtTheirOwnLevel"],
      reason: "A sink 'at Warn' is given Error only. Thresholds mean 'this level and above', and a strict comparison written inline in the loop hides the off-by-one; a named atLeast() helper (or a test at every boundary) catches it.",
    },
    {
      dir: "ids_reused",
      failsPhase: "base",
      failingTests: ["Manage.IdsAreNeverReused"],
      reason: "The id is derived from the current number of sinks, so after a removal the next sink gets an id that is already in use, and a stale id held by a caller silently removes somebody else's sink. Ids need their own counter.",
    },
    {
      dir: "sink_leaked_on_remove",
      failsPhase: "base",
      failingTests: ["Manage.TheLoggerOwnsItsSinks"],
      reason: "Removing a sink releases the owning pointer and forgets it: the sink is never destroyed, so files stay open and buffers are never flushed by a destructor. Ownership is the point of taking a unique_ptr; removal must end it.",
    },
    {
      dir: "format_sequential",
      failsPhase: "storm1",
      failingTests: ["Pattern.TheMessageIsNeverReinterpreted"],
      reason: "The pattern is expanded by replacing %m, then %l, then %t over the same string, so text inside a message (a user typed '%t') is expanded by a later step. Parsing the pattern once into parts and inserting values as data is both correct and faster.",
    },
    {
      dir: "pattern_unchecked",
      failsPhase: "storm1",
      failingTests: ["Pattern.AnUnknownSpecifierIsRefused", "Pattern.ATrailingPercentIsRefused", "Pattern.ARefusedSinkTakesNoIdAndIsDestroyed"],
      reason: "Unknown specifiers are copied through as text, so a typo like %L silently produces a log nobody can parse. Validation belongs where the pattern is parsed, at configuration time, not on the first log line in production.",
    },
    {
      dir: "format_flush_lost",
      failsPhase: "storm1",
      failingTests: ["Pattern.FlushReachesTheLineSink"],
      reason: "The adapter forwards write but not flush, so a buffered file sink never sees the shutdown flush and loses its last lines. An adapter must forward the whole interface it adapts, not only the method the author was thinking about.",
    },
    {
      dir: "dedup_flush_silent",
      failsPhase: "storm2",
      failingTests: ["Dedup.FlushEmitsTheSummaryAndEndsTheRun", "Dedup.SummariesComeBeforeTheFlushOfTheWrappedSink"],
      reason: "flush() forgets the held-back repeats instead of reporting them, so at shutdown the count is lost. A pending summary is exactly the thing a flush exists to push out.",
    },
    {
      dir: "dedup_ignores_level",
      failsPhase: "storm2",
      failingTests: ["Dedup.AnotherLevelIsNotARepeat"],
      reason: "Only the message text is compared, so a warning and an info with the same words collapse, and a real warning is hidden behind an info. What makes two records 'the same' is a decision to write down once, not to scatter in a condition.",
    },
    {
      dir: "dedup_shared_run",
      failsPhase: "storm2",
      failingTests: ["Dedup.EachSinkKeepsItsOwnRun"],
      reason: "The run state is shared by every dedup sink (a static), so the first sink's records make the second sink think it already printed them. State that describes one destination belongs in that destination's object.",
    },
    {
      dir: "dedup_window_slides",
      failsPhase: "storm2",
      failingTests: ["Dedup.TheWindowIsMeasuredFromTheFirstOfTheRun", "Dedup.TheWindowIsInclusive"],
      reason: "Every repeat moves the start of the window, so a message repeating every few seconds is collapsed forever and the summary never appears while the problem continues. The window must be anchored at the first record of the run.",
    },
  ],
};
