import type { Responsibility } from "@/lib/workshop/types";

export const rubric: Responsibility[] = [
  { id: "res-facade", text: "Exposes the public calls and sequences the collaborators: validate, find the room, check capacity and clashes, then commit; no interval maths of its own", phase: "base", owners: ["SchedulerImpl", "SchedulerService", "Scheduler", "RoomScheduler", "BookingService", "SchedulerFacade"] },
  { id: "res-span", text: "Represents a half-open stretch of minutes and answers whether two of them overlap, in one place", phase: "base", owners: ["Span", "TimeRange", "Interval", "TimeSlot", "Period", "DateRange"] },
  { id: "res-calendar", text: "Keeps one room's meetings in start order and answers 'is this span free' by looking only at the neighbours; adds and removes meetings", phase: "base", owners: ["Calendar", "RoomCalendar", "Schedule", "Timetable", "BookingList", "IntervalSet"] },
  { id: "res-room", text: "Represents a room: its name, seats and calendar, and whether a group fits", phase: "base", owners: ["Room", "MeetingRoom", "RoomInfo", "Space"] },
  { id: "res-directory", text: "Owns the rooms in the order they were added and finds one by name", phase: "base", owners: ["RoomDirectory", "RoomRegistry", "RoomRepository", "RoomStore", "Rooms", "Building"] },
  { id: "res-index", text: "Knows which room holds each live booking and how many occurrences remain, so cancel and roomOf need no search", phase: "base", owners: ["BookingIndex", "BookingRegistry", "BookingLedger", "BookingDirectory", "BookingStore"] },
  { id: "res-chooser", text: "Decides, as its own Strategy, which free room gets a booking that names none, so a different rule touches no existing class", phase: "storm1", owners: ["RoomChooser", "RoomSelector", "AllocationStrategy", "RoomPicker", "RoomAllocator", "BestFitChooser"] },
  { id: "res-request", text: "Describes a booking as a first meeting plus a repeat rule, validates it and expands it into occurrences, so a single booking is a series of one", phase: "storm2", owners: ["BookingRequest", "Series", "Recurrence", "BookingSeries", "RepeatRule", "SeriesRequest"] },
];
