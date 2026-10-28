# Decisions for owner review

Routine runs never stop for approval. When in doubt they proceed with their recommendation and log it here. Review later and ask for a change if required. Newest at the bottom; mark a decision `Reviewed` once you have looked at it.

| # | Date | Decision | Alternatives | Why / impact | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | 2026-10-28 | Browser judge compiles with `-fno-exceptions`; Workshop APIs use error returns (`bool`, `optional`, error enums) instead of exceptions. | Custom wasm sysroot with exception support. | Stock `@yowasp/clang` sysroot has no `__cxa_throw` (ADR 0001). Editorials note the trade-off. | Proceeding |
| 2 | 2026-10-28 | Concurrency problems use a deterministic cooperative thread shim, plus native-only predict-behaviour cards. | Custom wasi-threads sysroot (big build effort). | `std::thread` aborts at run time in the sysroot (ADR 0001). | Proceeding |
