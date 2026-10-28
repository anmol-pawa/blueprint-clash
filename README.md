# Blueprint Clash

A creature-tactics RPG that teaches **low-level design in C++** (OOP, SOLID, patterns, concurrency, machine coding) and **system design** (estimation, caching, sharding, replication, messaging, consensus, case studies), from fundamentals to big-tech interview level.

**Play:** https://anmol-pawa.github.io/blueprint-clash/ (installable PWA; on iPhone use Share → Add to Home Screen).

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind 4 · PixiJS 8 · CodeMirror 6 · clang→WASM (planned) · Vitest.

## Develop
```
npm ci
npm run dev          # http://localhost:3000
npm run lint && npm run typecheck && npm test && npm run build && npm run build:pages
```
Design docs live in `docs/`; the work queue is `ROADMAP.md` and the log is `PROGRESS.md`.
