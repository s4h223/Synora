# Privacy

Synora is designed so that **you** decide what leaves your browser.

## What Synora stores, and where

All data is stored **locally in your browser** (IndexedDB and `chrome.storage.local`). Synora has no server and no analytics or telemetry.

- Settings and AI provider configuration, including any API key you enter (stored unencrypted in your browser profile, never synced)
- Your conversations with the Coach
- Learning history: sessions, messages, hints, challenge attempts, mistakes, reviews
- Code snapshots you choose to save

You can export or delete all of it from Settings → Privacy _(available from Phase 1/2)_.

## What Synora sends, and to whom

| Data | Sent to | When |
|---|---|---|
| Problem description, your messages | The AI provider **you** configured | When you send a message or request an AI feature |
| Your editor code | The AI provider you configured | When you send a request with code attached (every such message is marked), or on Pair mode checks if you turned Pair mode on |
| Voice audio | Your browser's speech recognition service (in Chrome this may be Google's servers unless on-device recognition is available) or a speech provider you configured | Only while the microphone is visibly active |

Synora runs challenge code **locally** in your browser; it is never uploaded for execution.

Some free-tier AI providers may use submitted data, including code, to improve their models. Check your provider's terms.

## How Synora reads LeetCode

- A small script is present on `leetcode.com` pages (except contests) so Synora notices when you open a problem. It only reads content on `/problems/*` pages, and only when the side panel asks.
- Problem details (title, description, tags) are fetched from LeetCode's own API, from within the LeetCode page.
- Your editor code is read only according to your **Editor code access** setting: *Off*, *Ask* (only when you click "Read from editor"), or *Live* (follows your editor as you type, entirely inside your browser).
- In Live mode, Synora also notes which line your mouse rests on, to show Line Insights. This stays in your browser; the line is only sent to your AI provider if you click one of its questions.
- **Pair mode** (off by default) sends your current code to your AI provider when you pause typing, so it can point out problems without being asked. It's limited to at most one check every 30–60 seconds.

## What Synora never does

- Read pages outside `leetcode.com`
- Run on LeetCode contest pages
- Track your browsing
- Store raw audio
- Sell or share data

## Changes

Material changes to this policy will be noted in the changelog and in-app.
