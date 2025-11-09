### Project: User Accounts & Automated Deployment

This document outlines a plan to add user authentication, data persistence, and automated deployment to the DSGN LABS AI Web Builder.

#### 1. Guiding Principles

Based on our conversation, the following principles will guide the development of these new features:

*   **Modern & Professional:** The user interface and experience should be clean, intuitive, and polished, reflecting the quality of the websites it helps create.
*   **Substantial Value:** The features should provide significant value to the user, making the $50 price point feel like a great investment.
*   **Seamless Experience:** The user journey, from guest to registered user to site owner, should be smooth and logical.

#### 2. Competitive Analysis & Positioning

Based on a review of competitors (WebWave, Base44, Figma), we have identified several key takeaways for positioning our service:

*   **"Free to Start" is the Standard:** Competitors confirm that allowing users to start for free is the best way to attract users. Our model of offering the entire design process for free and only charging for the final product is a strong approach.
*   **Conversational AI is a Differentiator:** Our chat-based interface ("Danny") is a unique and engaging experience compared to the more traditional editors used by competitors. We should emphasize this in our marketing.
*   **Simple, One-Time Pricing is a Major Advantage:** Competitors use complex subscription tiers. Our simple, one-time $50 fee is a powerful and transparent value proposition that we should highlight.

**Recommendation:** We should position the service as a "free design experience" with a clear, upfront, one-time fee for launching the site. A phrase like, "Design your entire website for free. When you're ready to launch, it's just a one-time fee of $50 for lifetime hosting and full ownership of your files," should be used to build trust and communicate our value.

#### 3. Core Objectives

*   **User Authentication:** Allow users to sign up and log in to a persistent account.
*   **Data Persistence:** Save chat history and generated website designs to a user's account.
*   **Delayed Purchase:** Enable users to return later to purchase a previously designed site.
*   **Automated Deployment:** After purchase, automatically create a GitHub repository and deploy the website to Cloudflare Pages.

#### 4. Proposed Technology Stack

*   **Authentication:** **Auth0**. It provides a generous free tier, is easy to integrate, and supports social logins (Google, GitHub) out of the box, which simplifies the user experience.
*   **Database:** **Cloudflare D1**. As a serverless SQL database that integrates seamlessly with Cloudflare Workers, it's the natural choice for storing user data, chat sessions, and site designs within the existing ecosystem.
*   **APIs:**
    *   **GitHub API:** To programmatically create new repositories for users' websites.
    *   **Cloudflare API:** To create and manage Cloudflare Pages projects for automated deployments.

#### 5. Implementation Plan

This project can be broken down into two main phases:

**Phase 1: User Authentication & Data Persistence**

This phase focuses on creating the user account system and linking all data to a logged-in user.

1.  **Auth0 Integration:**
    *   Set up a new application in the Auth0 dashboard.
    *   Create new serverless functions (`/functions/api/login.js`, `/functions/api/callback.js`, `/functions/api/logout.js`) to handle the OAuth authentication flow.
2.  **Dashboard & UI:**
    *   Create a new `dashboard.html` page that will serve as the user's central hub for managing their projects.
    *   Modify the main `index.html` page to include "Login" and "Logout" buttons, and to direct logged-in users to their dashboard.
3.  **Database Schema:**
    *   Set up a new Cloudflare D1 database.
    *   Define the database schema with tables for `users`, `chat_sessions`, and `generated_sites`.
4.  **Backend Modifications:**
    *   Update all existing API functions (`/api/chat`, `/api/create-checkout`, etc.) to be user-aware. They will require a valid authentication token to identify the user and read/write data associated with their account.
    *   The current session-based logic will be replaced with database lookups based on the authenticated user.

**Phase 2: Automated GitHub & Cloudflare Deployment**

This phase focuses on the post-payment workflow.

1.  **GitHub API Integration:**
    *   Create a new serverless function (`/functions/api/post-payment-deploy.js`) that is triggered after a successful Stripe payment.
    *   This function will use the GitHub API to:
        1.  Create a new private GitHub repository.
        2.  Commit the generated HTML/CSS/JS files to the new repository.
    *   *Note:* This will require securely storing a GitHub API token with repository creation permissions. We will use Cloudflare's secret management for this.
2.  **Cloudflare API Integration:**
    *   The same `post-payment-deploy.js` function will then use the Cloudflare API to:
        1.  Create a new Cloudflare Pages project.
        2.  Link this new project to the newly created GitHub repository.
        3.  Trigger the first deployment.
3.  **User Notification:**
    *   Upon successful deployment, the user will be notified via email with a link to their new live website and GitHub repository.

#### 6. Future Enhancements

Building on this new foundation, we can consider the following features to further enhance the value of the tool:

*   **Custom Domains:** Allow users to connect a custom domain to their deployed Cloudflare Pages site.
*   **Post-purchase Editing:** Enable users to edit their site content or design after the initial purchase and deployment.
*   **Site Analytics:** Provide basic analytics (e.g., page views) for the deployed website.
*   **Theme Marketplace:** Create a marketplace of pre-designed themes that users can start from.

#### 7. Improvement Ideas

Here are several ideas we can explore to improve the overall user experience and the value of the final product:

**a) Chat & Onboarding Experience**
*   **Conversational Onboarding:** Replace the initial static form with a step-by-step conversational process where "Danny" asks for business details one by one.
*   **Design Style Selection:** Early in the chat, have Danny ask the user to choose a high-level design aesthetic (e.g., "Minimal & Modern," "Bold & Colorful," "Corporate & Clean") to better guide the AI's design choices.
*   **Content & Image Suggestions:** Allow Danny to suggest website copy based on the user's industry and/or source royalty-free images from services like Unsplash to populate the site.

**b) Live Preview & Interactivity**
*   **Device Previews:** Add toggles to the live preview to show how the site will look on desktop, tablet, and mobile devices, reinforcing the "mobile-responsive" value.
*   **Click-to-Edit (Advanced):** A more advanced feature where users can click on an element in the preview (like a button or a headline) and then tell Danny how they want to change it.
*   **Pre-built Sections:** Give users the option to add common, pre-designed sections like a photo gallery, testimonials page, or an FAQ section to speed up the creation process.

**c) Dashboard & Post-Purchase**
*   **Enhanced Dashboard:** The user dashboard could show screenshots of their sites, the real-time deployment status (e.g., "Deploying to Cloudflare..."), and links to both the live URL and the GitHub repository.

#### 8. Next Steps

This is a high-level overview. We can now discuss the details of each step. For example, we can refine the database schema, plan the frontend UI changes for authentication, or detail the exact API endpoints needed.

I will update this `SUMMARY.md` file with our decisions as we proceed. What are your thoughts on this updated plan?

#### 9. Progress Update (Production Readiness)

This section documents current progress, how the plan is being executed, and concrete guidance for operations and next steps. It supplements the plan above without replacing it.

**Completed Work (today)**
- Pricing corrected to $50 (Stripe amount in cents: 5000).
- Webhook repaired and hardened: signature verification, ZIP creation, R2 storage, KV download mapping, optional customer email via Resend.
- Checkout route moved to Cloudflare Pages Functions (`functions/checkout/[sessionId].js`), replacing the previously misplaced file route.
- Download resolution improved: `/api/get-download` uses KV mapping first, then falls back to R2 listing by business name.
- Auth0 scaffolding added: `/api/login`, `/api/callback`, `/api/logout`, `/api/me`.
- D1 schema and helpers added: `users`, `chat_sessions`, `generated_sites` with utilities to upsert users, persist chat sessions, and record purchased sites.
- Dashboard page added (`/dashboard.html`) showing purchased sites for logged‑in users.
- Chat endpoint persists sessions to D1 for logged‑in users; checkout includes `userId` in Stripe metadata.
- Cleaned visible character encoding artifacts in user‑facing pages and emails; removed unused/broken files.

**Configuration (Cloudflare Pages project)**
- KV: `SITE_STORAGE`
- R2: `WEBSITE_FILES`
- D1: `DB`
- Secrets/Vars:
  - `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` (optional), `AUTH0_REDIRECT_URI`
  - `GEMINI_API_KEY`
  - `RESEND_API_KEY` (optional)
  - `SITE_URL`

**Data Model (D1) Overview**
- `users(id TEXT PK, email TEXT, name TEXT, created_at INTEGER)`
- `chat_sessions(id TEXT PK, user_id TEXT, data TEXT, created_at INTEGER)`
- `generated_sites(id TEXT PK, user_id TEXT, business_name TEXT, file_name TEXT, created_at INTEGER)`
- Notes: `generated_sites.id` is the Stripe session id for traceability; chat `data` stores conversation and metadata compactly.

**Key Routes and Roles**
- Build
  - `/api/chat`: calls Gemini; persists chat if logged‑in; returns extracted site HTML.
  - `/api/save-sessions`: saves approved design in KV (3 days) and emails a link to the checkout page.
- Checkout and Fulfillment
  - `/api/create-checkout`: creates Stripe session; writes `pending/<session_id>.json` in KV; includes `userId` when available.
  - `/api/webhook`: verifies event; creates ZIP; stores in R2; writes KV mapping `download/<session_id>`; records site in D1 when user known; sends email.
  - `/api/get-download`: validates paid session; returns direct `/download/<file>` URL.
  - `/download/[file]`: streams ZIP from R2 as attachment.
  - `functions/checkout/[sessionId].js`: renders saved preview with Stripe checkout.
- Account & Dashboard
  - `/api/login`, `/api/callback`, `/api/logout`: Auth0 OAuth with PKCE.
  - `/api/me`: returns current user (and upserts to D1).
  - `/api/user-sessions`: lists purchased sites from D1.
  - `/dashboard.html`: lists user’s purchased sites; links to downloads.
- Maintenance
  - `/api/send-reminders`: reminder emails for unpaid sessions (requires external scheduler).
  - `/api/cleanup`: deletes expired downloads from R2 (requires external scheduler, or R2 lifecycle rules).
  - `/api/manual-recovery`: manual tool to rebuild a download link if webhook missed.

**Deployment Checklist**
- Configure all listed env vars and bindings in the Pages project.
- Set Stripe webhook endpoint to `/api/webhook` on the production domain.
- Ensure D1 database is created and bound as `DB`.
- Test end‑to‑end in Stripe test mode: save session → checkout → webhook creates ZIP → success page download.
- Verify Auth0 login/callback works and dashboard lists purchased sites.

**Recommendations (near‑term)**
- Implement JWKS‑based JWT verification for `id_token` in `lib/auth.js` and validate issuer/audience; then enforce auth where required (e.g., saving sessions or starting checkout).
- Introduce an external scheduler or a Worker with cron to call `/api/send-reminders` and `/api/cleanup` daily.
- Add Content Security Policy and other headers (HSTS, referrer‑policy) for HTML responses.
- Harden input validation and method checks across APIs; normalize error JSON; add structured logging.
- Add simple analytics for dashboard (downloads, purchases) in D1 or KV.
- Extend dashboard to show saved (unpaid) sessions and provide one‑click checkout.

**Concerns / Risks**
- JWTs currently decoded without signature verification; must add JWKS verification before fully relying on auth for access control.
- No native cron in Pages; reminders/cleanup need an external trigger.
- R2 retention: rely on daily cleanup or set lifecycle rules to expire old ZIPs.
- Email deliverability: ensure domain setup (SPF/DKIM) with Resend.

**Phase 2 Preview (Automated Deployments)**
- Add `/api/post-payment-deploy`: create GitHub repo, commit site files, create Cloudflare Pages project via API, notify user with live URL.
- Security model: decide between org token (centralized repos) or per‑user GitHub OAuth for user‑owned repos.

This progress section will continue to be updated as we implement JWT verification, enforce auth gating, add scheduling, and deliver automated GitHub + Cloudflare deployment.
