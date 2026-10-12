# Synora

**Think better. Code smarter.**

Synora is a free, open-source Chrome extension that turns LeetCode into a learning environment. Instead of handing you answers, it helps you become an independent problem solver:

- **Coach:** a context-aware tutor that knows the problem you're on and teaches with a progressive hint ladder.
- **Challenge Engine:** "break my code." It runs your Python solution against a trusted reference on generated edge cases, entirely in your browser, and only calls a failure *verified* when it actually executed and confirmed it.
- **Synora Live:** talk through your thinking out loud, as a tutor session, a rubber duck, or a mock interview.
- **Learning Intelligence:** tracks recurring mistakes and hint dependency so you can see *why* you get stuck, not just *that* you did.

> **Status: early development.** See [PROJECT_STATUS.md](PROJECT_STATUS.md) for what works today. Features listed above are the roadmap, not all shipped.

## Principles

- **Local-first.** Your history lives in your browser. No account required.
- **Bring your own AI.** Use a local model (Ollama, Chrome's built-in AI), a free-tier key, or a paid key. Synora is free software. AI inference is not free, and Synora never pretends otherwise.
- **Useful without AI.** Verified challenges, reviews, and progress tracking work with no model configured.
- **Explicit consent.** Your code is never sent anywhere without your permission. See [PRIVACY.md](PRIVACY.md).
- **Honest labels.** Synora distinguishes verified results from AI guesses.

## Install (development build)

Requirements: Node.js 22+ and Chrome (or another Chromium browser with Side Panel support).

```bash
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `.output/chrome-mv3`.
4. Click the Synora toolbar icon to open the side panel.

For development with hot reload:

```bash
npm run dev
```

This launches a separate Chrome profile with the extension loaded.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Dev build with hot reload in a fresh browser profile |
| `npm run build` | Production build to `.output/chrome-mv3` |
| `npm run zip` | Package a zip for the Chrome Web Store |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` / `lint:fix` | Biome lint and format check / autofix |
| `npm test` | Unit tests (Vitest) |
| `npm run check` | All of the above, as CI runs it |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): how the extension is structured and why
- [PROJECT_STATUS.md](PROJECT_STATUS.md): roadmap and what is verified
- [CONTRIBUTING.md](CONTRIBUTING.md): development workflow
- [PRIVACY.md](PRIVACY.md): what data Synora touches and where it goes

## Disclaimer

Synora is an independent project and is not affiliated with or endorsed by LeetCode. Synora is disabled on contest pages; use it for practice, not competition.

## License

[MIT](LICENSE)
