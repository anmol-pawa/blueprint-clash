import type { ExerciseMeta } from "@/lib/exercises/types";

export const meta: ExerciseMeta = {
  id: "factory-registry",
  title: "Codec factory: new codecs without editing the creator",
  concepts: ["factory method", "registry of factories", "lazy creation", "unique_ptr ownership"],
  hints: [
    "What changes when someone invents a codec, and what never does? The registry should only know how to look a name up and call what it finds.",
    "Store `std::map<std::string, CodecFactory>`. `registerCodec` inserts; `create` finds the entry and calls the stored function. Nothing is built at registration.",
    "`return factories_.emplace(name, std::move(factory)).second;` rejects duplicates and keeps the first. `std::map` iterates in key order, so `names()` is already sorted.",
  ],
  wrong: [
    { dir: "hardcoded", failingTests: ["Registry.CreatesWhatWasRegistered"], reason: "Keeps an if-ladder for names it knows and ignores the registered factories, so every new codec edits the creator (the problem the pattern removes)." },
    { dir: "overwrite_duplicate", failingTests: ["Registry.FirstRegistrationWins"], reason: "Lets a later registration replace the first, so plug-in load order silently changes behaviour and register returns true for a conflict." },
    { dir: "eager_call", failingTests: ["Registry.FactoriesRunLazily"], reason: "Calls the factory at registration to validate it; construction can be expensive or have side effects, and registration should be cheap." },
    { dir: "unsorted_names", failingTests: ["Registry.NamesAreAlphabetical"], reason: "Returns names in registration order, which makes listings depend on start-up order." },
  ],
};
