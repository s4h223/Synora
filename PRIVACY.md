# Privacy

Synora is designed so that **you** decide what leaves your browser.

## What Synora stores, and where

All data is stored **locally in your browser** (IndexedDB and `chrome.storage.local`). Synora has no server and no analytics or telemetry.

- Settings and AI provider configuration, including any API key you enter
- Learning history: sessions, messages, hints, challenge attempts, mistakes, reviews
- Code snapshots you choose to save

You can export or delete all of it from Settings → Privacy _(available from Phase 1/2)_.

## What Synora sends, and to whom

| Data | Sent to | When |
|---|---|---|
| Problem description, your messages | The AI provider **you** configured | When you send a message or request an AI feature |
| Your editor code | The AI provider you configured | Only when code access is enabled **and** you send a request; every message that includes code is marked |
| Voice audio | Your browser's speech recognition service (in Chrome this may be Google's servers unless on-device recognition is available) or a speech provider you configured | Only while the microphone is visibly active |

Synora runs challenge code **locally** in your browser; it is never uploaded for execution.

Some free-tier AI providers may use submitted data, including code, to improve their models. Check your provider's terms.

## What Synora never does

- Read pages other than `leetcode.com/problems/*`
- Run on LeetCode contest pages
- Track your browsing
- Store raw audio
- Sell or share data

## Changes

Material changes to this policy will be noted in the changelog and in-app.
