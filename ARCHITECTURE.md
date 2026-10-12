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
  lib/             ai/ leetcode/ exec/ db/ voice/ learning/ (framework-free logic)
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
Install-time permissions are minimal (`sidePanel`, `storage`; `scripting` and the `leetcode.com` host are added in Phase 1). AI provider hosts are `optional_host_permissions`, requested only when the user configures that provider.

### Verified vs. unverified
Challenge results carry one of three labels: **verified failure** (executed and compared against a trusted reference), **candidate test**, or **reasoning challenge**. Expected outputs come only from curated reference solutions, never from an AI model.

### Security model for code execution
User code runs in a dedicated Web Worker with a hard timeout (`terminate()`), network globals removed, and Pyodide's JS bridge blocked. AI-generated code is never executed. See PROJECT_STATUS.md for the current state.
