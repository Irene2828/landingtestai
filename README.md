# Competitive Landing Page Analyzer

Competitive Landing Page Analyzer is a focused take-home V1 for comparing a SaaS landing page against a small set of competitors and turning that comparison into evidence-backed UX recommendations.

This version is intentionally narrow. It analyzes three high-signal sections:

- Hero
- CTA
- Social Proof

The goal is not to ship a broad but unreliable "AI design audit." The goal is to ship a trustworthy first version that gives designers and product teams a fast read on what their page communicates, where it breaks, and what to improve first.

## What Shipped In V1
- URL-based analysis flow for SaaS landing pages
- Curated competitor suggestions based on hostname/category lookup
- Manual competitor entry by URL
- Selectable analysis sections: Hero, CTA, Social Proof
- Structured results with:
  - strengths
  - gaps
  - top actions
  - per-section observation, evidence, recommendation, and confidence
- Per-section source-state labels such as `Text extracted` and `Visual check recommended`
- Server-side page extraction with Firecrawl and direct-fetch fallback
- OpenAI-backed structured reasoning with strict JSON schema output
- Conservative confidence handling when target-page evidence is missing
- Session-based analysis persistence across refresh

## What This App Is Best At
This V1 is strongest as a competitive messaging and proof analyzer for text-rich SaaS landing pages.

It works especially well when the target site exposes clear:

- hero copy
- CTA labels
- trust language

It is intentionally conservative on pages where those signals are mostly visual.

## Current Limitations
- V1 is text-grounded, not vision-grounded
- competitor suggestions are curated, not discovered live
- results persist only in session storage and are not shareable or stored long-term
- brand-led or highly visual pages may return thinner output when text extraction is weak

## Tech Stack
- Next.js 16
- React 19
- TypeScript
- Custom CSS
- OpenAI Responses API
- Firecrawl

## How It Works
1. The user enters a landing page URL.
2. The app suggests likely competitors from a curated catalog.
3. The app extracts target and competitor page content.
4. A server-side analysis route builds a grounded prompt.
5. OpenAI returns structured section analysis under a strict JSON schema.
6. The server sanitizes the response and enforces evidence + confidence rules before returning results.

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
OPENAI_API_KEY=your_openai_key
FIRECRAWL_API_KEY=your_firecrawl_key
OPENAI_MODEL=gpt-5.4-mini
```

Notes:

- `OPENAI_API_KEY` is required
- `FIRECRAWL_API_KEY` is optional but recommended
- if Firecrawl is unavailable, the app falls back to direct HTML fetch
- `OPENAI_MODEL` is optional and defaults to `gpt-5.4-mini`
- `FIRECRAWL_API_URL` can be overridden if needed

Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Important Implementation Notes
- Analysis happens in [`app/api/analyze/route.ts`](app/api/analyze/route.ts)
- Competitor suggestion logic lives in [`lib/mock-setup.ts`](lib/mock-setup.ts)
- Service-business detection lives in [`lib/business-type.ts`](lib/business-type.ts)

## Product Framing
This repository reflects a deliberate V1 decision:

Prioritize trustworthy, evidence-backed analysis over broader but less reliable claims about visual design.

That means:

- the app does not pretend to "see" layouts yet
- weak evidence stays low-confidence
- outputs are structured for quick designer review
- the next major unlock is screenshot / vision grounding, not looser prompting

## What I Would Build Next
- Screenshot and vision analysis for first-screen layout, button prominence, and trust placement
- Smarter competitor discovery
- Persisted analyses and shareable reports
- Exportable PDF reports for review and handoff
- Benchmark snapshots for repeated before/after comparisons

## Security Notes
- No API keys are exposed in client-side code
- No `NEXT_PUBLIC_` secrets are used in this project
- OpenAI and Firecrawl credentials are read only on the server in [`app/api/analyze/route.ts`](app/api/analyze/route.ts)
