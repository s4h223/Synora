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

### Verified vs. unverified
Challenge results carry one of three labels: **verified failure** (executed and compared against a trusted reference), **candidate test**, or **reasoning challenge**. Expected outputs come only from curated reference solutions, never from an AI model.

### Security model for code execution
User code runs in a dedicated Web Worker with a hard timeout (`terminate()`), network globals removed, and Pyodide's JS bridge blocked. AI-generated code is never executed. See PROJECT_STATUS.md for the current state.
