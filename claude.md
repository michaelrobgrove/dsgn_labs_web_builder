# CLAUDE.md — Agent Operating Guide

This repository uses AI agents. Before taking any action, you (Claude) must read the current plan and repo context so you work with the latest decisions and constraints.

## Always Do This First

1) Read the plan and status
- Open `SUMMARY.md` in full. Treat it as the source of truth for goals, progress, recommendations, risks, and next steps.
- Do not delete or replace content in `SUMMARY.md`. When updating, append progress notes or new sections; preserve the original plan.

2) Read project guidelines and structure
- Open `AGENTS.md` and follow its conventions (routing, code style, bindings, naming, and commit scope).
- Skim `README.md` and `GEMINI.md` for high‑level context.

3) Inspect configuration and routes
- Open `wrangler.toml`, `package.json` and check bindings (KV `SITE_STORAGE`, R2 `WEBSITE_FILES`, D1 `DB`) and scripts.
- List and skim `functions/**` (API/file routes), `index.html`, `dashboard.html`, and any other pages.

4) Form a tiny execution plan
- Based on `SUMMARY.md`, write a short, ordered checklist of steps.
- Validate assumptions (e.g., required env vars are provided by Cloudflare Pages) before coding.

Only after you complete the steps above should you start modifying or creating files.

## Cloudflare Pages Conventions (must follow)

- Functions live under `functions/**` and export `onRequest*` ESM handlers.
- Dynamic routes use square brackets, e.g., `functions/checkout/[sessionId].js`.
- Keep functions stateless; interact with KV/R2/D1 via `env` bindings.
- Do not add secrets to code. Assume env vars are set in Pages.

## Security & Quality Checklist (apply to every change)

- Validate HTTP method and input; return structured JSON errors for APIs.
- Never trust client prices; Stripe amounts must be constants (currently $50 = `5000` cents).
- Verify Stripe webhook signatures and handle non‑happy paths safely.
- Ensure user‑affecting features respect auth when required by `SUMMARY.md`.
- Keep copy ASCII‑safe; remove mojibake; avoid embedding untrusted HTML.
- Prefer minimal, surgical diffs consistent with repo style (2‑space, semicolons, single quotes in functions).

## Phase Guidance (from SUMMARY.md)

- Phase 1: Auth0 + D1 persistence + dashboard. Keep `SUMMARY.md` progress updated; don’t overwrite the original plan.
- Phase 2: Post‑payment GitHub + Cloudflare API deployment; design with tokens and least privilege.

## When Updating `SUMMARY.md`

- Append a “Progress Update” or “Decisions” section; do not remove existing content.
- Include: actions performed, configuration requirements, risks/concerns, and next steps.

## Quick Startup Checklist

- [ ] Read `SUMMARY.md`, `AGENTS.md`, `README.md`, `GEMINI.md`.
- [ ] Inspect `wrangler.toml`, `package.json`, and all route files under `functions/**`.
- [ ] Confirm Cloudflare bindings used match the plan (KV/R2/D1).
- [ ] Draft a short plan aligned to `SUMMARY.md` before coding.
- [ ] Make minimal changes, keep style consistent, and update `SUMMARY.md` with progress.

