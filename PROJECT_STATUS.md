# Project Status

Legend: ✅ done and verified · 🚧 in progress · ⏳ planned · ⚠️ known limitation

_Last updated: 2026-10-12_

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0. Scaffold | WXT + React + TS strict + Tailwind v4, Biome, Vitest, CI, docs | ✅ |
| 1. Foundation | Design system, side panel shell, LeetCode detection, code reading + paste fallback, local DB, mic-permission spike | ⏳ |
| 2. AI Coach | Provider adapters, streaming chat, hint ladder, conversation history, onboarding | ⏳ |
| 3. Challenge Engine | Pyodide runtime, harness, curated problem packs, verified failures, predictions | ⏳ |
| 4. Learning + Progress | Mistake tracking, recurring patterns, dashboard, Independence Score | ⏳ |
| _v0.1 release_ | | |
| 5. Synora Live | Speech-to-text, text-to-speech, Tutor and Rubber Duck voice modes | ⏳ |
| 6. Interview Mode | Staged interviewer, timer, evidence-based report | ⏳ |
| 7. Advanced | Spaced repetition, Thought Replay, concept visualizer | ⏳ |
| 8. Release | E2E tests, accessibility, performance, Chrome Web Store | ⏳ |
| 9. Optional | Supabase sync, hosted proxy, more languages | ⏳ |

## Phase 0: verified

- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` all pass locally.
- Build produces `.output/chrome-mv3` with a manifest requesting only `sidePanel` and `storage`.
- Clicking the toolbar icon is configured to open the side panel (`openPanelOnActionClick`).
- GitHub Actions CI runs typecheck, lint, test and build on pushes to `main` and on PRs.

## Known limitations

- ⚠️ The side panel is a placeholder; real UI arrives in Phase 1.
- ⚠️ `--synora-fg-muted` (#71717A) is 4.0:1 against the background, below WCAG AA for body text. It's reserved for supplementary text only.
