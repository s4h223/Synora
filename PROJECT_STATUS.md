# Project Status

Legend: ✅ done and verified · 🧪 implemented and unit-tested; awaiting manual verification in Chrome · 🚧 in progress · ⏳ planned · ⚠️ known limitation

_Last updated: 2026-10-12_

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0. Scaffold | WXT + React + TS strict + Tailwind v4, Biome, Vitest, CI, docs | ✅ |
| 1. Foundation | Design system, side panel shell, LeetCode detection, code reading + paste fallback, local DB, mic-permission spike | ✅ detection verified live · 🧪 rest |
| 2. AI Coach | Provider adapters, streaming chat, hint ladder, live code mirroring, Pair mode, beginner mode, onboarding | 🧪 |
| 2b. Line Insights | Hover/cursor-aware help for the line you're on | 🧪 |
| 3. Challenge Engine | Pyodide runtime, harness, curated problem packs, verified failures, predictions | ⏳ |
| 4. Learning + Progress | Mistake tracking, recurring patterns, dashboard, Independence Score | ⏳ |
| _v0.1 release_ | | |
| 5. Synora Live | Speech-to-text, text-to-speech, Tutor and Rubber Duck voice modes | ⏳ |
| 6. Interview Mode | Staged interviewer, timer, evidence-based report | ⏳ |
| 7. Advanced | Spaced repetition, Thought Replay, concept visualizer | ⏳ |
| 8. Release | E2E tests, accessibility, performance, Chrome Web Store | ⏳ |
| 9. Optional | Supabase sync, hosted proxy, more languages | ⏳ |

## Phase 1: Foundation

Automated checks (typecheck, lint, 70 unit tests, build) pass. Verified against the live site: LeetCode's GraphQL endpoint returns the fields Synora uses for free, premium and unknown problems (checked 2026-10-12).

| Feature | Status | Notes |
|---|---|---|
| Side panel shell (header, 4 tabs, settings view) | 🧪 | Tabs collapse to icons below ~300px |
| Design system (tokens, Button, Badge, Sheet, Switch, SegmentedControl, Tooltip, ConfirmDialog, Skeleton, EmptyState) | 🧪 | |
| Problem detection via GraphQL in content script | 🧪 | Parsing tested against a real response |
| DOM fallback extraction | 🧪 | Tested against **synthetic** markup only; selectors unverified on live LeetCode |
| SPA navigation + tab switching | 🧪 | |
| Re-inject content script into pre-existing tabs | 🧪 | |
| Contest pages excluded | 🧪 | |
| Read Monaco editor code (on user action) | 🧪 | Relies on `window.monaco`; needs live verification |
| Manual paste fallback | 🧪 | |
| Code access setting (Off / Ask / Auto) | 🧪 | "Auto" has no effect until AI features ship |
| Local DB (Dexie): problems + event log, dedupe | 🧪 | |
| Progress tab: real counts from local data | 🧪 | |
| Delete all learning data | 🧪 | |
| Microphone permission spike | 🧪 | Needs manual test: does the prompt appear in the side panel, or does the fallback tab open? |
| Keyboard shortcut Alt+Shift+S opens panel | 🧪 | Needs manual test |

## Phase 2: AI Coach + live copilot

Automated: typecheck, lint, 151 unit tests, build. **Not yet verified against a real provider or the live LeetCode editor.**

| Feature | Status | Notes |
|---|---|---|
| Providers: Anthropic (official SDK, lazy-loaded), OpenAI-compatible (OpenAI, Gemini, Groq, OpenRouter, Ollama, custom) | 🧪 | Adapters tested with mocked transports |
| Provider settings: per-provider keys, model list loading, Save & test, runtime host permission | 🧪 | |
| Demo provider (dev builds only) for testing without a key | 🧪 | |
| Streaming chat, Markdown, highlighted + copyable code, stop, retry | 🧪 | |
| 4-level hint ladder (solution needs confirmation) | 🧪 | |
| Quick actions incl. "Explain selection" | 🧪 | |
| Experience levels (beginner / intermediate / advanced) shape every prompt | 🧪 | |
| Live code mirroring via Monaco change events | 🧪 | Needs live verification |
| Clickable "line N" references that highlight the line in the editor | 🧪 | Needs live verification |
| Pair mode (quiet / active): proactive nudges after pauses, cooldown, change threshold | 🧪 | Each check is an AI request |
| Persistent conversations per problem; "New conversation" | 🧪 | |
| Onboarding (level, code access, AI choice) | 🧪 | |
| Prompt-injection guards (delimited data, escaped tags, unforgeable app instructions) | 🧪 | |

## Phase 2b: Line Insights

Automated: 191 unit tests total. **Hover tracking not yet verified in the live LeetCode editor.**

| Feature | Status | Notes |
|---|---|---|
| Hover (450 ms dwell) and cursor-line focus from Monaco | 🧪 | Uses `onMouseMove` + `getWordAtPosition` |
| Offline reference: ~60 entries for Python, Java, C++, JS/TS built-ins with cost and gotchas | 🧪 | Curated; no AI |
| High-precision pitfall rules (9) with false-positive tests | 🧪 | |
| Line-scoped questions: purpose, trace, risks, explain every part | 🧪 | |
| "Explain it back" with Socratic feedback | 🧪 | |
| Pin / collapse; setting to turn off | 🧪 | |

## Known limitations

- ⚠️ Live and Challenge tabs are placeholders.
- ⚠️ Captured code lives in memory only and is cleared when the panel closes.
- ⚠️ The side panel JS bundle is ~790 kB (React, Radix, Dexie, Markdown, highlighting). The Anthropic SDK (~210 kB) loads only when Claude is used.
- ⚠️ API keys are stored unencrypted in `chrome.storage.local`, like all bring-your-own-key extensions.
- ⚠️ `--synora-fg-muted` (#71717A) is 4.0:1 against the background, below WCAG AA for body text. It's reserved for supplementary text only.
- ⚠️ leetcode.cn is not supported.
