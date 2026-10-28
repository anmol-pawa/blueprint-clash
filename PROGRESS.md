# Blueprint Clash progress

Append a dated entry after every run: what changed, how it was verified (commands, screenshot notes), known gaps, what's next. Newest at the bottom.

## 2026-10-28: Project seeded
- Added `CLAUDE.md`, `ROADMAP.md` (phases A–G), `docs/GAME_DESIGN.md`, `docs/CURRICULUM.md` and `docs/ARCHITECTURE.md`.
- The C++ judge should be ported from Algo Clash (`/home/user/algo-clash/lib/judge/`) once it exists. Otherwise spike `@yowasp/clang` (it ships libc++ for wasm32-wasip1).
- Next: ROADMAP A1.

## 2026-10-28: A1 scaffold
- Scaffolded from Query Clash: Next.js 16 / React 19 / Pixi 8 / Tailwind 4 / Vitest, pixel-UI CSS kit, PWA (manifest, `gen-sw.mjs` with the worker-fragment fix, `PwaRegister`), `ci.yml` + `pages.yml` (basePath `/blueprint-clash`), original blueprint pixel icons (`scripts/gen-icons.mjs`). No Query/SQL/PGlite code carried over.
- Title screen (`app/page.tsx`) with the LLD and HLD track cards (`lib/tracks.ts`, tested).
- Verification: `npm run lint`, `typecheck`, `test`, `build`, `build:pages` all pass. Playwright on the static build at desktop 1280×800 and iPhone 14: no console errors, no horizontal overflow, service worker registers; screenshots looked correct (one desktop glyph/text overlap fixed afterwards with padding).
- Known gaps: the cards are not yet links (no modes exist); `content:verify` not yet present. `/home/user/algo-clash` has docs only, so A2 needs the toolchain spike (ARCH §2) with an ADR.
- Process note: this session was assigned branch `claude/funny-ramanujan-nw9qoh`, so work was pushed there, not `main`; Pages deploys only from `main`. CI/deploy confirmation skipped (Actions quota).
- Next: A2 (C++ judge).
