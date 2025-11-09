# Repository Guidelines

## Project Structure & Module Organization
- Root pages: `index.html`, `success.html`, `sitemap.xml`, static assets (`*.png`).
- Functions (Cloudflare Pages Functions): `functions/api/*.js` for API routes (e.g., `chat.js`, `create-checkout.js`), and file routes like `functions/download/[file].js`.
- Dynamic HTML route: `checkout/[sessionId].html`.
- Config: `wrangler.toml` (KV/R2 bindings), `package.json` (scripts, deps).

## Build, Test, and Development Commands
- `npm install` — install dependencies.
- `npm run dev` — start Wrangler Pages dev server with KV (`SITE_STORAGE`) and R2 (`WEBSITE_FILES`) bindings.
- `npm run deploy` — deploy current directory to Cloudflare Pages.
Notes: Ensure Cloudflare credentials are configured (`wrangler login`) and required bindings/vars exist in your Pages project.

## Coding Style & Naming Conventions
- Language: JavaScript (ES Modules in functions). Use 2‑space indentation, semicolons, and single quotes.
- Routes: lower‑kebab for file names; dynamic segments in square brackets (e.g., `functions/download/[file].js`, `checkout/[sessionId].html`).
- Functions export handlers as `onRequest`, `onRequestGet`, or `onRequestPost` as used (see `functions/api/chat.js`).
- Keep functions stateless; interact with KV/R2 via `env` bindings.

## Testing Guidelines
- No test suite is configured yet. When adding tests, prefer small unit tests for route handlers and utility modules. Keep fixtures minimal and deterministic.
- Name tests alongside modules (e.g., `functions/api/chat.test.js`) or in a `tests/` folder. Use `node:test` or a lightweight runner.

## Commit & Pull Request Guidelines
- Commits: imperative mood and scoped when useful (e.g., `api: validate request body in create-checkout`).
- PRs: include a clear summary, linked issue, affected routes/files, setup notes (env vars/bindings), and screenshots for UI changes.
- Keep changes focused; avoid unrelated refactors in the same PR.

## Security & Configuration Tips
- Secrets via Cloudflare Pages env vars: `GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`. Do not commit secrets.
- Storage bindings (see `wrangler.toml`): KV `SITE_STORAGE`, R2 `WEBSITE_FILES`. Ensure these exist in your Cloudflare project before `dev`/`deploy`.
- Validate and sanitize all request input; enforce method checks in handlers.

## Agent Operating Notes
- Before doing anything, agents must read `SUMMARY.md` for the live plan/status and `AGENTS.md` for conventions.
- See `claude.md` for step‑by‑step agent guidance (context load order, security checklist, and how to update `SUMMARY.md`).
