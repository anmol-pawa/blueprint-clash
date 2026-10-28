# Blueprint Clash progress

Append a dated entry after every run: what changed, how it was verified (commands, screenshot notes), known gaps, what's next. Newest at the bottom.

## 2026-10-28: Project seeded
- Added `CLAUDE.md`, `ROADMAP.md` (phases A–G), `docs/GAME_DESIGN.md`, `docs/CURRICULUM.md` and `docs/ARCHITECTURE.md`.
- The C++ judge should be ported from Algo Clash (`/home/user/algo-clash/lib/judge/`) once it exists. Otherwise spike `@yowasp/clang` (it ships libc++ for wasm32-wasip1).
- Next: ROADMAP A1.

## 2026-10-28: A1 scaffold
- Scaffolded from Query Clash: Next.js 16 / React 19 / Pixi 8 / CodeMirror 6 / Tailwind 4, PWA manifest + service worker generator (`scripts/gen-sw.mjs`, worker-fragment fix kept), `ci.yml` + `pages.yml` (basePath `/blueprint-clash`), original generated icons (`scripts/gen-icons.mjs`), blueprint-themed title screen with locked mode tiles, `lib/siteInfo.ts` + test. All Query/SQL/PGlite references removed.
- Verification: `npm run lint`, `typecheck`, `test` (2 pass), `build`, `build:pages` all pass. Playwright at 1280x800 and iPhone 14: no console errors, no horizontal overflow, text readable (screenshots viewed).
- CI and Pages deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Known gaps: title screen is static (no art yet, comes in B1); Start is disabled.
- Next: A2 (C++ judge; algo-clash has no judge yet, so toolchain spike + ADR).
