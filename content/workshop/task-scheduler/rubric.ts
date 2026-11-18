import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public calls and sequences the collaborators: validate the arguments, assign the scheduling rank, put the job in the queue, delegate running to the dispatcher", phase: "base", owners: ["SchedulerImpl", "SchedulerService", "Scheduler", "TaskScheduler", "SchedulerFacade", "JobScheduler"] },
  { id: "res-clock", text: "Owns the simulated time and keeps it monotonic, separate from the queue", phase: "base", owners: ["SimClock", "Clock", "SimulatedClock", "ManualClock", "FakeClock", "TimeSource"] },
  { id: "res-queue", text: "Keeps the pending jobs in running order (time, priority, scheduling order) together with the index by id, and updates both in single operations (insert, remove, pop the next due one)", phase: "base", owners: ["RunQueue", "JobQueue", "PendingJobs", "TaskQueue", "ScheduleQueue", "JobStore", "Timeline"] },
  { id: "res-dispatch", text: "Runs what is due in order from the live queue, one job at a time, setting the clock for each, so jobs can schedule and cancel while running", phase: "base", owners: ["Dispatcher", "Runner", "JobRunner", "Executor", "Ticker", "RunLoop"] },
  { id: "res-entry", text: "Represents one pending job (id, time, priority, rank, job) as a value that the queue stores and the dispatcher reads", phase: "base", owners: ["Entry", "Task", "JobEntry", "ScheduledJob", "ScheduledTask", "Job"] },
  { id: "res-cadence", text: "Knows how a job repeats (never, or at a fixed period) and produces the next occurrence from the previous one, keeping the rank", phase: "storm1", owners: ["Cadence", "Recurrence", "Schedule", "Repeat", "Period", "Trigger"] },
  { id: "res-catchup", text: "Decides, per series and as its own Strategy, which due occurrences really run when time jumps, so adding a policy touches no existing one", phase: "storm2", owners: ["CatchUpPolicy", "MisfirePolicy", "CatchUp", "Misfire", "MissedRunPolicy", "RunPolicy"] },
];
