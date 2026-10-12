# Architecture

This document records how Synora is built and *why*. Update it when a decision changes.

## Overview

Synora is a **local-first Chrome extension (Manifest V3)** with **no backend** in the MVP.

```
┌──────────────── LeetCode tab ────────────────┐      ┌──────────── Side panel (React) ────────────┐
│ content script (isolated world, tiny)        │◀────▶│ Coach · Live · Challenge · Progress        │
│  • detects problem slug / navigation         │ msgs │  • AI adapters ──▶ user-chosen provider    │
│  • fetches problem data (same-origin GraphQL)│      │  • Dexie (IndexedDB): sessions, events …   │
│ on-demand MAIN-world read of Monaco code     │      │  • Pyodide worker: verified challenges     │
└──────────────────────────────────────────────┘      └────────────────────────────────────────────┘
                         ▲                                              ▲
                         └──────── background service worker ──────────┘
                                   (panel behavior, tab routing)
```

## Stack

| Concern | Choice | Rationale |
|---|---|---|
| Extension framework | [WXT](https://wxt.dev) | Actively maintained, Vite-based, first-class MV3 + side panel support, generates the manifest. Chosen over Plasmo (slower maintenance, Parcel-based). |
| UI | React 19, TypeScript (strict), Tailwind CSS v4 | Design tokens live in `src/styles/globals.css`. |
| Components | shadcn/ui-style primitives on Radix | Copied into `src/components/ui`, so we own them. |
| Local data | Dexie (IndexedDB) + `chrome.storage.local` | IndexedDB for history/analytics; storage.local for settings and keys. |
| AI | Thin in-house adapters | Two wire protocols (OpenAI-compatible, Anthropic Messages) cover nearly every provider. Structured output = JSON + Zod validation + one repair retry. |
| Code execution | Pyodide (CPython → WebAssembly) in an isolated worker | Free, private, no server. Planned for Phase 3. |
| Lint/format | Biome | One fast tool instead of ESLint + Prettier. |
| Tests | Vitest + Testing Library (+ Playwright for E2E later) | |

## Directory layout

```
src/
  entrypoints/     WXT entrypoints: background.ts, sidepanel/, content scripts
  features/        coach/ live/ challenge/ progress/ interview/ settings/
  components/ui/   shared UI primitives
  lib/             leetcode/ db/ voice/ (+ ai/ exec/ learning/ later): framework-free logic
  styles/          globals.css (design tokens)
  assets/          icon source (PNG sizes generated at build)
problems/          curated challenge packs (Phase 3)
tests/             setup, unit tests outside src, E2E, HTML fixtures
```

Rule of thumb: `lib/` holds framework-free logic that is unit-testable without React; `features/` composes it into UI.

## Key decisions

### No backend (MVP)
Every MVP feature runs client-side: AI calls go directly from the side panel to the user's chosen provider, and data lives in IndexedDB. A backend adds cost, an attack surface, and an operations burden that a free project can't sustain. Optional Supabase sync is planned for later and must be opt-in, with explicit migration of local history.

### Permissions

| Permission | Why |
|---|---|
| `sidePanel` | The whole UI lives in Chrome's side panel. |
| `storage` | Settings (and, later, user-entered API keys) in `chrome.storage.local`. |
| `scripting` | Read the Monaco editor **only on explicit user action**, and re-inject the content script into tabs opened before install. |
| `https://leetcode.com/*` | Content script, tab URL access for problem detection, editor reads. |

No `tabs`, `webNavigation`, `history` or `<all_urls>`. AI provider hosts will be `optional_host_permissions`, requested only when the user configures that provider (Phase 2).

### LeetCode integration

- **Detection.** The side panel tracks the active tab of its window via `tabs.onActivated` / `tabs.onUpdated`. LeetCode is an SPA; `history.pushState` navigations surface as `onUpdated` with a `url`. Thanks to the host permission, `tab.url` is visible for LeetCode tabs only.
- **Problem data.** The side panel asks the content script, which calls LeetCode's GraphQL endpoint (same-origin, so the user's session applies) and validates the response with Zod. If that fails, it falls back to DOM extraction using selectors centralised in `src/lib/leetcode/selectors.ts`. Results are cached per slug for the life of the page.
- **Content script footprint.** Runs on `leetcode.com/*` (so SPA navigation into a problem is covered) but excludes `/contest/*`. It has no observers, timers or DOM mutations; it only answers `synora:get-problem` messages and reads page content only on `/problems/*` URLs.
- **Editor code.** `chrome.scripting.executeScript({ world: 'MAIN' })` runs a self-contained function that reads `window.monaco` (focused editor first, then the largest non-plaintext model). The result is treated as untrusted and validated. Manual paste is always available.
- **Contests.** `/contest/*` pages are excluded at the manifest level and classified as `contest` in the UI.

### Bundle size
Validation uses `zod/mini` (tree-shakeable), which took the content script from 88 kB to 25 kB.

### AI layer (`src/lib/ai`)

- `AiProvider` interface: `streamChat(request, handlers)` + optional `listModels()`.
- **Anthropic** uses the official `@anthropic-ai/sdk`, dynamically imported, with `dangerouslyAllowBrowser` (the key is the user's own). Requests cache the system prompt (`cache_control`), set `output_config.effort: "medium"` on Claude 5-family models, and opt into server-side refusal fallbacks (`fallbacks: "default"`) where supported. A fallback mid-stream resets the partial text.
- **OpenAI-compatible** is a small fetch + SSE adapter (`sse.ts`).
- Keys live in `chrome.storage.local` (`local:ai-config`), never synced. Each provider's host is an optional permission requested on "Save & test".
- **Prompts** (`prompts/tutor.ts`): the system prompt holds stable instructions + the problem (cacheable). Each user turn carries `<synora>` app instructions (hint level, quick action), line-numbered `<student_code>`, an optional `<selection>`, then the student's text. Students can't forge `<synora>` tags; data can't close its own tags.
- **History** keeps code only in the last two user turns and fits a character budget.

### Live code + Pair mode

- With code access set to **Live**, the side panel injects a MAIN-world watcher that subscribes to Monaco's content/cursor/model events and posts debounced snapshots (code, language, cursor line, selection). The content script validates and relays them to the panel. Nothing is polled; nothing leaves the browser until an AI request.
- **Pair mode** (`quiet` / `active`) runs a one-shot check when the student pauses (5–8 s), at most every 30–60 s, only if the code changed meaningfully since the last check and differs from LeetCode's starter template. The model must answer with a small JSON verdict; silence is the expected default. Policy logic is pure (`pair-trigger.ts`).

### Line Insights

The Live watcher also reports where the mouse rests (450 ms dwell, deduped by line + word) and the panel tracks cursor-line changes. The focused line drives a compact card in the Coach dock:

1. **Offline reference** (`src/lib/learning/glossary.ts`): curated entries for built-ins and syntax, matched on identifiers/method calls with strings and comments stripped; the hovered word ranks first. Instant, free, no AI.
2. **Pitfalls** (`pitfalls.ts`): a small set of high-precision rules; every rule has negative tests so it doesn't misfire on correct code.
3. **Line questions** (`lineActionPrompt`): purpose-in-context, value trace, risky inputs, explain-every-part, and "Explain it back".

Design rationale from CS-education research: students request line-by-line explanations most but rate summary-style explanations as more helpful (Denny et al., SIGCSE 2023), so "What does this line do?" asks for the line's role rather than a restatement; self-explanation prompts improve learning, especially for low-prior-knowledge students, and transfer best when combined with hints (Marwan et al., ICER 2019; Oli et al., 2024), hence "Explain it back"; many novice errors stem from an inaccurate model of execution (the notional machine), hence value tracing.

### Verified vs. unverified
Challenge results carry one of three labels: **verified failure** (executed and compared against a trusted reference), **candidate test**, or **reasoning challenge**. Expected outputs come only from curated reference solutions, never from an AI model.

### Security model for code execution
User code runs in a dedicated Web Worker with a hard timeout (`terminate()`), network globals removed, and Pyodide's JS bridge blocked. AI-generated code is never executed. See PROJECT_STATUS.md for the current state.
