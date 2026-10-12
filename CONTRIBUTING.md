# Contributing to Synora

Thanks for your interest! Synora is early-stage, so please open an issue to discuss significant changes before sending a PR.

## Setup

```bash
git clone https://github.com/s4h223/Synora.git
cd Synora
npm install
npm run dev      # launches Chrome with the extension and hot reload
```

To load a production build manually, run `npm run build`, then use **Load unpacked** on `.output/chrome-mv3` at `chrome://extensions`.

## Before opening a PR

```bash
npm run check    # typecheck + lint + tests + build (same as CI)
```

- Keep PRs focused; one feature or fix per PR.
- Add or update tests for logic in `src/lib/`.
- Update `PROJECT_STATUS.md` if you change what works, and `ARCHITECTURE.md` if you change a design decision.
- Don't claim a feature works unless you've verified it.

## Code style

- TypeScript strict mode. Avoid `any`; validate untrusted data (page content, AI output, storage) with Zod.
- Formatting and linting are handled by Biome (`npm run lint:fix`).
- Framework-free logic goes in `src/lib/`; React UI goes in `src/features/` and `src/components/`.
- Use the design tokens in `src/styles/globals.css` (`bg-surface`, `text-fg-secondary`, `text-accent`, …) rather than raw hex values.

## Privacy and security rules

- Never commit API keys or secrets.
- Never send user code, audio, or history to any service without explicit user consent.
- Don't add Chrome permissions without documenting why in `ARCHITECTURE.md`.
- Never execute AI-generated code.

## Reporting security issues

Please don't open a public issue for security vulnerabilities. Use GitHub's private vulnerability reporting on this repository.
