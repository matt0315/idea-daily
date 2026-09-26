# IdeaDaily

The daily startup idea, with receipts. One public idea report per day, a filterable archive, trend cards, an on-demand research agent, and build guides for the tools founders already use.

The product name lives in [`src/lib/brand.ts`](src/lib/brand.ts). Change `brand.name` to rename the app.

This is an original product. It does not reuse another company’s copy, idea text, logos, or framework names. The position grid is the **Position Map**. The three-part score is the **Signal Triangle** (audience reach, community heat, offer clarity). The pricing steps are the **Offer Ladder**.

## What you can do locally

With no external API keys, the app runs on labelled **sample data**. Sample figures are badges and footnotes, not measurements.

Seeded demo accounts (password `demo1234`):

| Email | Plan |
|---|---|
| free@ideadaily.dev | Free |
| builder@ideadaily.dev | Builder |
| pro@ideadaily.dev | Pro |
| admin@ideadaily.dev | Pro + admin queue |

## Stack

Next.js (App Router, TypeScript), Postgres with pgvector, Prisma, Stripe, Resend, Inngest, Tailwind.

## Setup

Requirements: Node 20+, Postgres 16 with the `vector` extension.

```bash
cp .env.example .env
# edit DATABASE_URL and AUTH_SECRET

npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000.

Local Postgres example:

```bash
# Debian/Ubuntu packages: postgresql, postgresql-16-pgvector
sudo -u postgres psql -c "CREATE ROLE ideadaily LOGIN PASSWORD 'ideadaily' SUPERUSER;"
sudo -u postgres psql -c "CREATE DATABASE ideadaily OWNER ideadaily;"
sudo -u postgres psql -d ideadaily -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

`DATABASE_URL=postgresql://ideadaily:ideadaily@localhost:5432/ideadaily`

On Neon or Supabase, enable the `vector` extension before `prisma db push`. The `Idea.embedding` column is `vector(1536)` for a later embedding pass. Search in this build is lexical. Embeddings are written only when you add that call.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Vitest: scoring, gating, founder fit, clustering, noise filter, guides, research verdict |
| `npm run db:setup` | `prisma db push` and seed |

## Environment variables

Leave a key empty to use the sample fallback. The UI shows a **Sample data** badge whenever a figure was not measured.

| Variable | Service | Used for |
|---|---|---|
| `DATABASE_URL` | Postgres + pgvector | All app data |
| `AUTH_SECRET` | This app | Reserved for session signing. Sessions are random tokens stored in Postgres. Set a long random value in production. |
| `NEXT_PUBLIC_APP_URL` | This app | Links in email, Stripe return URLs, sitemap |
| `IDEADAILY_DATA_MODE` | This app | `auto` (sample until an LLM key **and** DataForSEO are set), `sample`, or `live` |
| `LLM_PROVIDER` | openai, anthropic, or gemini | Which chat model to prefer |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | OpenAI | Advisor polish and any future writer |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Anthropic | Same |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Google AI | Same |
| `PRODUCTHUNT_TOKEN` | Product Hunt GraphQL | Nightly signal harvest |
| `YOUTUBE_API_KEY` | YouTube Data API v3 | Nightly signal harvest |
| `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` | DataForSEO | Search volume and trend research |
| `TAVILY_API_KEY` | Tavily | Web search for competitors and community URLs |
| `BRAVE_SEARCH_API_KEY` | Brave Search | Alternate web search |
| `EXA_API_KEY` | Exa | Alternate web search |
| `STRIPE_SECRET_KEY` | Stripe | Checkout |
| `STRIPE_WEBHOOK_SECRET` | Stripe | `checkout.session.completed`, subscription deleted |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Reserved for Stripe.js. Checkout uses a redirect session. |
| `STRIPE_PRICE_BUILDER_MONTHLY` | Stripe Price id | Builder $19/mo |
| `STRIPE_PRICE_BUILDER_ANNUAL` | Stripe Price id | Builder $149/yr |
| `STRIPE_PRICE_PRO_MONTHLY` | Stripe Price id | Pro $49/mo |
| `STRIPE_PRICE_PRO_ANNUAL` | Stripe Price id | Pro $399/yr |
| `RESEND_API_KEY` | Resend | Daily idea email |
| `EMAIL_FROM` | Resend sender | Must be a verified domain |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Inngest | Scheduled jobs |
| `CRON_SECRET` | Vercel Cron | Bearer token for `/api/cron/daily` and `/api/cron/trends` |

Hacker News (Algolia) and Apple’s public RSS app charts need no key. If the request fails, the harvester uses sample signals and marks them sample.

There is no Reddit API client. A Reddit URL can appear only when a search API returns it.

### Pricing in the product

| Plan | Monthly | Annual | Includes |
|---|---|---|---|
| Free | $0 | $0 | Public idea pages (they stay up), daily email, Cursor guide, trend and insight teasers |
| Builder | $19 | $149 | Database, filters, CSV export, full trends, insights, generator (20/mo), founder fit, all build guides, advisor (20/mo), trend research (10/mo) |
| Pro | $49 | $399 | Builder, plus Idea Agent (5/mo), advisor (150/mo), trend research (50/mo), generator (100/mo), build-hub skills |

Without `STRIPE_SECRET_KEY`, the pricing page offers a **demo upgrade** that changes the plan in the database and does not charge a card.

### Costs called out in the research notes

These are the figures from the planning research, not a live invoice. Treat estimates as estimates.

- DataForSEO Google Ads search volume: about **$0.06 per task (standard)** or **$0.09 (live)**. A task can batch keywords. Third-party pricing page, not re-verified here.
- Drafting one idea record in a backfill: about **$0.10–$1** in model + data calls. Estimate.
- One Idea Agent run with live search: about **$0.50–$3**. Estimate.
- One trends-research query: a few cents. Estimate.
- Running cost at a small MVP: about **$100–$300 per month** for model calls, DataForSEO, search, hosting, and email. Estimate. It moves with Idea Agent usage.
- YouTube Data API and Hacker News Algolia have free tiers. Confirm the current YouTube quota in Google Cloud before a backfill.
- Stripe, Resend, Inngest, Neon, and Vercel each have a free or low starter tier. Check their current pricing before you turn live keys on.

## Jobs

Two schedulers call the same functions:

- **Inngest** (`src/inngest/functions.ts`), served at `/api/inngest`.
  - 21:30 UTC: refresh the trends library.
  - 22:00 UTC: harvest signals, cluster them, score candidates, and queue idea drafts. 22:00 UTC is 06:00 in Perth.
  - 22:05 UTC: publish the oldest **approved** idea and email subscribers.
- **Vercel Cron** (`vercel.json`) hits `/api/cron/trends` and `/api/cron/daily`. Set `CRON_SECRET`. Vercel sends `Authorization: Bearer <CRON_SECRET>`.

Nothing goes live from the harvester alone. A person approves or rejects drafts at `/admin`, then publish sends the Resend email. If `RESEND_API_KEY` is empty, the send is skipped and logged on the pipeline run.

Signal sources, in order: Hacker News Algolia, Product Hunt, YouTube, Apple RSS charts, DataForSEO volumes, and one web-search query. Each adapter falls back to sample signals when its key is missing or the call fails.

## Pages

| Path | Who |
|---|---|
| `/` and `/today` | Public idea of the day |
| `/ideas/[slug]` | Public, permanent, in the sitemap |
| `/ideas` | Search, filters, sort. Builder+ |
| `/trends`, `/trends/research` | Library, plus metered seed-term research |
| `/insights` | Persona, pains, phrases |
| `/generate` | Profile-aware drafts |
| `/fit` | Onboarding quiz and per-idea fit |
| `/research` | Idea Agent |
| `/build` | Project skills and Markdown export |
| `/built-with/[tool]` | Guides’ gallery and submissions |
| `/pricing`, `/account`, `/admin`, `/methodology` | Billing, usage, review queue, score definitions |

Build-guide tools: Claude Code (`CLAUDE.md` and a zip), Cursor (`.cursor/rules`), Google AI Studio, Lovable, Bolt, Replit, v0, ChatGPT/Codex.

Build-hub skills: Offer, brand voice, landing page copy, email sequence, 7-day ship plan, and run-all.

## Deploy on Vercel

1. Create a Postgres database with pgvector (Neon and Supabase both ship the extension). Put `DATABASE_URL` in the Vercel project.
2. Set `AUTH_SECRET` to a long random string and `NEXT_PUBLIC_APP_URL` to the production origin.
3. Add the Stripe, Resend, Inngest, and data keys you actually have. Empty keys keep sample badges.
4. In Stripe, create four recurring prices ($19, $149, $49, $399) and set the four `STRIPE_PRICE_*` ids. Point a webhook at `https://<domain>/api/stripe/webhook` for `checkout.session.completed` and `customer.subscription.deleted`.
5. Deploy. The build runs `prisma generate` via `npm run build`. Run `npx prisma db push` and `npm run db:seed` once against production if you want the demo ideas. Skip the seed if you would rather start from an empty queue.
6. Cron routes are in `vercel.json`. Set `CRON_SECRET` in the project env so Vercel can call them.
7. Optional: connect Inngest to the same deployment and sync `/api/inngest`.

Do not ship the demo password. Change or delete the seeded users before a public launch.

## Tests

```bash
npm test
```

Covers the score formula, plan gates and quotas, founder-fit weights, signal clustering, the trend noise filter, guide files, and the research verdict.
