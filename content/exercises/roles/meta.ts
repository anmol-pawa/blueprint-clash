import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "roles",
  title: "Roles: small interfaces, honest types",
  concepts: ["interface segregation", "role interfaces", "multiple inheritance of pure interfaces", "depend on the narrowest interface"],
  hints: [
    "Which classes can truly be written to? A sensor cannot. Should it still have a `write` it must refuse?",
    "Give each capability its own interface (`Readable`, `Writable`) and let a class inherit only the roles it really has. `archive` needs just one of each.",
    "`archive(const Readable& from, Writable& to)` is `to.write(from.read())`. `Notebook : public Readable, public Writable` appends in `write`; `Sensor : public Readable` returns its last reading.",
  ],
  wrong: [
    { dir: "sensor_is_writable", failingTests: ["Roles.SensorCannotBeWritten"], reason: "Sensor inherits Writable and stubs write() as a no-op: callers can pass a sensor where a writable is required and the data vanishes." },
    { dir: "archive_needs_notebook", rejects: "compile", failingTests: [], reason: "archive takes concrete Notebooks, so it cannot copy from a sensor or from the test's own Readable (depends on the widest type, not the narrowest interface)." },
    { dir: "write_overwrites", failingTests: ["Notebook.WriteAppends", "Archive.AppendsIntoNotebook"], reason: "Notebook::write replaces the contents instead of appending to them." },
  ],
};
